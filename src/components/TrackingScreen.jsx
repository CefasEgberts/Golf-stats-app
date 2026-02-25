import React, { useState, useRef } from 'react';
import { ChevronLeft, MapPin } from 'lucide-react';
import { calculateStablefordForHole, calculatePlayingHandicap, getStrokeIndex } from '../lib/stableford';
import HoleOverlay from './HoleOverlay';

export default function TrackingScreen({ round, courseData, settings, clubs, convertDistance, getUnitLabel, Dist, t, finishHole, onQuit, gps, wind }) {
  const si = getStrokeIndex(courseData.allHolesData, round.currentHole, settings.gender);
  const [showGreenDistances, setShowGreenDistances] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const [showFinishHole, setShowFinishHole] = useState(false);
  const finishHoleRef = useRef(null);

  return (
    <div className="animate-slide-up min-h-screen flex flex-col bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900">

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
        />
      )}

      {/* Header */}
      <div className="p-6 bg-gradient-to-b from-black/20 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onQuit}><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={() => { round.setShowHoleOverview(true); round.setPhotoExpanded(false); round.setShowStrategy(false); }}
            className="glass-card px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="font-body text-xs text-emerald-300 uppercase tracking-wider">Hole Info</span>
          </button>
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
              <button key={club} onClick={() => { round.setSelectedClub(club); setShowPenalty(false); if (club === 'Putter') round.setSelectedLie('green'); }}
                className={'club-btn glass-card rounded-xl py-3 px-2 font-body text-sm font-medium ' + (round.selectedClub === club ? 'selected' : '')}>{club}</button>
            ))}
            <button onClick={() => { setShowPenalty(!showPenalty); round.setSelectedClub(''); }}
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

        {/* Distance / Putts */}
        {round.selectedClub && (
          <div className="space-y-4 animate-slide-up">
            {round.selectedClub === 'Putter' ? (
              <div className="glass-card rounded-xl p-6 bg-emerald-500/10 border-emerald-400/30">
                <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider text-center">{t('putts')}</div>
                <div className="text-center mb-4">
                  <input type="number" value={round.manualDistance} onChange={(e) => round.setManualDistance(e.target.value)} placeholder="1"
                    className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center inline-block" />
                  <span className="font-display text-2xl text-emerald-300 ml-2">{round.manualDistance == 1 ? 'putt' : 'putts'}</span>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-xl p-6 bg-emerald-500/10 border-emerald-400/30">
                <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider text-center">{t('distancePlayed')}</div>
                <div className="text-center mb-4">
                  <input type="number" value={round.manualDistance} onChange={(e) => round.setManualDistance(e.target.value)}
                    placeholder={(gps?.gpsShotDistance && gps.gpsTracking ? gps.gpsShotDistance : round.suggestedDistance)?.toString()}
                    className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center inline-block" />
                  <span className="font-display text-2xl text-emerald-300 ml-2">{getUnitLabel()}</span>
                </div>
                <div className="font-body text-xs text-emerald-200/50 text-center">{t('adjust')}</div>
              </div>
            )}

            {/* Lie - auto-selected to green for Putter */}
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

            <button onClick={() => { if (gps?.gpsTracking) gps.captureShot(); round.addShot(); }} disabled={!round.selectedLie}
              className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
              {t('distanceOk').toUpperCase()}
            </button>
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

        {/* GPS Simulation controls (dev mode) */}
        {gps?.simMode && (
          <div className="mt-6 glass-card rounded-2xl p-4 border-2 border-yellow-500/30 bg-yellow-500/5">
            <div className="font-body text-xs text-yellow-300 mb-3 uppercase tracking-wider text-center">🧪 GPS Simulatie</div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => gps.simulateShot(50)}
                className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg py-2 font-body text-sm text-yellow-200 hover:bg-yellow-500/30 transition">+50m</button>
              <button onClick={() => gps.simulateShot(100)}
                className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg py-2 font-body text-sm text-yellow-200 hover:bg-yellow-500/30 transition">+100m</button>
              <button onClick={() => gps.simulateShot(150)}
                className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg py-2 font-body text-sm text-yellow-200 hover:bg-yellow-500/30 transition">+150m</button>
              <button onClick={() => gps.simulateShot(190)}
                className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg py-2 font-body text-sm text-yellow-200 hover:bg-yellow-500/30 transition">+190m</button>
              <button onClick={() => gps.simulateShot(200)}
                className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg py-2 font-body text-sm text-yellow-200 hover:bg-yellow-500/30 transition">+200m</button>
              <button onClick={() => gps.simulateShot(gps.gpsDistanceToGreen || 0)}
                className="bg-emerald-500/20 border border-emerald-400/30 rounded-lg py-2 font-body text-sm text-emerald-200 hover:bg-emerald-500/30 transition">→ Green</button>
            </div>
            <button onClick={() => gps.stopSimulation()}
              className="w-full mt-2 bg-red-500/20 border border-red-400/30 rounded-lg py-2 font-body text-xs text-red-300 hover:bg-red-500/30 transition">Stop simulatie</button>
          </div>
        )}
      </div>
    </div>
  );
}
