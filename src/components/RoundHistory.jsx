import React, { useState } from 'react';
import { ChevronLeft, Edit2, Check, X, Thermometer, Clock, Flag } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
}

function HoleEditModal({ hole, holeInfo, onSave, onClose }) {
  const [score, setScore] = useState(hole.score || 0);
  const [putts, setPutts] = useState(hole.putts || 0);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="glass-card rounded-3xl p-6 max-w-sm w-full border border-emerald-400/30" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="font-display text-2xl text-emerald-300">Hole {hole.hole} aanpassen</div>
          <button onClick={onClose}><X className="w-5 h-5 text-white/50" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="font-body text-xs text-emerald-200/70 uppercase tracking-wider mb-2">Score (totaal slagen)</div>
            <div className="flex items-center gap-4 justify-center">
              <button onClick={() => setScore(s => Math.max(1, s - 1))}
                className="w-12 h-12 rounded-xl bg-white/10 font-display text-2xl text-white hover:bg-white/20 transition">−</button>
              <div className="font-display text-5xl text-white w-16 text-center">{score}</div>
              <button onClick={() => setScore(s => s + 1)}
                className="w-12 h-12 rounded-xl bg-white/10 font-display text-2xl text-white hover:bg-white/20 transition">+</button>
            </div>
            {holeInfo && <div className="text-center font-body text-xs text-emerald-200/50 mt-1">Par {holeInfo.par}</div>}
          </div>

          <div>
            <div className="font-body text-xs text-emerald-200/70 uppercase tracking-wider mb-2">Putts</div>
            <div className="flex items-center gap-4 justify-center">
              <button onClick={() => setPutts(p => Math.max(0, p - 1))}
                className="w-12 h-12 rounded-xl bg-white/10 font-display text-2xl text-white hover:bg-white/20 transition">−</button>
              <div className="font-display text-5xl text-white w-16 text-center">{putts}</div>
              <button onClick={() => setPutts(p => p + 1)}
                className="w-12 h-12 rounded-xl bg-white/10 font-display text-2xl text-white hover:bg-white/20 transition">+</button>
            </div>
          </div>
        </div>

        <button onClick={() => onSave({ ...hole, score, putts })}
          className="w-full mt-6 btn-primary rounded-xl py-4 font-display text-xl tracking-wider flex items-center justify-center gap-2">
          <Check className="w-5 h-5" /> Opslaan
        </button>
      </div>
    </div>
  );
}

