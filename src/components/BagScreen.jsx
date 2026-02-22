import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { ALL_CLUBS } from '../lib/constants';

export default function BagScreen({ settings, setSettings, showBagLimitWarning, onBack }) {
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
      setSettings({ ...settings, bag: bag.filter(c => c !== club) });
    } else {
      if (bag.length >= 14) return; // warning handled in parent
      setSettings({ ...settings, bag: [...bag, club] });
    }
  };

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
          <button onClick={() => setSettings({ ...settings, bag: [] })}
            className="w-full btn-secondary rounded-xl py-3 font-body text-sm">
            🗑️ {tr('clearBag')}
          </button>
        )}

        <div>
          <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
            Selecteer je clubs
          </label>
          <div className="grid grid-cols-2 gap-3">
            {ALL_CLUBS.map((club) => {
              const isSelected = settings.bag.includes(club);
              return (
                <button key={club} onClick={() => toggleClub(club)}
                  className={'rounded-xl py-4 px-3 font-body font-medium transition border-2 ' +
                    (isSelected
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/50 transform scale-105'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/15')}>
                  {isSelected && '✓ '}{club}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={onBack} className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
          KLAAR
        </button>
      </div>
    </div>
  );
}
