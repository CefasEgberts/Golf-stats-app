import React, { useState, useEffect } from 'react';
import { ChevronLeft, Target, Shield, Brain, Ghost, Map, Dumbbell, AlertTriangle } from 'lucide-react';

// ── Helper: AI aanroepen ──────────────────────────────────────────────
async function callAI(prompt) {
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
  return data.content?.[0]?.text || 'Geen resultaat beschikbaar.';
}

// ── 1. ZWAKSTE METER ─────────────────────────────────────────────────
function ZwaksteMeter({ savedRounds, settings }) {
  const [analyse, setAnalyse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
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
    const zoneStats = zones.map(z => ({ ...z, shots: 0, rough: 0, bunker: 0, penalty: 0 }));
    let totalShots = 0, totalPenalties = 0;

    savedRounds.forEach(round => {
      round.holes?.forEach(hole => {
        hole.shots?.forEach(shot => {
          if (shot.club === 'Strafslag') { totalPenalties++; return; }
          totalShots++;
          if (!clubStats[shot.club]) clubStats[shot.club] = { shots: 0, totalDist: 0 };
          clubStats[shot.club].shots++;
          if (shot.distancePlayed) clubStats[shot.club].totalDist += shot.distancePlayed;
          if (shot.distanceToGreen) {
            const zone = zoneStats.find(z => shot.distanceToGreen >= z.min && shot.distanceToGreen < z.max);
            if (zone) {
              zone.shots++;
              if (shot.lie === 'rough') zone.rough++;
              if (shot.lie === 'bunker') zone.bunker++;
              if (shot.lie === 'penalty') zone.penalty++;
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
      const text = await callAI(`Je bent een golfcoach. Analyseer deze data van een speler met handicap ${settings.handicap || 'onbekend'} na ${rawData.rounds} rondes.

ZONES:
${rawData.zoneStats.filter(z => z.shots > 0).map(z => `${z.label}: ${z.shots} slagen, ${z.rough}x rough, ${z.bunker}x bunker, ${z.penalty}x penalty`).join('\n')}

CLUBS:
${Object.entries(rawData.clubStats).map(([c, s]) => `${c}: ${s.shots}x, gem ${s.shots > 0 ? Math.round(s.totalDist / s.shots) : 0}m`).join('\n')}

Totaal: ${rawData.totalShots} slagen, ${rawData.totalPenalties} strafslagen.

Geef in het Nederlands: top 3 zwakste zones, welke clubs ondermaats presteren, 3 concrete driving range oefeningen, motiverende afsluiting. Max 200 woorden, geen bullets.`);
      setAnalyse(text);
    } catch { setAnalyse('Analyse mislukt. Controleer verbinding.'); }
    setLoading(false);
  };

  if (savedRounds.length < 2) return (
    <div className="glass-card rounded-2xl p-8 text-center">
      <div className="text-5xl mb-4">📊</div>
      <div className="font-display text-xl text-emerald-300 mb-2">Nog niet genoeg data</div>
      <div className="font-body text-sm text-emerald-200/60">Speel minimaal 2 rondes voor een analyse</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {rawData && (
        <div className="glass-card rounded-2xl p-5">
          <div className="font-body text-xs text-emerald-200/70 uppercase tracking-wider mb-4">Slagen per afstandszone</div>
          <div className="space-y-2">
            {rawData.zoneStats.filter(z => z.shots > 0).map(z => {
              const maxShots = Math.max(...rawData.zoneStats.map(z => z.shots));
              const pct = maxShots > 0 ? (z.shots / maxShots) * 100 : 0;
              const problemPct = z.shots > 0 ? Math.round(((z.rough + z.bunker + z.penalty) / z.shots) * 100) : 0;
              return (
                <div key={z.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-sm text-white">{z.label}</span>
                    <div className="flex items-center gap-2">
                      {problemPct > 30 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                      <span className="font-body text-xs text-emerald-200/60">{z.shots} slagen {problemPct > 0 ? `· ${problemPct}% problemen` : ''}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${problemPct > 30 ? 'bg-red-500' : problemPct > 15 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {rawData && Object.keys(rawData.clubStats).length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <div className="font-body text-xs text-emerald-200/70 uppercase tracking-wider mb-3">Club gebruik</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(rawData.clubStats).sort((a, b) => b[1].shots - a[1].shots).slice(0, 8).map(([club, s]) => (
              <div key={club} className="bg-white/5 rounded-xl p-3">
                <div className="font-body text-sm text-white font-semibold">{club}</div>
                <div className="font-body text-xs text-emerald-200/60">{s.shots}x · gem {s.shots > 0 ? Math.round(s.totalDist / s.shots) : 0}m</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!analyse ? (
        <button onClick={askAI} disabled={loading}
          className="w-full bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl py-5 font-display text-xl tracking-wider text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-3">
          {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyseren...</> : '🎯 Analyseer mijn zwakste zones'}
        </button>
      ) : (
        <div className="glass-card rounded-2xl p-6 border border-red-400/30 bg-red-500/5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🎯</span>
            <div>
              <div className="font-display text-xl text-red-300">Jouw analyse</div>
              <div className="font-body text-xs text-red-200/50">{savedRounds.length} rondes · handicap {settings.handicap || '--'}</div>
            </div>
          </div>
          <p className="font-body text-sm text-white leading-relaxed">{analyse}</p>
          <button onClick={() => setAnalyse(null)} className="mt-4 font-body text-xs text-red-300/60 hover:text-red-300">Opnieuw analyseren</button>
        </div>
      )}
    </div>
  );
}

// ── 2. CLUB VERTROUWEN ───────────────────────────────────────────────
function ClubVertrouwen({ savedRounds }) {
  const clubData = {};

  savedRounds.forEach(round => {
    round.holes?.forEach(hole => {
      hole.shots?.forEach(shot => {
        if (!shot.club || shot.club === 'Strafslag') return;
        if (!clubData[shot.club]) clubData[shot.club] = [];
        const isGood = shot.lie !== 'rough' && shot.lie !== 'bunker' && shot.lie !== 'penalty';
        clubData[shot.club].push(isGood);
      });
    });
  });

  const clubs = Object.entries(clubData).map(([club, shots]) => {
    const recent = shots.slice(-10);
    const score = recent.length > 0 ? Math.round((recent.filter(Boolean).length / recent.length) * 100) : 0;
    return { club, score, count: shots.length, recent: recent.length };
  }).sort((a, b) => b.score - a.score);

  if (clubs.length === 0) return (
    <div className="glass-card rounded-2xl p-8 text-center">
      <div className="text-5xl mb-4">🛡️</div>
      <div className="font-display text-xl text-blue-300 mb-2">Nog geen data</div>
      <div className="font-body text-sm text-blue-200/60">Speel een paar rondes om je club vertrouwen te zien</div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="glass-card rounded-2xl p-4">
        <div className="font-body text-xs text-blue-200/70 uppercase tracking-wider mb-1">Vertrouwensscore per club</div>
        <div className="font-body text-xs text-blue-200/40">Gebaseerd op laatste 10 slagen · Goed = fairway/green · Slecht = rough/bunker</div>
      </div>
      {clubs.map(({ club, score, count, recent }) => (
        <div key={club} className="glass-card rounded-2xl p-4 border border-blue-400/20">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-display text-lg text-white">{club}</div>
              <div className="font-body text-xs text-blue-200/50">{count} slagen totaal · {recent} recent</div>
            </div>
            <div className={`font-display text-3xl ${score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{score}%</div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${score}%` }} />
          </div>
          <div className="mt-1 font-body text-xs text-right">
            {score >= 70 ? '✅ Vertrouw dit' : score >= 50 ? '⚠️ Wisselvallig' : '❌ Oefen dit'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 3. MENTAL SCORE ──────────────────────────────────────────────────
function MentalScore({ savedRounds }) {
  const hasData = savedRounds.some(r => r.holes?.some(h => h.mental !== undefined));

  if (!hasData) return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🧠</div>
        <div className="font-display text-xl text-purple-300 mb-2">Mental Score</div>
        <div className="font-body text-sm text-purple-200/60 leading-relaxed">
          Na elke hole registreer je je gevoel met één tik.<br /><br />
          😤 Gefrustreerd &nbsp;·&nbsp; 😐 Neutraal &nbsp;·&nbsp; 😊 Goed gevoel
        </div>
      </div>
      <div className="glass-card rounded-2xl p-5 border border-purple-400/20 bg-purple-500/5">
        <div className="font-body text-xs text-purple-200/70 uppercase tracking-wider mb-3">Wat je leert</div>
        <div className="space-y-2 font-body text-sm text-white/80">
          <div>📈 Op welke holes voel jij je goed</div>
          <div>📉 Welke holes frustreren je structureel</div>
          <div>🔗 Correlatie: frustratie op hole 3 → hogere score hole 4-6?</div>
          <div>🧘 Inzicht in je mentale patronen</div>
        </div>
      </div>
      <div className="glass-card rounded-2xl p-4 text-center border border-purple-400/20">
        <div className="font-body text-xs text-purple-200/50">Mental tracking wordt binnenkort toegevoegd aan de ronde</div>
      </div>
    </div>
  );

  const holeData = {};
  savedRounds.forEach(round => {
    round.holes?.forEach(hole => {
      const h = hole.hole;
      if (!holeData[h]) holeData[h] = [];
      if (hole.mental !== undefined) holeData[h].push(hole.mental);
    });
  });

  return (
    <div className="space-y-3">
      {Object.entries(holeData).sort((a, b) => a[0] - b[0]).map(([hole, scores]) => {
        const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
        return (
          <div key={hole} className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-display text-lg text-white">Hole {hole}</div>
              <div className="font-body text-xs text-purple-200/50">{scores.length} rondes</div>
            </div>
            <div className="text-3xl">{avg < 1.5 ? '😤' : avg < 2.5 ? '😐' : '😊'}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. SCHADUW-RONDE ─────────────────────────────────────────────────
function SchaduwRonde({ savedRounds }) {
  const [selectedBaan, setSelectedBaan] = useState(null);

  const baanMap = {};
  savedRounds.forEach(round => {
    const naam = round.course?.name || 'Onbekend';
    if (!baanMap[naam]) baanMap[naam] = [];
    baanMap[naam].push(round);
  });

  const banen = Object.entries(baanMap).filter(([, rondes]) => rondes.length >= 2);

  if (banen.length === 0) return (
    <div className="glass-card rounded-2xl p-8 text-center">
      <div className="text-5xl mb-4">👻</div>
      <div className="font-display text-xl text-yellow-300 mb-2">Schaduw-Ronde</div>
      <div className="font-body text-sm text-yellow-200/60">Speel minimaal 2 rondes op dezelfde baan om tegen je beste ronde te spelen</div>
    </div>
  );

  if (!selectedBaan) return (
    <div className="space-y-3">
      <div className="glass-card rounded-2xl p-4">
        <div className="font-body text-xs text-yellow-200/70 uppercase tracking-wider">Kies een baan</div>
      </div>
      {banen.map(([naam, rondes]) => {
        const beste = rondes.reduce((best, r) => {
          const score = r.holes?.reduce((s, h) => s + (h.score || 0), 0) || 999;
          const bestScore = best.holes?.reduce((s, h) => s + (h.score || 0), 0) || 999;
          return score < bestScore ? r : best;
        });
        const besteScore = beste.holes?.reduce((s, h) => s + (h.score || 0), 0) || 0;
        return (
          <button key={naam} onClick={() => setSelectedBaan({ naam, rondes, beste, besteScore })}
            className="w-full glass-card rounded-2xl p-4 text-left border border-yellow-400/20 hover:bg-white/10 transition">
            <div className="font-display text-lg text-white">{naam}</div>
            <div className="font-body text-xs text-yellow-200/60">{rondes.length} rondes · beste: {besteScore} slagen</div>
          </button>
        );
      })}
    </div>
  );

  const { naam, rondes, beste, besteScore } = selectedBaan;
  const laatste = rondes[rondes.length - 1];
  const laatste_score = laatste?.holes?.reduce((s, h) => s + (h.score || 0), 0) || 0;
  const diff = laatste_score - besteScore;

  return (
    <div className="space-y-4">
      <button onClick={() => setSelectedBaan(null)} className="font-body text-xs text-yellow-300/60 flex items-center gap-1">
        <ChevronLeft className="w-3 h-3" /> Terug naar banen
      </button>
      <div className="glass-card rounded-2xl p-5 border border-yellow-400/30 bg-yellow-500/5">
        <div className="font-body text-xs text-yellow-200/70 uppercase tracking-wider mb-3">{naam}</div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="font-body text-xs text-yellow-200/50 mb-1">👻 Beste ronde</div>
            <div className="font-display text-4xl text-yellow-300">{besteScore}</div>
            <div className="font-body text-xs text-yellow-200/40">{beste.date}</div>
          </div>
          <div>
            <div className="font-body text-xs text-yellow-200/50 mb-1">Laatste ronde</div>
            <div className={`font-display text-4xl ${diff <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{laatste_score}</div>
            <div className="font-body text-xs text-yellow-200/40">{laatste.date}</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          {diff < 0 && <div className="font-display text-lg text-emerald-400">🏆 {Math.abs(diff)} slagen beter dan je beste!</div>}
          {diff === 0 && <div className="font-display text-lg text-yellow-300">🤝 Gelijkspel met je beste ronde!</div>}
          {diff > 0 && <div className="font-display text-lg text-red-400">👻 {diff} slagen achter op je beste ronde</div>}
        </div>
      </div>
      <div className="glass-card rounded-2xl p-4">
        <div className="font-body text-xs text-yellow-200/70 uppercase tracking-wider mb-3">Per hole vergelijking</div>
        <div className="space-y-1">
          {beste.holes?.map(bestHole => {
            const lastHole = laatste?.holes?.find(h => h.hole === bestHole.hole);
            const holeDiff = (lastHole?.score || 0) - (bestHole.score || 0);
            return (
              <div key={bestHole.hole} className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="font-body text-sm text-white w-16">Hole {bestHole.hole}</span>
                <span className="font-body text-xs text-yellow-200/50">👻 {bestHole.score}</span>
                <span className="font-body text-sm font-semibold text-white">{lastHole?.score || '-'}</span>
                <span className={`font-body text-xs w-10 text-right ${holeDiff < 0 ? 'text-emerald-400' : holeDiff > 0 ? 'text-red-400' : 'text-white/30'}`}>
                  {holeDiff > 0 ? `+${holeDiff}` : holeDiff < 0 ? holeDiff : '='}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 5. GPS TRAIL ─────────────────────────────────────────────────────
function GpsTrail({ savedRounds }) {
  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🗺️</div>
        <div className="font-display text-xl text-teal-300 mb-2">GPS Trail</div>
        <div className="font-body text-sm text-teal-200/60 leading-relaxed">
          Na elke GPS-ronde zie je hier je looplijn per hole — elke slag als punt op de kaart.
        </div>
      </div>
      <div className="glass-card rounded-2xl p-5 border border-teal-400/20 bg-teal-500/5">
        <div className="font-body text-xs text-teal-200/70 uppercase tracking-wider mb-3">Hoe het werkt</div>
        <div className="space-y-2 font-body text-sm text-white/80">
          <div>1. Speel een ronde met GPS aan</div>
          <div>2. Per slag wordt je GPS positie opgeslagen</div>
          <div>3. Na de ronde zie je je looplijn op een kaartje</div>
          <div>4. Ideaal om te delen of te analyseren</div>
        </div>
      </div>
      <div className="glass-card rounded-2xl p-4 text-center border border-teal-400/20">
        <div className="font-body text-xs text-teal-200/50">GPS positie per slag opslaan komt in een volgende update</div>
      </div>
    </div>
  );
}

// ── 6. TRAINING ──────────────────────────────────────────────────────
function Training({ savedRounds, settings }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const maakPlan = async () => {
    setLoading(true);
    try {
      const clubStats = {};
      const zoneStats = {};
      let totalShots = 0, totalPenalties = 0;

      savedRounds.forEach(round => {
        round.holes?.forEach(hole => {
          hole.shots?.forEach(shot => {
            if (shot.club === 'Strafslag') { totalPenalties++; return; }
            totalShots++;
            if (!clubStats[shot.club]) clubStats[shot.club] = { shots: 0, totalDist: 0, rough: 0, bunker: 0 };
            clubStats[shot.club].shots++;
            if (shot.distancePlayed) clubStats[shot.club].totalDist += shot.distancePlayed;
            if (shot.lie === 'rough') clubStats[shot.club].rough++;
            if (shot.lie === 'bunker') clubStats[shot.club].bunker++;
            if (shot.distanceToGreen) {
              const zone = Math.floor(shot.distanceToGreen / 30) * 30;
              const key = `${zone}-${zone + 30}m`;
              if (!zoneStats[key]) zoneStats[key] = { shots: 0, problems: 0 };
              zoneStats[key].shots++;
              if (shot.lie === 'rough' || shot.lie === 'bunker' || shot.lie === 'penalty') zoneStats[key].problems++;
            }
          });
        });
      });

      const text = await callAI(`Je bent een professionele golfcoach die een persoonlijk driving range programma maakt.

SPELER: handicap ${settings.handicap || 'onbekend'}, ${savedRounds.length} rondes gespeeld.

CLUBS:
${Object.entries(clubStats).map(([c, s]) => `${c}: ${s.shots}x, gem ${s.shots > 0 ? Math.round(s.totalDist / s.shots) : 0}m, ${s.rough}x rough, ${s.bunker}x bunker`).join('\n')}

ZONES:
${Object.entries(zoneStats).map(([z, s]) => `${z}: ${s.shots} slagen, ${s.problems} problemen (${s.shots > 0 ? Math.round(s.problems / s.shots * 100) : 0}%)`).join('\n')}

STRAFSLAGEN: ${totalPenalties} totaal.

Maak een concreet 60-minuten driving range programma in het Nederlands met 3-4 specifieke oefeningen gebaseerd op de data. Per oefening: naam in hoofdletters, doel, uitvoering, aantal slagen, welke clubs. Sluit af met een mentale focus tip. Max 300 woorden.`);
      setPlan(text);
    } catch { setPlan('Plan genereren mislukt. Controleer verbinding.'); }
    setLoading(false);
  };

  if (savedRounds.length < 1) return (
    <div className="glass-card rounded-2xl p-8 text-center">
      <div className="text-5xl mb-4">🏋️</div>
      <div className="font-display text-xl text-emerald-300 mb-2">Training Plan</div>
      <div className="font-body text-sm text-emerald-200/60">Speel eerst een ronde zodat de AI je zwaktes kan analyseren</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {!plan ? (
        <>
          <div className="glass-card rounded-2xl p-5 border border-emerald-400/20 bg-emerald-500/5">
            <div className="font-body text-xs text-emerald-200/70 uppercase tracking-wider mb-3">Wat je krijgt</div>
            <div className="space-y-2 font-body text-sm text-white/80">
              <div>🎯 Persoonlijk 60-min driving range programma</div>
              <div>📊 Gebaseerd op jouw {savedRounds.length} ronde(s)</div>
              <div>🏌️ Oefeningen gericht op jouw zwakste punten</div>
              <div>💡 Mentale focus tips</div>
            </div>
          </div>
          <button onClick={maakPlan} disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl py-5 font-display text-xl tracking-wider text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-3">
            {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Plan maken...</> : '🏋️ Maak mijn trainingsplan'}
          </button>
        </>
      ) : (
        <div className="glass-card rounded-2xl p-6 border border-emerald-400/30 bg-emerald-500/5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🏋️</span>
            <div>
              <div className="font-display text-xl text-emerald-300">Jouw trainingsplan</div>
              <div className="font-body text-xs text-emerald-200/50">60 minuten · {savedRounds.length} rondes geanalyseerd</div>
            </div>
          </div>
          <p className="font-body text-sm text-white leading-relaxed whitespace-pre-line">{plan}</p>
          <button onClick={() => setPlan(null)} className="mt-4 font-body text-xs text-emerald-300/60 hover:text-emerald-300">Nieuw plan maken</button>
        </div>
      )}
    </div>
  );
}

// ── HOOFDMENU ─────────────────────────────────────────────────────────
const menuItems = [
  { id: 'zwakste',    icon: Target,   label: 'Zwakste Meter',   sub: 'Waar verlies jij slagen?',   color: 'from-red-500/20 to-orange-500/20',   border: 'border-red-400/30',    iconColor: 'text-red-400'    },
  { id: 'vertrouwen', icon: Shield,   label: 'Club Vertrouwen', sub: 'Score per club laatste 10',  color: 'from-blue-500/20 to-cyan-500/20',    border: 'border-blue-400/30',   iconColor: 'text-blue-400'   },
  { id: 'mental',     icon: Brain,    label: 'Mental Score',    sub: 'Hoe voel jij je per hole?',  color: 'from-purple-500/20 to-pink-500/20',  border: 'border-purple-400/30', iconColor: 'text-purple-400' },
  { id: 'schaduw',    icon: Ghost,    label: 'Schaduw-Ronde',   sub: 'Speel tegen je beste ronde', color: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-400/30', iconColor: 'text-yellow-400' },
  { id: 'gps',        icon: Map,      label: 'GPS Trail',       sub: 'Jouw looplijn per hole',     color: 'from-teal-500/20 to-green-500/20',   border: 'border-teal-400/30',   iconColor: 'text-teal-400'   },
  { id: 'training',   icon: Dumbbell, label: 'Training',        sub: 'AI driving range plan',      color: 'from-emerald-500/20 to-lime-500/20', border: 'border-emerald-400/30',iconColor: 'text-emerald-400'},
];

export default function AllStatsScreen({ savedRounds, settings, onBack }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const active = menuItems.find(m => m.id === activeMenu);

  const gemScore = savedRounds.length > 0
    ? Math.round(savedRounds.slice(-5).reduce((s, r) => s + (r.holes?.reduce((a, h) => a + (h.score || 0), 0) || 0), 0) / Math.min(savedRounds.length, 5))
    : null;

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
          <div className="space-y-3">
            <div className="glass-card rounded-2xl p-5 mb-2 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-400/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-5xl text-emerald-300">{settings.handicap || '--'}</div>
                  <div className="font-body text-xs text-emerald-200/60 mt-1">Handicap · {savedRounds.length} rondes</div>
                </div>
                {gemScore && (
                  <div className="text-right">
                    <div className="font-display text-3xl text-white">{gemScore}</div>
                    <div className="font-body text-xs text-emerald-200/60">gem. score</div>
                  </div>
                )}
              </div>
            </div>
            {menuItems.map(item => (
              <button key={item.id} onClick={() => setActiveMenu(item.id)}
                className={`w-full glass-card rounded-2xl p-5 flex items-center gap-4 hover:bg-white/10 active:scale-98 transition bg-gradient-to-r ${item.color} border ${item.border}`}>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
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
        ) : activeMenu === 'zwakste'    ? <ZwaksteMeter savedRounds={savedRounds} settings={settings} />
        : activeMenu === 'vertrouwen'   ? <ClubVertrouwen savedRounds={savedRounds} />
        : activeMenu === 'mental'       ? <MentalScore savedRounds={savedRounds} />
        : activeMenu === 'schaduw'      ? <SchaduwRonde savedRounds={savedRounds} />
        : activeMenu === 'gps'          ? <GpsTrail savedRounds={savedRounds} />
        : activeMenu === 'training'     ? <Training savedRounds={savedRounds} settings={settings} />
        : null}
      </div>
    </div>
  );
}
