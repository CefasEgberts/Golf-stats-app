import React from 'react';
import { ChevronLeft, BarChart3 } from 'lucide-react';
import { calculateStablefordForHole, getStrokeIndex } from '../lib/stableford';

export default function StatsScreen({ roundData, allHolesData, courseRating, settings, convertDistance, getUnitLabel, onNewRound, onHome }) {
  const tr = (key) => {
    const map = {
      nl: { newRound: 'NIEUWE RONDE' },
      en: { newRound: 'NEW ROUND' }
    };
    return map[settings.language]?.[key] || key;
  };

  const completedHoles = roundData.holes.filter(h => h.score);
  const totalScore = completedHoles.reduce((sum, h) => sum + parseInt(h.score || 0), 0);
  const totalPutts = completedHoles.reduce((sum, h) => sum + parseInt(h.putts || 0), 0);

  let totalStableford = 0;
  let hasStableford = false;
  completedHoles.forEach(hole => {
    const holeData = allHolesData.find(h => h.hole_number === hole.hole);
    if (holeData && courseRating && settings.handicap) {
      const si = getStrokeIndex(allHolesData, hole.hole, settings.gender);
      const pts = calculateStablefordForHole(hole.score, holeData.par || 4, si, courseRating, settings.handicap);
      if (pts !== null) { totalStableford += pts; hasStableford = true; }
    }
  });

  const Dist = ({ value }) => `${convertDistance(value)} ${getUnitLabel()}`;

  return (
    <div className="animate-slide-up min-h-screen pb-6">
      <div className="p-6 flex items-center justify-between">
        <button onClick={onHome} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="font-display text-3xl">SCOREKAART</h1>
        <div className="w-10" />
      </div>

      <div className="px-6 space-y-6">
        {/* Totaalscore */}
        <div className="glass-card rounded-3xl p-8 text-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/30">
          <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">{roundData.course?.name}</div>
          <div className="font-display text-8xl text-white mb-2">{totalScore}</div>
          <div className="font-body text-sm text-emerald-200/60 mb-4">{roundData.loop?.name} • {roundData.teeColor} tee</div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div>
              <div className="font-display text-2xl text-emerald-300">{completedHoles.length}</div>
              <div className="font-body text-xs text-emerald-200/60">holes</div>
            </div>
            <div>
              <div className="font-display text-2xl text-emerald-300">{totalPutts}</div>
              <div className="font-body text-xs text-emerald-200/60">putts</div>
            </div>
            {hasStableford && (
              <div>
                <div className="font-display text-2xl text-yellow-300">{totalStableford}</div>
                <div className="font-body text-xs text-yellow-200/60">stableford</div>
              </div>
            )}
          </div>
        </div>

        {/* Per hole */}
        <div className="space-y-2">
          {roundData.holes.map((hole) => {
            const holeData = allHolesData.find(h => h.hole_number === hole.hole);
            const par = holeData?.par || 4;
            const scoreToPar = hole.score - par;
            const scoreColor = scoreToPar < 0 ? 'text-emerald-300' : scoreToPar === 0 ? 'text-white' : 'text-red-300';
            const si = holeData ? getStrokeIndex(allHolesData, hole.hole, settings.gender) : null;
            const stbPts = si ? calculateStablefordForHole(hole.score, par, si, courseRating, settings.handicap) : null;

            return (
              <div key={hole.hole} className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/30 rounded-full flex items-center justify-center">
                    <div className="font-display text-xl text-emerald-300">{hole.hole}</div>
                  </div>
                  <div>
                    <div className="font-body text-xs text-emerald-200/60">Par {par}{si ? ` • SI ${si}` : ''}</div>
                    <div className="font-body text-xs text-emerald-200/50">{hole.shots?.length || 0} slagen + {hole.putts} putts</div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  {settings.showScore && stbPts !== null && (
                    <div className="bg-yellow-500/20 rounded-lg px-2 py-1">
                      <div className="font-display text-lg text-yellow-300">{stbPts}</div>
                      <div className="font-body text-[10px] text-yellow-200/60">stb</div>
                    </div>
                  )}
                  <div>
                    <div className={`font-display text-4xl ${scoreColor}`}>{hole.score}</div>
                    <div className="font-body text-xs text-emerald-200/60">
                      {scoreToPar > 0 ? '+' + scoreToPar : scoreToPar < 0 ? scoreToPar : 'E'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={onNewRound} className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
          {tr('newRound').toUpperCase()}
        </button>
      </div>
    </div>
  );
}
