import React, { useState, useEffect } from 'react';
import { ChevronLeft, Target, Shield, Brain, Ghost, Map, Dumbbell, TrendingDown, AlertTriangle } from 'lucide-react';

// ── Zwakste Meter Analyse ─────────────────────────────────────────────
function ZwaksteMeter({ savedRounds, settings }) {
  const [analyse, setAnalyse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    // Bereken ruwe statistieken uit de ronde data
    const zones = [
      { label: '0-50m', min: 0, max: 50 },
      { label: '50-80m', min: 50, max: 80 },
      { label: '80-110m', min: 80, max: 110 },
      { label: '110-140m', min: 110, max: 140 },
      { label: '140-170m', min: 140, max: 170 },
      { label: '170-200m', min: 170, max: 200 },
      { label: '200m+', min: 200, max: 999 },
    ];

    const clubStats = {};
    const zoneStats = zones.map(z => ({ ...z, shots: 0, totalLies: { fairway: 0, rough: 0, bunker: 0, penalty: 0, green: 0, tee: 0 } }));
    let totalShots = 0;
    let totalPenalties = 0;

    savedRounds.forEach(round => {
      round.holes?.forEach(hole => {
        hole.shots?.forEach(shot => {
          if (shot.club === 'Strafslag') { totalPenalties++; return; }
          totalShots++;

          // Club stats
          if (!clubStats[shot.club]) clubStats[shot.club] = { shots: 0, totalDist: 0, lies: {} };
          clubStats[shot.club].shots++;
          if (shot.distancePlayed) clubStats[shot.club].totalDist += shot.distancePlayed;
          if (shot.lie) clubStats[shot.club].lies[shot.lie] = (clubStats[shot.club].lies[shot.lie] || 0) + 1;

          // Zone stats op basis van distanceToGreen
          if (shot.distanceToGreen) {
            const zone = zoneStats.find(z => shot.distanceToGreen >= z.min && shot.distanceToGreen < z.max);
            if (zone) {
              zone.shots++;
              if (shot.lie) zone.totalLies[shot.lie] = (zone.totalLies[shot.lie] || 0) + 1;
            }
          }
        });
      });
    });

    setRawData({ clubStats, zoneStats, totalShots, totalPenalties, rounds: savedRounds.length });
  }, [savedRounds]);

  const askAI = async () => {
    if (!rawData) return;
    setLoading(true);
    try {
      const prompt = `Je bent een golfcoach die statistieken analyseert. Analyseer de volgende golfdata van een speler met handicap ${settings.handicap || 'onbekend'} na ${rawData.rounds} rondes.

ZONE STATISTIEKEN (per afstandszone hoeveel slagen):
${rawData.zoneStats.filter(z => z.shots > 0).map(z => 
  `${z.label}: ${z.shots} slagen${z.totalLies.rough > 0 ? `, ${z.totalLies.rough}x rough` : ''}${z.totalLies.bunker > 0 ? `, ${z.totalLies.bunker}x bunker` : ''}${z.totalLies.penalty > 0 ? `, ${z.totalLies.penalty}x penalty` : ''}`
).join('\n')}

CLUB STATISTIEKEN:
${Object.entries(rawData.clubStats).map(([club, s]) => 
  `${club}: ${s.shots}x geslagen, gem. ${s.shots > 0 ? Math.round(s.totalDist/s.shots) : 0}m`
).join('\n')}

TOTAAL: ${rawData.totalShots} slagen, ${rawData.totalPenalties} strafslagen in ${rawData.rounds} rondes.

Geef een analyse in het Nederlands met:
1. Top 3 zwakste zones waar de speler de meeste slagen verliest
2. Welke clubs ondermaats presteren
3. Concrete oefeningen voor de driving range (max 3)
4. Een motiverende afsluiting

Wees specifiek en direct. Max 250 woorden. Geen opsommingstekens, gewone alinea's.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await response.json();
      setAnalyse(data.content?.[0]?.text || 'Geen analyse beschikbaar.');
    } catch {
      setAnalyse('Kon de analyse niet laden. Controleer je internetverbinding.');
    }
    setLoading(false);
  };

  if (savedRounds.length < 2) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">📊</div>
        <div className="font-display text-xl text-emerald-300 mb-2">Nog niet genoeg data</div>
        <div className="font-body text-sm text-emerald-200/60">Speel minimaal 2 rondes voor een zinvolle analyse</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Zone overzicht */}
      {rawData && (
        <div className="glass-card rounded-2xl p-5">
          <div className="font-body text-xs text-emerald-200/70 uppercase tracking-wider mb-4">Slagen per afstandszone</div>
          <div className="space-y-2">
            {rawData.zoneStats.filter(z => z.shots > 0).map(z => {
              const maxShots = Math.max(...rawData.zoneStats.map(z => z.shots));
              const pct = maxShots > 0 ? (z.shots / maxShots) * 100 : 0;
              const problems = z.totalLies.rough + z.totalLies.bunker + (z.totalLies.penalty || 0);
              const problemPct = z.shots > 0 ? Math.round((problems / z.shots) * 100) : 0;
              return (
                <div key={z.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-sm text-white">{z.label}</span>
                    <div className="flex items-center gap-2">
                      {problemPct > 30 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                      <span className="font-body text-xs text-emerald-200/60">{z.shots} slagen</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${problemPct > 30 ? 'bg-red-500' : problemPct > 15 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-3 text-xs font-body">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Goed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>Let op</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Zwak punt</span>
          </div>
        </div>
      )}

      {/* Club overzicht */}
      {rawData && Object.keys(rawData.clubStats).length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <div className="font-body text-xs text-emerald-200/70 uppercase tracking-wider mb-4">Club gebruik</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(rawData.clubStats)
              .sort((a, b) => b[1].shots - a[1].shots)
              .slice(0, 8)
              .map(([club, s]) => (
                <div key={club} className="bg-white/5 rounded-xl p-3">
                  <div className="font-body text-sm text-white font-semibold">{club}</div>
                  <div className="font-body text-xs text-emerald-200/60">{s.shots}x · gem {s.shots > 0 ? Math.round(s.totalDist/s.shots) : 0}m</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* AI Analyse knop */}
      {!analyse && (
        <button onClick={askAI} disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl py-5 font-display text-xl tracking-wider text-white shadow-lg shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-3">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Analyseren...
            </>
          ) : (
            <>🎯 Analyseer mijn zwakste zones</>
          )}
        </button>
      )}

      {/* AI Analyse resultaat */}
      {analyse && (
        <div className="glass-card rounded-2xl p-6 border border-emerald-400/30 bg-emerald-500/5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🎯</span>
            <div>
              <div className="font-display text-xl text-emerald-300">Jouw analyse</div>
              <div className="font-body text-xs text-emerald-200/50">{savedRounds.length} rondes · handicap {settings.handicap || '--'}</div>
            </div>
          </div>
          <p className="font-body text-sm text-white leading-relaxed">{analyse}</p>
          <button onClick={() => setAnalyse(null)}
            className="mt-4 font-body text-xs text-emerald-300/60 hover:text-emerald-300">
            Opnieuw analyseren
          </button>
        </div>
      )}
    </div>
  );
}

// ── Hoofdmenu ─────────────────────────────────────────────────────────
const menuItems = [
  { id: 'zwakste', icon: Target, label: 'Zwakste Meter', sub: 'Waar verlies jij slagen?', color: 'from-red-500/20 to-orange-500/20', border: 'border-red-400/30', iconColor: 'text-red-400' },
  { id: 'vertrouwen', icon: Shield, label: 'Club Vertrouwen', sub: 'Score per club', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-400/30', iconColor: 'text-blue-400' },
  { id: 'mental', icon: Brain, label: 'Mental Score', sub: 'Hoe voel jij je per hole?', color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-400/30', iconColor: 'text-purple-400' },
  { id: 'schaduw', icon: Ghost, label: 'Schaduw-Ronde', sub: 'Speel tegen jezelf', color: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-400/30', iconColor: 'text-yellow-400' },
  { id: 'gps', icon: Map, label: 'GPS Trail', sub: 'Jouw looplijn per hole', color: 'from-teal-500/20 to-green-500/20', border: 'border-teal-400/30', iconColor: 'text-teal-400' },
  { id: 'training', icon: Dumbbell, label: 'Training', sub: 'AI driving range plan', color: 'from-emerald-500/20 to-lime-500/20', border: 'border-emerald-400/30', iconColor: 'text-emerald-400' },
];

export default function AllStatsScreen({ savedRounds, settings, onBack }) {
  const [activeMenu, setActiveMenu] = useState(null);

  const active = menuItems.find(m => m.id === activeMenu);

  return (
    <div className="animate-slide-up min-h-screen pb-6">
      <div className="p-6 flex items-center justify-between">
        <button onClick={activeMenu ? () => setActiveMenu(null) : onBack} className="p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="font-display text-3xl">{activeMenu ? active?.label.toUpperCase() : 'STATISTIEKEN'}</h1>
        <div className="w-10" />
      </div>

      <div className="px-6">
        {!activeMenu ? (
          /* Hoofdmenu */
          <div className="space-y-3">
            {/* Snel overzicht */}
            <div className="glass-card rounded-2xl p-5 mb-2 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-5xl text-emerald-300">{settings.handicap || '--'}</div>
                  <div className="font-body text-xs text-emerald-200/60 mt-1">Handicap · {savedRounds.length} rondes</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl text-white">
                    {savedRounds.length > 0
                      ? Math.round(savedRounds.slice(-5).reduce((s, r) => s + r.holes.reduce((a, h) => a + (h.score || 0), 0), 0) / Math.min(savedRounds.length, 5))
                      : '--'}
                  </div>
                  <div className="font-body text-xs text-emerald-200/60">gem. score</div>
                </div>
              </div>
            </div>

            {menuItems.map(item => (
              <button key={item.id} onClick={() => setActiveMenu(item.id)}
                className={`w-full glass-card rounded-2xl p-5 flex items-center gap-4 hover:bg-white/10 active:scale-98 transition bg-gradient-to-r ${item.color} border ${item.border}`}>
                <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-display text-lg text-white tracking-wide">{item.label}</div>
                  <div className="font-body text-xs text-emerald-200/60">{item.sub}</div>
                </div>
                <ChevronLeft className="w-5 h-5 text-white/30 rotate-180" />
              </button>
            ))}
          </div>
        ) : activeMenu === 'zwakste' ? (
          <ZwaksteMeter savedRounds={savedRounds} settings={settings} />
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">🚧</div>
            <div className="font-display text-xl text-emerald-300 mb-2">Komt eraan!</div>
            <div className="font-body text-sm text-emerald-200/60">Dit onderdeel wordt binnenkort gebouwd</div>
          </div>
        )}
      </div>
    </div>
  );
}
