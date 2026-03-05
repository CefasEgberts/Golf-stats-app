import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ALL_CLUBS } from '../lib/constants';

export default function BagScreen({ settings, setSettings, showBagLimitWarning, onBack }) {
  const [editingDistance, setEditingDistance] = useState(null);

  const tr = (key) => {
    const map = {
      nl: { myBag: 'Wat zit er in mijn tas?', bagSubtitle: 'Selecteer maximaal 14 clubs', bagLimitWarning: 'Maximum 14 clubs! Verwijder eerst een club.', clearBag: 'Wis tas' },
      en: { myBag: "What's in my bag?", bagSubtitle: 'Select maximum 14 clubs', bagLimitWarning: 'Maximum 14 clubs! Remove a club first.', clearBag: 'Clear bag' }
    };
    return map[settings.language]?.[key] || key;
  };

  const toggleClub = (club) => {
    const bag = settings.bag;
    if (bag.includes(club)) {
      const newDistances = { ...(settings.clubDistances || {}) };
      delete newDistances[club];
      setSettings({ ...settings, bag: bag.filter(c => c !== club), clubDistances: newDistances });
    } else {
      if (bag.length >= 14) return;
      setSettings({ ...settings, bag: [...bag, club] });
    }
  };

  const setDistance = (club, value) => {
    const dist = parseInt(value);
    const newDistances = { ...(settings.clubDistances || {}) };
    if (!value || isNaN(dist)) {
      delete newDistances[club];
    } else {
      newDistances[club] = dist;
    }
    setSettings({ ...settings, clubDistances: newDistances });
  };

  const clubDistances = settings.clubDistances || {};
  const selectedClubs = ALL_CLUBS.filter(c => settings.bag.includes(c));
  const unselectedClubs = ALL_CLUBS.filter(c => !settings.bag.includes(c));

  return (
    <div className="animate-slide-up min-h-screen pb-6">
      {showBagLimitWarning && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 animate-slide-up">
          <div className="glass-card rounded-3xl p-8 max-w-md border-2 border-red-400/50 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <div className="font-display text-3xl text-red-400 mb-3">MAXIMUM 14 CLUBS!</div>
            <div className="font-body text-white">{tr('bagLimitWarning')}</div>
          </div>
        </div>
      )}

      <div className="p-6 flex items-center justify-between">
        <button onClick={onBack} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="font-display text-3xl">{tr('myBag').toUpperCase()}</h1>
        <div className="w-10" />
      </div>

      <div className="px-6 space-y-6">
        <div className="text-center">
          <div className="font-display text-6xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
            {settings.bag.length} / 14
          </div>
          <div className="font-body text-emerald-200/70 text-sm">{tr('bagSubtitle')}</div>
        </div>

        {settings.bag.length > 0 && (
          <button onClick={() => setSettings({ ...settings, bag: [], clubDistances: {} })}
            className="w-full btn-secondary rounded-xl py-3 font-body text-sm">
            🗑️ {tr('clearBag')}
          </button>
        )}

        {/* Selected clubs with distance input */}
        {selectedClubs.length > 0 && (
          <div>
            <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
              Jouw clubs — vul gemiddelde afstand in
            </label>
            <div className="space-y-2">
              {selectedClubs.map((club) => (
                <div key={club} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 bg-emerald-500/10 border border-emerald-400/30">
                  <button onClick={() => toggleClub(club)} className="text-emerald-400 text-lg w-6 flex-shrink-0">✓</button>
                  <span className="font-body font-medium text-white flex-1">{club}</span>
                  {club !== 'Putter' ? (
                    editingDistance === club ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        defaultValue={clubDistances[club] || ''}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onBlur={(e) => { setDistance(club, e.target.value); setEditingDistance(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { setDistance(club, e.target.value); setEditingDistance(null); } }}
                        className="w-20 bg-white/20 border border-emerald-400/50 rounded-lg px-2 py-1 font-display text-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingDistance(club)}
                        className={'w-20 rounded-lg px-2 py-1 font-display text-lg text-center transition border ' +
                          (clubDistances[club]
                            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                            : 'bg-white/5 border-white/20 text-white/30 hover:bg-white/10')}>
                        {clubDistances[club] ? `${clubDistances[club]}m` : '— m'}
                      </button>
                    )
                  ) : (
                    <span className="w-20 text-center font-body text-xs text-emerald-200/40">n.v.t.</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 font-body text-xs text-emerald-200/40 text-center">
              Tik op de afstand om aan te passen
            </div>
          </div>
        )}

        {/* Unselected clubs */}
        {unselectedClubs.length > 0 && (
          <div>
            <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
              Voeg clubs toe
            </label>
            <div className="grid grid-cols-2 gap-3">
              {unselectedClubs.map((club) => (
                <button key={club} onClick={() => toggleClub(club)}
                  className="rounded-xl py-4 px-3 font-body font-medium transition border-2 bg-white/10 border-white/20 text-white hover:bg-white/15">
                  + {club}
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={onBack} className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
          KLAAR
        </button>
      </div>
    </div>
  );
}