export default function RoundHistory({ roundData, convertDistance, getUnitLabel, onBack, onSaveRound }) {
  const [editingHole, setEditingHole] = useState(null);
  const [holes, setHoles] = useState(roundData.holes || []);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const totalScore = holes.reduce((s, h) => s + (h.score || 0), 0);
  const totalPutts = holes.reduce((s, h) => s + (h.putts || 0), 0);
  const totalStableford = holes.reduce((s, h) => s + (h.stablefordPts || 0), 0);
  const handicap = holes.find(h => h.handicapSnapshot)?.handicapSnapshot || roundData.handicapSnapshot || null;

  const handleSaveHole = (updatedHole) => {
    // Herbereken stableford voor deze hole als we par en handicap weten
    const par = updatedHole.par;
    const si = updatedHole.stroke_index_men || updatedHole.si || null;
    const hcp = updatedHole.handicapSnapshot || roundData.holes?.find(h => h.handicapSnapshot)?.handicapSnapshot || null;
    if (par && si && hcp) {
      const playingHcp = Math.round(hcp / 2);
      const extra = si <= playingHcp ? 1 : 0;
      const net = updatedHole.score - par - extra;
      updatedHole.stablefordPts = Math.max(0, 2 - net);
    }
    const newHoles = holes.map(h => h.hole === updatedHole.hole ? updatedHole : h);
    setHoles(newHoles);
    setHasChanges(true);
    setEditingHole(null);
  };

  const handleSaveRound = async () => {
    if (onSaveRound) await onSaveRound({ ...roundData, holes });
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="animate-slide-up min-h-screen pb-6">
      {editingHole && (
        <HoleEditModal
          hole={editingHole}
          onSave={handleSaveHole}
          onClose={() => setEditingHole(null)}
        />
      )}

      <div className="p-6 flex items-center justify-between">
        <button onClick={onBack} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="font-display text-2xl">{roundData.course?.name}</h1>
        {saveSuccess ? (
          <div className="bg-emerald-600 rounded-xl px-3 py-2 font-body text-xs text-white flex items-center gap-1">
            <Check className="w-3 h-3" /> Opgeslagen!
          </div>
        ) : hasChanges ? (
          <button onClick={handleSaveRound}
            className="bg-emerald-500 rounded-xl px-3 py-2 font-body text-xs text-white flex items-center gap-1">
            <Check className="w-3 h-3" /> Opslaan
          </button>
        ) : <div className="w-16" />}
      </div>

      <div className="px-6 space-y-4">
        {/* Ronde info */}
        <div className="glass-card rounded-2xl p-5 bg-emerald-500/10 border border-emerald-400/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display text-4xl text-white">{totalScore} <span className="text-2xl text-emerald-300/60">sl</span></div>
              <div className="font-body text-xs text-emerald-200/60">Totaal slagen</div>
            </div>
            {totalStableford > 0 && (
              <div className="text-right">
                <div className="font-display text-4xl text-yellow-300">{totalStableford}</div>
                <div className="font-body text-xs text-yellow-200/50">Stableford punten</div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Flag className="w-3 h-3 text-emerald-400" />
              <span className="font-body text-xs text-emerald-200/70">{roundData.loop?.name || roundData.loop || 'Onbekend'}</span>
            </div>
            {roundData.teeColor && (
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${roundData.teeColor === 'geel' ? 'bg-yellow-400' : roundData.teeColor === 'wit' ? 'bg-white' : roundData.teeColor === 'rood' ? 'bg-red-400' : roundData.teeColor === 'blauw' ? 'bg-blue-400' : 'bg-gray-400'}`} />
                <span className="font-body text-xs text-emerald-200/70 capitalize">{roundData.teeColor}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span className="font-body text-xs text-emerald-200/70">{formatDate(roundData.date)}{roundData.startTime ? ` · ${roundData.startTime}` : ''}</span>
            </div>
            {roundData.temperature && (
              <div className="flex items-center gap-2">
                <Thermometer className="w-3 h-3 text-emerald-400" />
                <span className="font-body text-xs text-emerald-200/70">{roundData.temperature}°C</span>
              </div>
            )}
            {handicap !== null && (
              <div className="flex items-center gap-2 col-span-2">
                <span className="font-body text-xs text-emerald-200/50">HCP op dat moment: {handicap}</span>
              </div>
            )}
          </div>
        </div>

        {/* Totalen */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="font-display text-2xl text-white">{totalScore} <span className="text-base text-emerald-300/60">sl</span></div>
            <div className="font-body text-xs text-emerald-200/50">Slagen</div>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="font-display text-2xl text-white">{totalPutts}</div>
            <div className="font-body text-xs text-emerald-200/50">Putts</div>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="font-display text-2xl text-yellow-300">{totalStableford || '-'}</div>
            <div className="font-body text-xs text-emerald-200/50">Punten</div>
          </div>
        </div>

        {/* Holes */}
        <div className="space-y-2">
          {holes.map((hole) => {
            const scoreToPar = hole.score && hole.par ? hole.score - hole.par : null;
            return (
              <div key={hole.hole} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-display text-xl text-emerald-300 w-16">Hole {hole.hole}</div>
                    <div className={`font-display text-2xl ${scoreToPar < 0 ? 'text-emerald-300' : scoreToPar === 0 ? 'text-white' : 'text-red-300'}`}>
                      {hole.score}
                    </div>
                    {scoreToPar !== null && (
                      <div className="font-body text-xs text-white/40">
                        {scoreToPar > 0 ? `+${scoreToPar}` : scoreToPar < 0 ? scoreToPar : 'Par'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {hole.stablefordPts !== null && hole.stablefordPts !== undefined && (
                      <div className="font-display text-lg text-yellow-300">{hole.stablefordPts}pt</div>
                    )}
                    <div className="font-body text-xs text-emerald-200/50">{hole.putts}p</div>
                    <button onClick={() => setEditingHole(hole)}
                      className="p-2 rounded-lg hover:bg-white/10 transition">
                      <Edit2 className="w-4 h-4 text-emerald-400/60" />
                    </button>
                  </div>
                </div>

                {/* Slagen detail */}
                {hole.shots && hole.shots.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {hole.shots.map((shot) => (
                      <div key={shot.shotNumber} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-emerald-300">{shot.shotNumber}.</span>
                          <span className="font-body text-white">{shot.club}</span>
                          {shot.lie && shot.lie !== 'tee' && (
                            <span className="font-body text-white/40">{shot.lie}</span>
                          )}
                        </div>
                        {shot.distancePlayed > 0 && (
                          <span className="font-body text-emerald-300">{convertDistance(shot.distancePlayed)}{getUnitLabel()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
