import React from 'react';
import { ChevronLeft } from 'lucide-react';

export default function SettingsScreen({ settings, setSettings, appVersion, onSave, onBag }) {
  const tr = (key) => {
    const map = {
      nl: { settings: 'Instellingen', name: 'Voornaam', units: 'Eenheden', meters: 'Meters', yards: 'Yards', language: 'Taal', save: 'Opslaan', handicap: 'Handicap', myBag: 'Wat zit er in mijn tas?' },
      en: { settings: 'Settings', name: 'First name', units: 'Units', meters: 'Meters', yards: 'Yards', language: 'Language', save: 'Save', handicap: 'Handicap', myBag: "What's in my bag?" }
    };
    return map[settings.language]?.[key] || key;
  };

  return (
    <div className="animate-slide-up">
      <div className="p-6 flex items-center justify-between">
        <button onClick={() => onSave()} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
        <div className="text-center">
          <h1 className="font-display text-3xl">{tr('settings').toUpperCase()}</h1>
          <div className="font-body text-xs text-emerald-300/60 mt-1">{appVersion}</div>
        </div>
        <div className="w-10" />
      </div>

      <div className="px-6 space-y-6">
        {/* Naam */}
        <div className="glass-card rounded-2xl p-6">
          <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{tr('name')}</label>
          <input type="text" value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            placeholder="Bijv. Jan"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
        </div>

        {/* Thuisstad */}
        <div className="glass-card rounded-2xl p-6">
          <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">THUISSTAD</label>
          <input type="text" value={settings.homeCity}
            onChange={(e) => setSettings({ ...settings, homeCity: e.target.value })}
            placeholder="Bijv. Amsterdam"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
          <div className="mt-3 font-body text-xs text-emerald-200/60">
            Wordt gebruikt als startpunt voor zoeken als je locatie niet beschikbaar is.
          </div>
        </div>

        {/* Eenheden */}
        <div className="glass-card rounded-2xl p-6">
          <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{tr('units')}</label>
          <div className="grid grid-cols-2 gap-3">
            {['meters', 'yards'].map(u => (
              <button key={u} onClick={() => setSettings({ ...settings, units: u })}
                className={'rounded-xl py-4 font-body font-medium transition ' +
                  (settings.units === u ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 text-white hover:bg-white/15')}>
                {tr(u)}
              </button>
            ))}
          </div>
        </div>

        {/* Taal */}
        <div className="glass-card rounded-2xl p-6">
          <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{tr('language')}</label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setSettings({ ...settings, language: 'nl' })}
              className={'rounded-xl py-4 font-body font-medium transition ' +
                (settings.language === 'nl' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 text-white hover:bg-white/15')}>
              🇳🇱 Nederlands
            </button>
            <button onClick={() => setSettings({ ...settings, language: 'en' })}
              className={'rounded-xl py-4 font-body font-medium transition ' +
                (settings.language === 'en' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 text-white hover:bg-white/15')}>
              🇬🇧 English
            </button>
          </div>
        </div>

        {/* Handicap */}
        <div className="glass-card rounded-2xl p-6">
          <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{tr('handicap')}</label>
          <input type="number" step="0.1" value={settings.handicap || ''}
            onChange={(e) => setSettings({ ...settings, handicap: parseFloat(e.target.value) || null })}
            placeholder="bijv. 13.5"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
        </div>

        {/* Geslacht */}
        <div className="glass-card rounded-2xl p-6">
          <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
            {settings.language === 'nl' ? 'GESLACHT' : 'GENDER'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setSettings({ ...settings, gender: 'man' })}
              className={'rounded-xl py-4 font-body font-medium transition ' +
                (settings.gender === 'man' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 text-white hover:bg-white/15')}>
              {settings.language === 'nl' ? 'Man' : 'Male'}
            </button>
            <button onClick={() => setSettings({ ...settings, gender: 'vrouw' })}
              className={'rounded-xl py-4 font-body font-medium transition ' +
                (settings.gender === 'vrouw' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 text-white hover:bg-white/15')}>
              {settings.language === 'nl' ? 'Vrouw' : 'Female'}
            </button>
          </div>
          <div className="mt-3 font-body text-xs text-emerald-200/60">
            {settings.language === 'nl' ? 'I.v.m. handicapberekening a.d.h.v. baanhandicaptabel' : 'For course handicap calculation based on handicap table'}
          </div>
        </div>

        <button onClick={onBag} className="w-full btn-secondary rounded-xl py-4 font-display text-xl tracking-wider">
          ⛳ {tr('myBag').toUpperCase()}{settings.bag.length > 0 && ` (${settings.bag.length}/14)`}
        </button>

        <button onClick={onSave} className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
          {tr('save').toUpperCase()}
        </button>
      </div>
    </div>
  );
}
