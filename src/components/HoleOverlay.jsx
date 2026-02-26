import React from 'react';
import { haversineMeters } from '../lib/gps';

export default function HoleOverlay({ currentHoleInfo, remainingDistance, showStrategy, setShowStrategy, onClose, t, gps, wind }) {
  const hasGreenCoords = currentHoleInfo.greenLat != null && currentHoleInfo.greenLng != null;

  // Wind direction label (absolute compass)
  const getWindLabel = (deg) => {
    const dirs = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  };

  // Calculate bearing from point A to point B (in degrees, 0=North)
  const calcBearing = (lat1, lng1, lat2, lng2) => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  // Hole bearing: direction player faces (towards green)
  const getHoleBearing = () => {
    // Prefer GPS position → green center
    if (gps?.gpsTracking && gps.gpsPosition && hasGreenCoords) {
      return calcBearing(gps.gpsPosition.lat, gps.gpsPosition.lng, currentHoleInfo.greenLat, currentHoleInfo.greenLng);
    }
    // Fallback: front → back of green (rough hole direction)
    if (currentHoleInfo.greenFrontLat != null && currentHoleInfo.greenBackLat != null) {
      return calcBearing(currentHoleInfo.greenFrontLat, currentHoleInfo.greenFrontLng, currentHoleInfo.greenBackLat, currentHoleInfo.greenBackLng);
    }
    return null;
  };

  const holeBearing = getHoleBearing();

  // Relative wind: 0 = headwind, 90 = from right, 180 = tailwind, 270 = from left
  const getRelativeWind = () => {
    if (holeBearing == null || !wind) return null;
    // Wind direction is where wind comes FROM. Subtract hole bearing to get relative.
    return (wind.direction - holeBearing + 360) % 360;
  };

  const relativeWind = getRelativeWind();

  // Relative wind label for player perspective
  const getRelativeWindLabel = () => {
    if (relativeWind == null) return null;
    if (relativeWind >= 337.5 || relativeWind < 22.5) return 'tegenwind';
    if (relativeWind >= 22.5 && relativeWind < 67.5) return 'schuin tegen rechts';
    if (relativeWind >= 67.5 && relativeWind < 112.5) return 'van rechts';
    if (relativeWind >= 112.5 && relativeWind < 157.5) return 'schuin mee rechts';
    if (relativeWind >= 157.5 && relativeWind < 202.5) return 'meewind';
    if (relativeWind >= 202.5 && relativeWind < 247.5) return 'schuin mee links';
    if (relativeWind >= 247.5 && relativeWind < 292.5) return 'van links';
    if (relativeWind >= 292.5 && relativeWind < 337.5) return 'schuin tegen links';
    return null;
  };

  // Calculate GPS dot position on photo
  const getGpsDotTop = () => {
    if (!gps?.gpsTracking || !gps.gpsPosition || !gps.teePosition || !hasGreenCoords) return null;
    const totalDist = haversineMeters(gps.teePosition.lat, gps.teePosition.lng, currentHoleInfo.greenLat, currentHoleInfo.greenLng);
    if (totalDist < 1) return null;
    const remainDist = haversineMeters(gps.gpsPosition.lat, gps.gpsPosition.lng, currentHoleInfo.greenLat, currentHoleInfo.greenLng);
    const progress = 1 - (remainDist / totalDist);
    // Map progress: 0 (tee) = 88%, 1 (green) = 4%
    return Math.max(4, Math.min(88, 88 - progress * 84));
  };

  const gpsDotTop = getGpsDotTop();

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col" onClick={onClose}>
      <div className="flex-shrink-0 px-4 pt-3 pb-2 text-center">
        <span className="font-body text-xs text-white/40">tik om te sluiten</span>
        <div className="flex items-center justify-center gap-3 mt-1">
          <span className="font-display text-xl bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">HOLE {currentHoleInfo.number}</span>
          <span className="font-body text-emerald-200/70 text-sm">Par {currentHoleInfo.par}</span>
          <span className="font-body text-emerald-200/70 text-sm">{currentHoleInfo.totalDistance}m</span>
          {remainingDistance !== currentHoleInfo.totalDistance && (
            <span className="font-body text-red-400 text-sm font-bold">Nog {remainingDistance}m</span>
          )}
          {wind && wind.beaufort >= 2 && (
            <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ' +
              (wind.beaufort >= 5 ? 'bg-red-500/80 text-white' : wind.beaufort >= 4 ? 'bg-orange-500/80 text-white' : 'bg-blue-500/60 text-white')}>
              <span style={{ display: 'inline-block', transform: `rotate(${relativeWind != null ? relativeWind : wind.direction}deg)`, fontSize: '14px' }}>↓</span>
              Bft {wind.beaufort} {relativeWind != null ? getRelativeWindLabel() : getWindLabel(wind.direction)}
            </span>
          )}
        </div>
      </div>
      <div className={'flex-1 flex items-center justify-center px-4 transition-all duration-300 ' + (showStrategy ? 'max-h-[40vh]' : '')}
        onClick={(e) => e.stopPropagation()}>
        {currentHoleInfo.photoUrl ? (
          <div className="relative h-full flex items-center justify-center">
            <img src={currentHoleInfo.photoUrl} alt={`Hole ${currentHoleInfo.number}`}
              className="object-contain rounded-xl border border-emerald-600/30 transition-all duration-300"
              style={{ maxHeight: showStrategy ? '35vh' : '72vh', maxWidth: '100%' }} />
            {/* GPS blinking dot */}
            {gpsDotTop != null && (
              <div style={{ position: 'absolute', left: '50%', top: gpsDotTop + '%', transform: 'translate(-50%, -50%)' }}>
                <div className="gps-dot w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
              </div>
            )}
            {/* Remaining distance arrow */}
            {remainingDistance > 0 && currentHoleInfo.totalDistance > 0 && (
              <div style={{ position: 'absolute', right: '8px', top: Math.max(8, Math.min(88, (remainingDistance / currentHoleInfo.totalDistance) * 80 + 8)) + '%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '3px', flexDirection: 'row-reverse' }}>
                <div className="bg-red-500 text-white font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap" style={{ fontSize: '11px' }}>{remainingDistance}m</div>
                <div className="w-0 h-0" style={{ borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '8px solid #ef4444' }}></div>
              </div>
            )}
            <div style={{ position: 'absolute', right: '8px', top: '4%' }}>
              <div className="bg-emerald-500 text-white font-bold px-2 py-0.5 rounded shadow-lg" style={{ fontSize: '10px' }}>⛳ Green</div>
            </div>
          </div>
        ) : (
          <div className="h-32 w-full max-w-sm bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
            <span className="text-emerald-200/40 text-sm">📷 {t('noPhoto')}</span>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 px-4 pb-4 pt-2" onClick={(e) => e.stopPropagation()}>
        <div className="max-w-lg mx-auto">
          {(currentHoleInfo.holeStrategy || (wind && wind.beaufort >= 2)) && (
            <>
              <button onClick={() => setShowStrategy(!showStrategy)}
                className={'w-full rounded-xl py-3 px-4 font-body font-medium transition border ' +
                  (showStrategy ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' : 'bg-white/5 border-white/20 text-white hover:bg-white/10')}>
                🏌️ {t('howToPlay')} <span className="ml-2 text-xs">{showStrategy ? '▲' : '▼'}</span>
              </button>
              {showStrategy && (
                <div className="bg-white/5 rounded-xl p-3 mt-2 border border-white/10 animate-slide-up max-h-[45vh] overflow-y-auto">
                  {/* Standaard info */}
                  {currentHoleInfo.holeStrategy && (
                    <div className="mb-3">
                      <div className="font-body text-xs text-emerald-300 font-semibold mb-2 uppercase tracking-wider">📋 Standaard info</div>
                      <p className="font-body text-white text-sm leading-relaxed">{currentHoleInfo.holeStrategy}</p>
                    </div>
                  )}
                  {/* Wind advies */}
                  {wind && wind.beaufort >= 2 && (() => {
                    const windDir = wind.direction;
                    const windLabel = getWindLabel(windDir);
                    const bft = wind.beaufort;
                    const speedMph = Math.round(wind.speed * 0.621371);
                    const dist = remainingDistance || currentHoleInfo.totalDistance;

                    // Use relative wind if available, otherwise absolute
                    const rw = relativeWind;
                    const isHeadwind = rw != null ? (rw >= 315 || rw < 45) : (windDir >= 135 && windDir <= 225);
                    const isTailwind = rw != null ? (rw >= 135 && rw < 225) : (windDir <= 45 || windDir >= 315);
                    const isLeftWind = rw != null ? (rw >= 225 && rw < 315) : (windDir > 225 && windDir < 315);
                    const isRightWind = rw != null ? (rw >= 45 && rw < 135) : (windDir > 45 && windDir < 135);
                    const relLabel = relativeWind != null ? getRelativeWindLabel() : getWindLabel(windDir);

                    // Distance adjustment
                    let distAdvice = '';
                    let extraMeters = 0;
                    if (isHeadwind) {
                      extraMeters = Math.round(dist * speedMph * 0.01);
                      distAdvice = `Tegenwind: reken ${extraMeters}m extra (${dist}m + ${Math.round(speedMph)}% = ${dist + extraMeters}m effectief)`;
                    } else if (isTailwind) {
                      extraMeters = Math.round(dist * speedMph * 0.005);
                      distAdvice = `Meewind: trek ${extraMeters}m af (${dist}m - ${Math.round(speedMph * 0.5)}% = ${dist - extraMeters}m effectief)`;
                    } else {
                      // Crosswind has partial head/tail component
                      const rwRad = (rw != null ? rw : windDir) * Math.PI / 180;
                      const headComponent = Math.cos(rwRad);
                      if (headComponent > 0.2) {
                        extraMeters = Math.round(dist * speedMph * 0.01 * headComponent);
                        distAdvice = `Schuin tegenwind: reken ~${extraMeters}m extra`;
                      } else if (headComponent < -0.2) {
                        extraMeters = Math.round(dist * speedMph * 0.005 * Math.abs(headComponent));
                        distAdvice = `Schuin meewind: trek ~${extraMeters}m af`;
                      }
                    }

                    // Side drift advice
                    let sideAdvice = '';
                    if (isLeftWind) {
                      sideAdvice = 'Wind van links: richt 15-20m links van de vlag. De bal driftt naar rechts.';
                    } else if (isRightWind) {
                      sideAdvice = 'Wind van rechts: richt 15-20m rechts van de vlag. De bal driftt naar links.';
                    }

                    // Club advice
                    let clubAdvice = '';
                    if (bft >= 4) {
                      if (isHeadwind) {
                        clubAdvice = 'Neem 1,5 tot 2 clubs meer en sla rustiger om "onder de wind" te blijven.';
                      } else if (isTailwind) {
                        clubAdvice = 'Neem 1 club minder. De wind draagt de bal verder.';
                      } else if (isLeftWind || isRightWind) {
                        clubAdvice = `Neem bij twijfel één club extra. ${isLeftWind ? 'Mik links' : 'Mik rechts'}, de bal driftt ${isLeftWind ? 'naar rechts' : 'naar links'}.`;
                      }
                    } else if (bft >= 3) {
                      if (isHeadwind) clubAdvice = 'Overweeg 1 club meer tegen de wind in.';
                      else if (isTailwind) clubAdvice = 'Je hebt wind mee — overweeg een half clubje minder.';
                      else if (isLeftWind || isRightWind) clubAdvice = `Compenseer ~10m ${isLeftWind ? 'links' : 'rechts'} van je doel.`;
                    }

                    return (
                      <div className={'p-3 rounded-xl border mt-2 ' + (bft >= 5 ? 'bg-red-500/10 border-red-400/30' : bft >= 4 ? 'bg-orange-500/10 border-orange-400/30' : 'bg-blue-500/10 border-blue-400/30')}>
                        <div className="font-body text-xs text-emerald-300 font-semibold mb-2 uppercase tracking-wider">
                          💨 Windadvies — Bft {bft} {relLabel} ({wind.speed} km/h, {windLabel})
                        </div>
                        <div className="font-body text-sm text-white space-y-2">
                          {distAdvice && <p>📏 {distAdvice}</p>}
                          {sideAdvice && <p>🎯 {sideAdvice}</p>}
                          {clubAdvice && <p>🏌️ {clubAdvice}</p>}
                          {bft >= 4 && <p className="text-xs text-emerald-200/60 italic">Tip: Hoe hoger de balvlucht (wedge/9-ijzer), hoe meer de wind grip heeft. Overweeg een lagere balvlucht.</p>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}
          {/* Close button */}
          <button onClick={onClose}
            className="w-full mt-3 btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
            {t('beginHole')}
          </button>
        </div>
      </div>
    </div>
  );
}
