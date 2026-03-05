import React, { useState, useRef } from 'react';
import { ChevronLeft, MapPin } from 'lucide-react';
import { calculateStablefordForHole, calculatePlayingHandicap, getStrokeIndex } from '../lib/stableford';
import HoleOverlay from './HoleOverlay';

export default function TrackingScreen({ round, courseData, settings, clubs, convertDistance, getUnitLabel, Dist, t, finishHole, onQuit, gps, wind, user }) {
  const si = getStrokeIndex(courseData.allHolesData, round.currentHole, settings.gender);
  const [showGreenDistances, setShowGreenDistances] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const [showFinishHole, setShowFinishHole] = useState(false);
  const [shotStarted, setShotStarted] = useState(false);
  const [displayDistance, setDisplayDistance] = useState('');
  const [showCaddy, setShowCaddy] = useState(false);
  const [caddyAdvice, setCaddyAdvice] = useState('');
  const [caddyLoading, setCaddyLoading] = useState(false);
  const finishHoleRef = useRef(null);
  const startButtonRef = useRef(null);

  const buildCaddyPrompt = () => {
    const hole = round.currentHoleInfo;
    const clubDistances = settings.clubDistances || {};
    const bagWithDistances = (settings.bag || [])
      .filter(c => c !== 'Putter')
      .map(c => clubDistances[c] ? `${c}: ${clubDistances[c]}m` : `${c}: onbekend`)
      .join(', ');
    const shotsPlayed = round.currentHoleShots.length > 0
      ? round.currentHoleShots.map((s, i) => `Slag ${i+1}: ${s.club}${s.distancePlayed ? `, ${s.distancePlayed}m geslagen` : ''}${s.lie ? `, ligt op: ${s.lie}` : ''}`).join('\n')
      : 'Nog geen slagen gespeeld — dit is de tee shot.';

    const windInfo = wind && wind.beaufort >= 2
      ? `Wind: Beaufort ${wind.beaufort}, ${wind.speed} km/h. Richting: ${wind.direction}°.`
      : 'Wind: weinig tot geen wind (Beaufort < 2).';

    return `Je bent een ervaren golfcaddy. Geef direct, persoonlijk advies in het Nederlands zoals een echte caddy dat zou zeggen tegen zijn speler. Spreek de speler aan als "je". Geen opsommingstekens, gewone zinnen. Max 5 zinnen.

HOLE INFORMATIE:
- Hole ${hole.number || round.currentHole}, Par ${hole.par}, totaal ${hole.totalDistance}m
- Nog te gaan tot de green: ${round.remainingDistance}m
- Hole strategie: ${hole.holeStrategy || 'geen info beschikbaar'}
- Hindernissen: ${hole.hazards || 'geen specifieke info'}

SPELER:
- Handicap: ${settings.handicap || 'onbekend'}
- Clubs met gemiddelde afstanden: ${bagWithDistances || 'onbekend'}

HUIDIGE SITUATIE:
${shotsPlayed}
- ${windInfo}

INSTRUCTIES VOOR JE ADVIES:
1. Kies de beste club voor de resterende ${round.remainingDistance}m. Als de afstand groter is dan de langste club van de speler, deel de hole dan op in slimme stappen en geef aan welke club per stap.
2. Pas de clubkeuze aan voor wind: tegenwind = 1 of 2 clubs zwaarder, meewind = 1 club lichter. Zeg dit expliciet.
3. Combineer windrichting met hazards om een richting te adviseren. Bv: "wind van rechts + bunker links = speel rechts van het midden."
4. Wees concreet: noem clubnaam, richting, en eventueel strategie voor de volgende slag.`;
  };

  const askCaddyText = async () => {
    setShowCaddy(true);
    setCaddyAdvice('');
    setCaddyLoading(true);
    try {
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
          max_tokens: 400,
          messages: [{ role: 'user', content: buildCaddyPrompt() }]
        })
      });
      const data = await response.json();
      setCaddyAdvice(data.content?.[0]?.text || 'Geen advies beschikbaar.');
    } catch {
      setCaddyAdvice('Kon de caddy niet bereiken. Controleer je internetverbinding.');
    }
    setCaddyLoading(false);
  };

  const askCaddySpeech = async () => {
    setCaddyLoading(true);
    try {
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
          max_tokens: 400,
          messages: [{ role: 'user', content: buildCaddyPrompt() }]
        })
      });
      const data = await response.json();
      const text = data.content?.[0]?.text || 'Geen advies beschikbaar.';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'nl-NL';
      utterance.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      // silent fail for speech
    }
    setCaddyLoading(false);
  };

  return (
    <div className="animate-slide-up min-h-screen flex flex-col bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900">

      {/* Caddy Advice Modal */}
      {showCaddy && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col p-6" onClick={() => setShowCaddy(false)}>
          <div className="flex-shrink-0 text-center mb-4">
            <span className="font-body text-xs text-white/40">tik om te sluiten</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <div className="w-full max-w-lg">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">🎓</span>
                <div>
                  <div className="font-display text-2xl text-yellow-300">AI CADDY</div>
                  <div className="font-body text-xs text-yellow-200/60">Hole {round.currentHole} — {round.remainingDistance}m te gaan</div>
                </div>
              </div>
              <div className="glass-card rounded-2xl p-6 border border-yellow-400/30 bg-yellow-500/5 min-h-32">
                {caddyLoading ? (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></div>
                  </div>
                ) : (
                  <p className="font-body text-white text-lg leading-relaxed">{caddyAdvice}</p>
                )}
              </div>
              {!caddyLoading && caddyAdvice && (
                <button onClick={askCaddySpeech}
                  className="w-full mt-4 glass-card rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-white/10 transition border border-yellow-400/20">
                  <span>🔊</span>
                  <span className="font-body text-sm text-yellow-300">Lees voor</span>
                </button>
              )}
            </div>
          </div>
          <button onClick={() => setShowCaddy(false)}
            className="w-full mt-4 btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
            ← TERUG
          </button>
        </div>
      )}

      {/* Hole Overview Modal */}
      {round.showHoleOverview && (
        <HoleOverlay
          currentHoleInfo={round.currentHoleInfo}
          remainingDistance={round.remainingDistance}
          showStrategy={round.showStrategy}
          setShowStrategy={round.setShowStrategy}
          onClose={() => { round.setShowHoleOverview(false); round.setShowStrategy(false); }}
          t={t}
          gps={gps}
          wind={wind}
          hasShots={round.currentHoleShots.length > 0}
        />
      )}

      {/* Header */}
      <div className="p-6 bg-gradient-to-b from-black/20 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onQuit}><ChevronLeft className="w-6 h-6" /></button>
          <div className="flex items-center gap-2">
            <button onClick={askCaddyText}
              className="glass-card px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-white/10 transition">
              <span className="text-sm">🎓</span>
              <span className="font-body text-xs text-yellow-300 uppercase tracking-wider">Caddy</span>
            </button>
            <button onClick={askCaddySpeech} disabled={caddyLoading}
              className="glass-card px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-white/10 transition disabled:opacity-50">
              <span className="text-sm">🔊</span>
              <span className="font-body text-xs text-yellow-300 uppercase tracking-wider">{caddyLoading ? '...' : 'Caddy'}</span>
            </button>
            <button onClick={() => { round.setShowHoleOverview(true); round.setPhotoExpanded(false); round.setShowStrategy(false); }}
              className="glass-card px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-white/10 transition">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="font-body text-xs text-emerald-300 uppercase tracking-wider">Info</span>
            </button>
          </div>
        </div>
        <div className="text-center mb-4">
          <div className="font-display text-5xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">HOLE {round.currentHole}</div>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="font-body text-emerald-200/70">Par {round.currentHoleInfo.par}</span>
            <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
            <span className="font-body text-emerald-200/70">{round.currentHoleInfo.totalDistance}m</span>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">{t('toGo')}</div>
          <div className="font-display text-7xl text-white">{convertDistance(round.remainingDistance)}<span className="text-4xl text-emerald-300 ml-2">{getUnitLabel()}</span></div>
          <div className="font-body text-xs text-emerald-200/60 mt-2">
            {gps?.gpsTracking && gps.gpsDistanceToGreen != null ? t('gpsLiveDistance') : t('toMiddleGreen')}
          </div>
          {/* GPS status indicator */}
          {gps?.gpsTracking && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="gps-dot w-2.5 h-2.5 bg-red-500 rounded-full"></div>
              <span className="font-body text-xs text-emerald-200/70">{t('gpsActive')}</span>
              {gps.gpsAccuracy != null && (
                <span className="font-body text-xs text-emerald-200/50">±{gps.gpsAccuracy}m</span>
              )}
              <button onClick={() => gps.stopTracking()}
                className="ml-2 px-2 py-0.5 bg-red-500/20 border border-red-400/30 rounded-lg font-body text-xs text-red-300 hover:bg-red-500/30 transition">
                {t('gpsStop')}
              </button>
            </div>
          )}
          {gps?.gpsError && (
            <div className="font-body text-xs text-red-400 mt-2">{gps.gpsError}</div>
          )}
        </div>
        {/* Green distances grid */}
        {gps?.gpsTracking && gps.gpsGreenDistances && (
          <div className="mt-3">
            <button onClick={() => setShowGreenDistances(!showGreenDistances)}
              className="w-full glass-card rounded-2xl p-3 flex items-center justify-between hover:bg-white/10 transition">
              <span className="font-body text-xs text-emerald-200/70 uppercase tracking-wider">{t('greenDistances')}</span>
              <div className="flex items-center gap-3">
                <span className="font-display text-lg text-emerald-300">
                  {gps.gpsGreenDistances.front != null && gps.gpsGreenDistances.back != null
                    ? `${convertDistance(gps.gpsGreenDistances.front)} - ${convertDistance(gps.gpsGreenDistances.back)} ${getUnitLabel()}`
                    : `${convertDistance(gps.gpsGreenDistances.center)} ${getUnitLabel()}`}
                </span>
                <span className="text-emerald-200/50 text-xs">{showGreenDistances ? '▲' : '▼'}</span>
              </div>
            </button>
            {showGreenDistances && (
              <div className="glass-card rounded-2xl p-4 mt-1 animate-slide-up">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div></div>
                  <div className="text-center">
                    <div className="font-body text-xs text-emerald-200/50">{t('back')}</div>
                    <div className="font-display text-2xl text-white">{gps.gpsGreenDistances.back != null ? convertDistance(gps.gpsGreenDistances.back) : '-'}</div>
                  </div>
                  <div></div>
                  <div className="text-center">
                    <div className="font-body text-xs text-emerald-200/50">{t('left')}</div>
                    <div className="font-display text-2xl text-white">{gps.gpsGreenDistances.left != null ? convertDistance(gps.gpsGreenDistances.left) : '-'}</div>
                  </div>
                  <div className="text-center bg-emerald-500/20 rounded-xl py-2">
                    <div className="font-body text-xs text-emerald-300">⛳</div>
                    <div className="font-display text-2xl text-emerald-300">{gps.gpsGreenDistances.center != null ? convertDistance(gps.gpsGreenDistances.center) : '-'}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-body text-xs text-emerald-200/50">{t('right')}</div>
                    <div className="font-display text-2xl text-white">{gps.gpsGreenDistances.right != null ? convertDistance(gps.gpsGreenDistances.right) : '-'}</div>
                  </div>
                  <div></div>
                  <div className="text-center">
                    <div className="font-body text-xs text-emerald-200/50">{t('front')}</div>
                    <div className="font-display text-2xl text-white">{gps.gpsGreenDistances.front != null ? convertDistance(gps.gpsGreenDistances.front) : '-'}</div>
                  </div>
                  <div></div>
                </div>
                <div className="font-body text-xs text-emerald-200/40 text-center mt-2">{getUnitLabel()}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 overflow-y-auto pb-6">
        {/* Club Selection */}
        <div className="mb-6">
          <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{t('shot')} {round.currentHoleShots.length + 1}: {t('whichClub')}</label>
          <div className="grid grid-cols-4 gap-2">
            {clubs.map((club) => (
              <button key={club} onClick={() => { round.setSelectedClub(club); setShowPenalty(false); setShotStarted(false); setDisplayDistance(''); if (club === 'Putter') round.setSelectedLie('green'); setTimeout(() => startButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }}
                className={'club-btn glass-card rounded-xl py-3 px-2 font-body text-sm font-medium ' + (round.selectedClub === club ? 'selected' : '')}>{club}</button>
            ))}
            <button onClick={() => { setShowPenalty(!showPenalty); round.setSelectedClub(''); setShotStarted(false); }}
              className={'club-btn rounded-xl py-3 px-2 font-body text-sm font-medium border-2 transition ' +
                (showPenalty ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/50' : 'bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30')}>
              🚩 Strafslag
            </button>
          </div>

          {/* Penalty dropdown */}
          {showPenalty && (
            <div className="mt-4 space-y-3 animate-slide-up">
              <div className="flex gap-2">
                <button onClick={() => { round.addPenalty(1); setShowPenalty(false); }}
                  className="flex-1 bg-red-500/20 border-2 border-red-400/30 rounded-xl py-4 font-display text-xl text-red-300 hover:bg-red-500/30 transition">
                  +1 Strafslag
                </button>
                <button onClick={() => { round.addPenalty(2); setShowPenalty(false); }}
                  className="flex-1 bg-red-500/20 border-2 border-red-400/30 rounded-xl py-4 font-display text-xl text-red-300 hover:bg-red-500/30 transition">
                  +2 Strafslagen
                </button>
              </div>
              <div className="glass-card rounded-xl p-4 border border-red-400/20 bg-red-500/5">
                <div className="font-body text-xs text-red-300 font-semibold mb-2">1 Strafslag:</div>
                <div className="font-body text-xs text-emerald-200/70 space-y-1">
                  <p>• <strong className="text-white">Bal verloren</strong> of buiten de baan: terug naar vorige plek</p>
                  <p>• <strong className="text-white">Water hindernis</strong>: spelen vanaf vorige plek of droppen in de lijn</p>
                  <p>• <strong className="text-white">Onspeelbare bal</strong>: droppen of terug naar vorige plek</p>
                  <p>• <strong className="text-white">Bal beweegt</strong>: bij weghalen losse voorwerpen of per ongeluk</p>
                </div>
                <div className="font-body text-xs text-red-300 font-semibold mt-3 mb-2">2 Strafslagen:</div>
                <div className="font-body text-xs text-emerald-200/70 space-y-1">
                  <p>• <strong className="text-white">Verkeerde bal</strong> spelen</p>
                  <p>• <strong className="text-white">Foutieve drop</strong>: verkeerde plek of manier</p>
                  <p>• <strong className="text-white">Te veel clubs</strong>: meer dan 14 in je tas</p>
                  <p>• <strong className="text-white">Verkeerde green</strong>: spelen vanaf andere green</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Shot flow after club selection */}
        {round.selectedClub && (
          <div className="space-y-4 animate-slide-up" ref={startButtonRef}>
            {round.selectedClub === 'Putter' ? (
              /* Putter: just enter number of putts */
              <div className="glass-card rounded-xl p-6 bg-emerald-500/10 border-emerald-400/30">
                <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider text-center">{t('putts')}</div>
                <div className="text-center mb-4">
                  <input type="text" inputMode="numeric" value={round.manualDistance} onChange={(e) => round.setManualDistance(e.target.value)} placeholder="1"
                    onFocus={(e) => e.target.select()}
                    className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center inline-block" />
                  <span className="font-display text-2xl text-emerald-300 ml-2">{round.manualDistance == 1 ? 'putt' : 'putts'}</span>
                </div>
              </div>
            ) : gps?.gpsTracking && !gps?.simMode ? (
              /* GPS mode: START button to capture position, then show live distance */
              <>
                {!shotStarted ? (
                  <button onClick={() => { gps.captureStartPosition(); setShotStarted(true); setDisplayDistance(gps.gpsShotDistance != null ? String(convertDistance(gps.gpsShotDistance)) : ''); const clubDist = settings.clubDistances?.[round.selectedClub]; if (gps.armShotReminder) gps.armShotReminder(clubDist || null); }}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl py-5 font-display text-2xl tracking-wider text-white shadow-lg shadow-blue-500/40 flex items-center justify-center gap-3 active:scale-95 transition">
                    📍 START
                  </button>
                ) : (
                  <div className="glass-card rounded-xl p-6 bg-blue-500/10 border-blue-400/30">
                    <div className="font-body text-xs text-blue-200/70 mb-2 uppercase tracking-wider text-center">Geslagen afstand</div>
                    <div className="text-center mb-2">
                      <input
                        type="text" inputMode="numeric"
                        value={displayDistance !== '' ? displayDistance : (gps.gpsShotDistance != null ? String(convertDistance(gps.gpsShotDistance)) : '')}
                        onChange={(e) => { setDisplayDistance(e.target.value); round.setManualDistance(e.target.value); }}
                        onFocus={(e) => e.target.select()}
                        placeholder={gps.gpsShotDistance != null ? convertDistance(gps.gpsShotDistance).toString() : '...'}
                        className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-center inline-block"
                      />
                      <span className="font-display text-3xl text-emerald-300 ml-2">{getUnitLabel()}</span>
                    </div>
                    <div className="font-body text-xs text-blue-200/50 text-center">GPS afstand — pas aan indien nodig</div>
                  </div>
                )}
              </>
            ) : gps?.simMode ? (
              /* Sim mode: vrij invoerveld voor geslagen afstand */
              <>
                <div className="glass-card rounded-2xl p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                  <div className="font-body text-xs text-yellow-300 mb-3 uppercase tracking-wider text-center">🧪 Simuleer slag met {round.selectedClub}</div>
                  <div className="text-center mb-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="bijv. 190"
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val > 0) { gps.simulateShot(val); round.setManualDistance(String(val)); }
                        }
                      }}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) { gps.simulateShot(val); round.setManualDistance(String(val)); }
                      }}
                      className="w-36 bg-white/10 border border-yellow-400/30 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-center inline-block"
                    />
                    <span className="font-display text-2xl text-emerald-300 ml-2">{getUnitLabel()}</span>
                  </div>
                  <div className="font-body text-xs text-yellow-200/40 text-center">Typ de geslagen afstand en druk Enter</div>
                </div>
                {gps.gpsShotDistance != null && (
                  <div className="glass-card rounded-xl p-4 bg-yellow-500/10 border-yellow-400/30">
                    <div className="font-body text-xs text-yellow-200/70 mb-1 uppercase tracking-wider text-center">Gesimuleerde afstand</div>
                    <div className="text-center">
                      <span className="font-display text-5xl text-white">{convertDistance(gps.gpsShotDistance)}</span>
                      <span className="font-display text-2xl text-emerald-300 ml-2">{getUnitLabel()}</span>
                    </div>
                    <div className="font-body text-xs text-yellow-200/40 text-center mt-1">Nog {convertDistance(gps.gpsDistanceToGreen || 0)}{getUnitLabel()} tot de green</div>
                  </div>
                )}
              </>
            ) : (
              /* Manual mode: enter distance manually */
              <div className="glass-card rounded-xl p-6 bg-emerald-500/10 border-emerald-400/30">
                <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider text-center">{t('distancePlayed')}</div>
                <div className="text-center mb-4">
                  <input type="text" inputMode="numeric" value={round.manualDistance} onChange={(e) => round.setManualDistance(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder={round.suggestedDistance?.toString()}
                    className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center inline-block" />
                  <span className="font-display text-2xl text-emerald-300 ml-2">{getUnitLabel()}</span>
                </div>
                <div className="font-body text-xs text-emerald-200/50 text-center">{t('adjust')}</div>
              </div>
            )}

            {/* Lie selection - show after START in GPS mode, after sim shot, or always in manual/putter */}
            {(round.selectedClub === 'Putter' || (!gps?.gpsTracking && !gps?.simMode) || shotStarted || (gps?.simMode && gps.gpsShotDistance != null)) && (
              <>
                {round.selectedClub !== 'Putter' && (
                  <div>
                    <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{t('lie')}</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'fairway', emoji: '🟢', color: 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/50' },
                        { key: 'rough', emoji: '🟤', color: 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/50' },
                        { key: 'bunker', emoji: '🟡', color: 'bg-yellow-500 border-yellow-400 text-gray-900 shadow-lg shadow-yellow-500/50' },
                        { key: 'fringe', emoji: '🟨', color: 'bg-lime-500 border-lime-400 text-gray-900 shadow-lg shadow-lime-500/50' },
                        { key: 'green', emoji: '🟩', color: 'bg-emerald-400 border-emerald-300 text-white shadow-lg shadow-emerald-400/50' },
                        { key: 'penalty', emoji: '🔴', color: 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/50' }
                      ].map(({ key, emoji, color }) => (
                        <button key={key} onClick={() => round.setSelectedLie(key)}
                          className={'rounded-xl py-4 flex items-center justify-center gap-2 font-body font-medium transition border-2 ' +
                            (round.selectedLie === key ? color : 'bg-white/10 border-white/20 text-white hover:bg-white/15')}>
                          {emoji} {t(key)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={() => {
                  if (gps?.gpsTracking) gps.captureShot();
                  if (gps?.disarmShotReminder) gps.disarmShotReminder();
                  // In GPS or sim mode, auto-set distance from GPS
                  if (gps?.gpsTracking && gps.gpsShotDistance != null && !round.manualDistance) {
                    round.setManualDistance(gps.gpsShotDistance.toString());
                  }
                  round.addShot();
                  setShotStarted(false);
                }} disabled={round.selectedClub !== 'Putter' && !round.selectedLie}
                  className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
                  {t('distanceOk').toUpperCase()}
                </button>
              </>
            )}
          </div>
        )}

        {/* Shot History */}
        {round.currentHoleShots.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <label className="font-body text-xs text-emerald-200/70 uppercase tracking-wider">Slagen dit hole</label>
              <button onClick={round.undoLastShot} className="btn-secondary rounded-lg px-3 py-1.5 font-body text-xs font-medium hover:bg-white/20 transition">↶ Ongedaan maken</button>
            </div>
            <div className="space-y-2">
              {round.currentHoleShots.map((shot) => (
                <div key={shot.shotNumber} className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 bg-emerald-500/30 rounded-full flex items-center justify-center font-display text-emerald-300">{shot.shotNumber}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-body font-semibold text-white">{shot.club}</span>
                      </div>
                      <div className="font-body text-xs text-emerald-200/60">
                        {shot.club === 'Strafslag' ? `+${shot.penaltyStrokes} strafslag${shot.penaltyStrokes > 1 ? 'en' : ''}` : shot.club === 'Putter' ? `${shot.putts || 1} putt${(shot.putts || 1) !== 1 ? 's' : ''}` : `${Dist({ value: shot.distanceToGreen })} → ${Dist({ value: shot.distanceToGreen - shot.distancePlayed })}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={'font-display text-2xl ' + (shot.club === 'Strafslag' ? 'text-red-400' : 'text-emerald-300')}>{shot.club === 'Strafslag' ? `+${shot.penaltyStrokes}` : shot.club === 'Putter' ? `${shot.putts || 1}×` : Dist({ value: shot.distancePlayed })}</div>
                    <button onClick={() => round.deleteShot(shot.shotNumber)} className="text-red-400 hover:text-red-300 text-2xl font-bold transition w-8 h-8 flex items-center justify-center">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finish Hole */}
        {round.currentHoleShots.length > 0 && (() => {
          const totalPutts = round.currentHoleShots.filter(s => s.club === 'Putter').reduce((sum, s) => sum + (s.putts || 1), 0);
          const totalPenalties = round.currentHoleShots.filter(s => s.club === 'Strafslag').reduce((sum, s) => sum + (s.penaltyStrokes || 0), 0);
          const nonPuttShots = round.currentHoleShots.filter(s => s.club !== 'Putter' && s.club !== 'Strafslag').length;
          const autoScore = nonPuttShots + totalPutts + totalPenalties;
          const holePar = round.currentHoleInfo?.par || 4;
          const stablefordPts = calculateStablefordForHole(autoScore, holePar, si, courseData.courseRating, settings.handicap);
          const playingHcp = calculatePlayingHandicap(settings.handicap, courseData.courseRating);
          const scoreToPar = autoScore - holePar;

          // Running totals from previous holes
          const prevStableford = round.roundData.holes?.reduce((sum, h) => {
            const hPar = courseData.allHolesData?.find(d => d.hole_number === h.hole)?.par || 4;
            const hSi = courseData.allHolesData?.find(d => d.hole_number === h.hole);
            const hSiVal = hSi ? (settings.gender === 'man' ? hSi.stroke_index_men : hSi.stroke_index_ladies) : null;
            const pts = calculateStablefordForHole(h.score, hPar, hSiVal, courseData.courseRating, settings.handicap);
            return sum + (pts || 0);
          }, 0) || 0;
          const runningTotal = prevStableford + (stablefordPts || 0);

          return (
            <div className="mt-6" ref={finishHoleRef}>
              <button onClick={() => { 
                const newState = !showFinishHole; 
                setShowFinishHole(newState); 
                if (newState) setTimeout(() => finishHoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              }}
                className="w-full glass-card rounded-2xl p-4 flex items-center justify-between bg-emerald-500/10 border-emerald-400/30 hover:bg-emerald-500/15 transition">
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl text-emerald-300">Hole Afronden</span>
                  <span className={'font-display text-xl ' + (scoreToPar < 0 ? 'text-emerald-300' : scoreToPar === 0 ? 'text-white' : 'text-red-300')}>
                    {autoScore} ({scoreToPar > 0 ? '+' + scoreToPar : scoreToPar < 0 ? scoreToPar : 'Par'})
                  </span>
                </div>
                <span className="text-emerald-200/50 text-xs">{showFinishHole ? '▲' : '▼'}</span>
              </button>
              {showFinishHole && (
                <div className="glass-card rounded-2xl p-6 mt-1 bg-emerald-500/10 border-emerald-400/30 animate-slide-up">
                  {totalPutts > 0 && (
                    <div className="mb-4 p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                      <div className="font-body text-sm text-emerald-300 text-center">⛳ {totalPutts} putt{totalPutts !== 1 ? 's' : ''} geregistreerd</div>
                    </div>
                  )}
                  <div className="text-center mb-4">
                    <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">Score deze hole</div>
                    <div className={'font-display text-6xl ' + (scoreToPar < 0 ? 'text-emerald-300' : scoreToPar === 0 ? 'text-white' : 'text-red-300')}>{autoScore}</div>
                    <div className="font-body text-xs text-emerald-200/60 mt-1">
                      {scoreToPar > 0 ? '+' + scoreToPar : scoreToPar < 0 ? scoreToPar : 'Par'} ({nonPuttShots} slagen + {totalPutts} putts{totalPenalties > 0 ? ` + ${totalPenalties} straf` : ''})
                    </div>
                  </div>
                  {settings.showScore && stablefordPts !== null && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl border border-yellow-500/30">
                      <div className="text-center">
                        <div className="font-body text-xs text-yellow-200/70 mb-1 uppercase tracking-wider">Stableford</div>
                        <div className="font-display text-5xl text-yellow-300">{stablefordPts}</div>
                        <div className="font-body text-xs text-yellow-200/50 mt-1">
                          punten{playingHcp !== null && ` • Baan HCP: ${playingHcp}`}{si && ` • SI: ${si}`}
                        </div>
                        {round.roundData.holes?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-yellow-500/20">
                            <div className="font-body text-xs text-yellow-200/50">Totaal na {round.roundData.holes.length + 1} holes</div>
                            <div className="font-display text-3xl text-yellow-300">{runningTotal}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <button onClick={() => { finishHole(totalPutts, autoScore); setShowFinishHole(false); }}
                    className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
                    ✓ {t('completeHole').toUpperCase()}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Sim mode: stop button */}
        {gps?.simMode && (
          <div className="mt-6">
            <button onClick={() => gps.stopSimulation()}
              className="w-full bg-red-500/20 border border-red-400/30 rounded-xl py-3 font-body text-sm text-red-300 hover:bg-red-500/30 transition">🛑 Stop simulatie</button>
          </div>
        )}
      </div>
    </div>
  );
}
