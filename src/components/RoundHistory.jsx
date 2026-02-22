import React from 'react';
import { ChevronLeft } from 'lucide-react';

export default function RoundHistory({ roundData, convertDistance, getUnitLabel, onBack }) {
  const Dist = ({ value }) => `${convertDistance(value)} ${getUnitLabel()}`;

  return (
    <div className="animate-slide-up min-h-screen pb-6">
      <div className="p-6 flex items-center justify-between">
        <button onClick={onBack} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="font-display text-2xl">{roundData.course?.name}</h1>
        <div className="w-10" />
      </div>

      <div className="px-6 space-y-6">
        <div className="glass-card rounded-2xl p-6 text-center bg-emerald-500/10 border-emerald-400/30">
          <div className="font-body text-xs text-emerald-200/70 mb-2">{roundData.loop?.name}</div>
          <div className="font-display text-6xl text-white mb-2">
            {roundData.holes.reduce((sum, h) => sum + (h.score || 0), 0)}
          </div>
          <div className="font-body text-sm text-emerald-200/60">{roundData.date}</div>
        </div>

        <div className="space-y-3">
          {roundData.holes.map((hole, index) => (
            <div key={index} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-2xl text-emerald-300">HOLE {hole.hole}</div>
                <div className="font-display text-3xl text-white">{hole.score}</div>
              </div>
              {hole.shots && hole.shots.length > 0 && (
                <div className="space-y-2 mb-3">
                  {hole.shots.map((shot) => (
                    <div key={shot.shotNumber} className="flex items-center justify-between text-sm bg-white/5 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-emerald-300">{shot.shotNumber}.</span>
                        <span className="font-body">{shot.club}</span>
                      </div>
                      <div className="font-display text-emerald-300">{Dist({ value: shot.distancePlayed })}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="font-body text-emerald-200/60">Putts:</span>
                <span className="font-body text-white">{hole.putts || 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
