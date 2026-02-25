import React from 'react';
import { haversineMeters } from '../lib/gps';

export default function HoleOverlay({ currentHoleInfo, remainingDistance, showStrategy, setShowStrategy, onClose, t, gps }) {
  const hasGreenCoords = currentHoleInfo.greenLat != null && currentHoleInfo.greenLng != null;

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

  const handleStartGps = (e) => {
    e.stopPropagation();
    gps.startTrackingWithTeeCapture();
    onClose();
  };

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
          {currentHoleInfo.holeStrategy && (
            <>
              <button onClick={() => setShowStrategy(!showStrategy)}
                className={'w-full rounded-xl py-3 px-4 font-body font-medium transition border ' +
                  (showStrategy ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' : 'bg-white/5 border-white/20 text-white hover:bg-white/10')}>
                🏌️ {t('howToPlay')} <span className="ml-2 text-xs">{showStrategy ? '▲' : '▼'}</span>
              </button>
              {showStrategy && (
                <div className="bg-white/5 rounded-xl p-3 mt-2 border border-white/10 animate-slide-up max-h-[30vh] overflow-y-auto">
                  <p className="font-body text-white text-sm leading-relaxed">{currentHoleInfo.holeStrategy}</p>
                </div>
              )}
            </>
          )}
          {/* GPS Start button */}
          {hasGreenCoords && !gps?.gpsTracking && (
            <div className="flex gap-2 mt-3">
              <button onClick={handleStartGps}
                className="flex-1 btn-primary rounded-xl py-4 font-display text-lg tracking-wider flex items-center justify-center gap-2">
                📡 {t('beginHoleGps')}
              </button>
              <button onClick={(e) => { e.stopPropagation(); gps.startSimulation(52.338813477839146, 4.655211160362996); onClose(); }}
                className="flex-1 bg-yellow-500/20 border border-yellow-400/30 rounded-xl py-4 font-body text-sm text-yellow-300 hover:bg-yellow-500/30 transition flex items-center justify-center gap-1">
                🧪 Test
              </button>
            </div>
          )}
          {!hasGreenCoords && (
            <button onClick={onClose}
              className="w-full mt-3 btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
              {t('beginHole')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
