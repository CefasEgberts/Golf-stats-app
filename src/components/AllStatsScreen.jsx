import React from 'react';
import { ChevronLeft } from 'lucide-react';

export default function AllStatsScreen({ savedRounds, settings, onBack }) {
  return (
    <div className="animate-slide-up min-h-screen pb-6">
      <div className="p-6 flex items-center justify-between">
        <button onClick={onBack} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="font-display text-3xl">STATISTIEKEN</h1>
        <div className="w-10" />
      </div>
      <div className="px-6 space-y-6">
        {savedRounds.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <div className="font-display text-2xl text-emerald-300 mb-2">Nog geen data</div>
            <div className="font-body text-emerald-200/60">Speel eerst een ronde om statistieken te zien</div>
          </div>
        ) : (
          <>
            <div className="glass-card rounded-3xl p-8 text-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/30">
              <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">{settings.name || 'Jouw Stats'}</div>
              <div className="font-display text-7xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">{settings.handicap || '--'}</div>
              <div className="font-body text-emerald-200/60 text-sm">Handicap</div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="font-body text-emerald-200/70 text-sm">{savedRounds.length} rondes gespeeld</div>
              </div>
            </div>
            <div className="space-y-2">
              {savedRounds.slice(0, 5).map((r, index) => (
                <div key={index} className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-body font-semibold text-white">{r.course?.name}</div>
                    <div className="font-body text-xs text-emerald-200/60">{r.date}</div>
                  </div>
                  <div className="font-display text-3xl text-emerald-300">{r.holes.reduce((s, h) => s + (h.score || 0), 0)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
