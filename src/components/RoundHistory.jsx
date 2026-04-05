import React, { useState, useRef } from 'react';
import { ChevronLeft, Edit2, Check, X, Thermometer, Clock, Flag } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
}

export default function RoundHistory({ roundData, convertDistance, getUnitLabel, onBack, onSaveRound }) {
  const [holes, setHoles] = useState(() => JSON.parse(JSON.stringify(roundData.holes || [])));
  const [editingHole, setEditingHole] = useState(null);
  const [editScore, setEditScore] = useState(0);
  const [editPutts, setEditPutts] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [originalPutts, setOriginalPutts] = React.useState(0);

  const openEdit = (hole) => {
    setEditingHole(hole.hole);
    const nonPuttShots = (hole.shots || []).filter(s => s.club !== 'Putter' && s.club !== 'Strafslag').length;
    const penalties = (hole.shots || []).filter(s => s.club === 'Strafslag').reduce((sum, s) => sum + (s.penaltyStrokes || 0), 0);
    setEditPutts(hole.putts || 0);
    setEditScore(nonPuttShots + (hole.putts || 0) + penalties);
    setOriginalPutts(hole.putts || 0);
  };

  const holesRef = React.useRef(holes);
  React.useEffect(() => { holesRef.current = holes; }, [holes]);

  const confirmEdit = () => {
    const updated = holesRef.current.map(h => {
      if (Number(h.hole) !== Number(editingHole)) return h;
      // Score = niet-putt slagen + putts
      const nonPuttShots = (h.shots || []).filter(s => s.club !== 'Putter' && s.club !== 'Strafslag').length;
      const penalties = (h.shots || []).filter(s => s.club === 'Strafslag').reduce((sum, s) => sum + (s.penaltyStrokes || 0), 0);
      const newScore = nonPuttShots + editPutts + penalties;
      const par = h.par;
      const si = h.stroke_index_men || h.si || null;
      const hcp = h.handicapSnapshot || holesRef.current.find(x => x.handicapSnapshot)?.handicapSnapshot || null;
      let stablefordPts = h.stablefordPts ?? null;
      if (par && hcp) {
        const playingHcp = h.playingHcp ?? Math.round(hcp / 2);
        const extra = si && si <= playingHcp ? 1 : 0;
        const net = newScore - par - extra;
        stablefordPts = Math.max(0, 2 - net);
      }
      return { ...h, score: newScore, putts: editPutts, stablefordPts };
    });
    holesRef.current = updated;
    setHoles([...updated]);
    setEditingHole(null);
    setHasChanges(true);
  };

  const handleSaveRound = async () => {
    const updatedRound = { ...roundData, holes: holesRef.current };
    if (onSaveRound) await onSaveRound(updatedRound);
    // Forceer scherm refresh door kort terug te gaan en opnieuw te laden
    setHasChanges(false);
    setSaveSuccess(true);
  };

  const totalScore = holes.reduce((s, h) => s + (h.score || 0), 0);
  const totalPutts = holes.reduce((s, h) => s + (h.putts || 0), 0);
  const totalStableford = holes.reduce((s, h) => s + (h.stablefordPts || 0), 0);
  const handicap = holes.find(h => h.handicapSnapshot)?.handicapSnapshot ?? null;

  return (
    <div className="min-h-screen pb-6">

      {/* Edit Modal */}
      {editingHole !== null && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
          <div className="glass-card rounded-3xl p-6 max-w-sm w-full border border-emerald-400/30">
            <div className="flex items-center justify-between mb-6">
              <div className="font-display text-2xl text-emerald-300">Hole {editingHole} aanpassen</div>
              <button onClick={() => setEditingHole(null)}><X className="w-5 h-5 text-white/50" /></button>
            </div>
            <div className="space-y-6">
              <div>
                <div className="font-body text-xs text-emerald-200/70 uppercase tracking-wider mb-1">Score (automatisch berekend)</div>
                <div className="text-center py-3">
                  <div className="font-display text-5xl text-white/50">{editScore}</div>
                  <div className="font-body text-xs text-emerald-200/40 mt-1">slagen buiten green + putts</div>
                </div>
              </div>
              <div>
                <div className="font-body text-xs text-emerald-200/70 uppercase tracking-wider mb-3">Putts</div>
                <div className="flex items-center gap-4 justify-center">
                  <button onClick={() => { const np = Math.max(0, editPutts - 1); setEditScore(s => s - editPutts + np); setEditPutts(np); }}
                    className="w-14 h-14 rounded-xl bg-white/10 font-display text-3xl text-white hover:bg-white/20 active:bg-white/30 transition">−</button>
                  <div className="font-display text-6xl text-white w-20 text-center">{editPutts}</div>
                  <button onClick={() => { const np = editPutts + 1; setEditScore(s => s - editPutts + np); setEditPutts(np); }}
                    className="w-14 h-14 rounded-xl bg-white/10 font-display text-3xl text-white hover:bg-white/20 active:bg-white/30 transition">+</button>
                </div>
              </div>
            </div>
            <button onClick={confirmEdit}
              className="w-full mt-6 btn-primary rounded-xl py-4 font-display text-xl tracking-wider flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Opslaan
            </button>
          </div>
        </div>
      )}

      {/* Header */}
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
              <div className="font-display text-4xl text-white">{totalScore}</div>
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
            <div className="font-display text-2xl text-white">{totalScore}</div>
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
              <div key={`${hole.hole}-${hole.score}-${hole.putts}`} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-display text-xl text-emerald-300">Hole {hole.hole}</div>
                    <span className="font-body text-xs text-white/40">
                      {[
                        hole.par ? `Par ${hole.par}` : null,
                        hole.stroke_index_men ? `SI ${hole.stroke_index_men}` : null,
                        hole.playingHcp != null && hole.stroke_index_men ? `${hole.stroke_index_men <= hole.playingHcp ? '1 slag mee' : '0 slagen mee'}` : null,
                        `Aantal slagen: ${hole.score}`
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {hole.stablefordPts != null && hole.stablefordPts > 0 && (
                      <div className="font-display text-lg text-yellow-300">{hole.stablefordPts}PT</div>
                    )}
                    {hole.stablefordPts === 0 && (
                      <div className="font-display text-lg text-white/30">0PT</div>
                    )}
                    <button onClick={() => openEdit(hole)}
                      className="p-2 rounded-lg hover:bg-white/10 transition">
                      <Edit2 className="w-4 h-4 text-emerald-400/60" />
                    </button>
                  </div>
                </div>
                {hole.shots && hole.shots.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {hole.shots.filter(s => s.club !== 'Putter').map((shot) => (
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
                    {hole.putts > 0 && (
                      <div className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-emerald-300">{hole.shots.filter(s => s.club !== 'Putter').length + 1}.</span>
                          <span className="font-body text-white">Putter</span>
                          <span className="font-body text-white/40">green</span>
                        </div>
                        <span className="font-body text-emerald-200/50">{hole.putts} putt{hole.putts !== 1 ? 's' : ''}</span>
                      </div>
                    )}
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
