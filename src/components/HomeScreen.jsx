import React from 'react';
import { Plus, TrendingUp, BarChart3, Calendar, MapPin, Settings, Home } from 'lucide-react';

export default function HomeScreen({
  settings, round, courseData, weather, userLocation, setUserLocation,
  showSearch, setShowSearch, searchQuery, setSearchQuery, filteredCourses,
  getNearbyCoursesSimulated, resetToHome, startRound, getTeeColorClass, t,
  user, gps,
  onSettings, onAllStats, onClubs, onRoundHistory, onLogout, onAdmin
}) {
  return (
    <div className="animate-slide-up">
      <div className="p-6 pt-12">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="font-display text-6xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">{t('golfStats')}</h1>
            <p className="font-body text-emerald-200/70 text-sm">{t('tagline')}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onAllStats} className="glass-card p-3 rounded-xl hover:bg-white/15 transition"><BarChart3 className="w-6 h-6 text-emerald-400" /></button>
            {onAdmin && <button onClick={onAdmin} className="glass-card p-3 rounded-xl hover:bg-white/15 transition"><span className="text-emerald-400 text-xl">👑</span></button>}
            <button onClick={onSettings} className="glass-card p-3 rounded-xl hover:bg-white/15 transition"><Settings className="w-6 h-6 text-emerald-400" /></button>
            {onLogout && <button onClick={onLogout} className="glass-card p-3 rounded-xl hover:bg-white/15 transition"><span className="text-red-400 text-xl">🚪</span></button>}
          </div>
        </div>
      </div>

      <div className="px-6 mt-8">
        {/* Saved Rounds - button only */}
        {round.savedRounds.length > 0 && (
          <button onClick={() => onRoundHistory(null)}
            className="w-full glass-card rounded-2xl p-5 mb-6 flex items-center justify-between hover:bg-white/10 transition">
            <div className="flex items-center gap-4">
              <BarChart3 className="w-8 h-8 text-emerald-400" />
              <div className="font-display text-2xl">{t('myRounds').toUpperCase()}</div>
            </div>
            <span className="text-emerald-200/50 text-xl">›</span>
          </button>
        )}

        {/* New Round Card */}
        <div className="glass-card rounded-3xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-3xl mb-1">{t('newRound').toUpperCase()}</h2>
              <p className="font-body text-emerald-200/60 text-sm">{t('startTracking')}</p>
            </div>
            <div className="flex gap-2">
              {(round.roundData.course || userLocation || showSearch) && (
                <button onClick={resetToHome} className="p-3 rounded-xl hover:bg-white/10 transition"><Home className="w-6 h-6 text-emerald-400" /></button>
              )}
              <Plus className="w-12 h-12 text-emerald-400" />
            </div>
          </div>

          <div className="space-y-4">
            {/* Location / Search buttons */}
            {!userLocation && !round.roundData.course && !showSearch && (
              <div className="space-y-3">
                <button onClick={getNearbyCoursesSimulated} disabled={courseData.nearbyCoursesLoading}
                  className="w-full btn-primary rounded-xl py-4 font-body font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  <MapPin className="w-5 h-5" />{courseData.nearbyCoursesLoading ? 'Zoeken...' : 'Vind banen in de buurt'}
                </button>
                <button onClick={() => setShowSearch(true)} className="w-full btn-secondary rounded-xl py-4 font-body font-medium">
                  Zoek op naam of plaats
                </button>
              </div>
            )}

            {/* Search Input */}
            {showSearch && !round.roundData.course && (
              <div className="space-y-3 animate-slide-up">
                <div className="relative">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value.trimStart())}
                    placeholder="Zoek baan of plaats..." autoFocus
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300">✕</button>}
                </div>
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="w-full btn-secondary rounded-xl py-3 font-body text-sm">
                  Gebruik locatie in plaats daarvan
                </button>
              </div>
            )}

            {/* Course List */}
            {((userLocation && !round.roundData.course) || (showSearch && searchQuery)) && (
              <div className="space-y-3 animate-slide-up">
                <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">
                  {showSearch ? `${filteredCourses.length} banen gevonden` : 'Banen bij jou in de buurt'}
                </label>
                {filteredCourses.length === 0 && showSearch && (
                  <div className="glass-card rounded-xl p-6 text-center"><div className="font-body text-emerald-200/60">Geen banen gevonden voor "{searchQuery}"</div></div>
                )}
                {filteredCourses.map((course) => (
                  <button key={course.id} onClick={() => { round.setRoundData({ ...round.roundData, course }); setShowSearch(false); setSearchQuery(''); }}
                    className="w-full glass-card rounded-xl p-4 text-left hover:bg-white/15 transition group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-body font-semibold text-white group-hover:text-emerald-300 transition">{course.name}</div>
                        <div className="font-body text-xs text-emerald-200/60 mt-1">{course.city}</div>
                      </div>
                      {!showSearch && <div className="font-display text-xl text-emerald-400">{course.distance}km</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Loop Selection */}
            {round.roundData.course && !round.roundData.loop && (
              <div className="space-y-3 animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-body font-semibold text-emerald-300 text-lg">{round.roundData.course.name}</div>
                    <div className="font-body text-xs text-emerald-200/60">{round.roundData.course.city}</div>
                  </div>
                  <button onClick={() => round.setRoundData({ ...round.roundData, course: null })} className="font-body text-xs text-emerald-300 hover:text-emerald-200">Wijzigen</button>
                </div>
                <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">Welke lus speel je?</label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {round.roundData.course.loops.filter(l => !l.isFull).map((loop) => (
                    <button key={loop.id} onClick={async () => {
                      const tees = await courseData.fetchAvailableTees(round.roundData.course.name, loop.name);
                      round.setRoundData({ ...round.roundData, loop, availableTees: tees || round.roundData.course.teeColors });
                    }} className="glass-card rounded-xl p-4 text-center hover:bg-white/15 transition group overflow-hidden">
                      <div className="font-display text-2xl text-emerald-300 group-hover:text-emerald-200 transition mb-1 truncate uppercase">{loop.name}</div>
                      <div className="font-body text-xs text-emerald-200/60">9 holes</div>
                    </button>
                  ))}
                </div>
                {round.roundData.course.loops.filter(l => l.isFull).length > 0 && (
                  <>
                    <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider mt-4">Of kies een combinatie (18 holes)</label>
                    <select onChange={async (e) => {
                      const selectedLoop = round.roundData.course.loops.find(l => l.id === e.target.value);
                      if (selectedLoop) {
                        const firstLoopId = selectedLoop.id.split('-')[0];
                        const tees = await courseData.fetchAvailableTees(round.roundData.course.name, firstLoopId);
                        round.setRoundData({ ...round.roundData, loop: selectedLoop, availableTees: tees || round.roundData.course.teeColors });
                      }
                    }} defaultValue=""
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 font-body text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition appearance-none cursor-pointer"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%2310b981\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8 12L2 6h12z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
                      <option value="" disabled style={{ background: '#1a3a2a', color: '#999' }}>Selecteer een 18-holes combinatie...</option>
                      {round.roundData.course.loops.filter(l => l.isFull).map((loop) => (
                        <option key={loop.id} value={loop.id} style={{ background: '#1a3a2a', color: 'white' }}>{loop.name} (18 holes)</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}

            {/* Tee Color */}
            {round.roundData.course && round.roundData.loop && !round.roundData.teeColor && (
              <div className="space-y-3 animate-slide-up">
                <div className="glass-card rounded-xl p-4 bg-emerald-500/10 border-emerald-400/30 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-body font-semibold text-white">{round.roundData.course.name}</div>
                      <div className="font-body text-xs text-emerald-200/70 mt-1">{round.roundData.loop.name}</div>
                    </div>
                    <button onClick={() => round.setRoundData({ ...round.roundData, loop: null })} className="font-body text-xs text-emerald-300 hover:text-emerald-200">Wijzigen</button>
                  </div>
                </div>
                <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">Van welke tee speel je?</label>
                <div className="grid grid-cols-2 gap-3">
                  {(round.roundData.availableTees || round.roundData.course.teeColors || ['Wit']).map((color) => (
                    <button key={color} onClick={() => round.setRoundData({ ...round.roundData, teeColor: color })}
                      className={`${getTeeColorClass(color)} rounded-xl py-5 font-body font-bold text-lg hover:scale-105 transition shadow-lg`}>
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date/Time/Start */}
            {round.roundData.course && round.roundData.loop && round.roundData.teeColor && (
              <div className="space-y-3 animate-slide-up">
                <div className="glass-card rounded-xl p-3 bg-emerald-500/10 border-emerald-400/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-body font-semibold text-white text-sm">{round.roundData.course.name}</div>
                      <div className="font-body text-xs text-emerald-200/70">{round.roundData.loop.name} • <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTeeColorClass(round.roundData.teeColor)}`}>{round.roundData.teeColor}</span></div>
                    </div>
                    <button onClick={() => round.setRoundData({ ...round.roundData, teeColor: null })} className="font-body text-xs text-emerald-300 hover:text-emerald-200">Wijzigen</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <label className="font-body text-xs text-emerald-200/70 mb-1 block uppercase tracking-wider">Datum</label>
                    <input type="date" value={round.roundData.date} onChange={(e) => round.setRoundData({ ...round.roundData, date: e.target.value })}
                      className="w-full min-w-0 box-border overflow-hidden bg-white/10 border border-white/20 rounded-xl px-2 py-3 font-body text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 transition h-[42px]" />
                  </div>
                  <div className="min-w-0">
                    <label className="font-body text-xs text-emerald-200/70 mb-1 block uppercase tracking-wider">Tijd</label>
                    <input type="time" value={round.roundData.startTime} onChange={(e) => round.setRoundData({ ...round.roundData, startTime: e.target.value })}
                      className="w-full min-w-0 box-border overflow-hidden bg-white/10 border border-white/20 rounded-xl px-1 py-3 font-body text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 transition h-[42px]" />
                  </div>
                  <div className="min-w-0">
                    <label className="font-body text-xs text-emerald-200/70 mb-1 block uppercase tracking-wider">°C</label>
                    <input type="number" value={round.roundData.temperature || ''} onChange={(e) => round.setRoundData({ ...round.roundData, temperature: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder={weather.fetchingWeather ? '...' : '18'} disabled={weather.fetchingWeather}
                      className="w-full min-w-0 box-border overflow-hidden bg-white/10 border border-white/20 rounded-xl px-2 py-3 font-body text-white text-xs placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition disabled:opacity-50 text-center h-[42px]" />
                  </div>
                </div>
                {/* GPS / Manual buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { round.setRoundData({ ...round.roundData, gpsMode: true }); startRound(); }}
                    className="btn-primary rounded-xl py-4 font-display text-base tracking-wider flex items-center justify-center gap-2">
                    📡 GPS
                  </button>
                  <button onClick={() => { round.setRoundData({ ...round.roundData, gpsMode: false }); startRound(); }}
                    className="btn-secondary rounded-xl py-4 font-display text-base tracking-wider flex items-center justify-center gap-2 border border-white/20">
                    ✏️ HANDMATIG
                  </button>
                </div>
                {/* Test button - alleen voor cefas */}
                {user?.email?.toLowerCase() === 'cefas@golfstats.nl' && (
                  <button onClick={() => { round.setRoundData({ ...round.roundData, gpsMode: 'test' }); startRound(); }}
                    className="w-full bg-yellow-500/20 border border-yellow-400/30 rounded-xl py-3 font-body text-sm text-yellow-300 hover:bg-yellow-500/30 transition flex items-center justify-center gap-1">
                    🧪 Test modus (GPS simulatie)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {!userLocation && !round.roundData.course && (
          <div className="grid grid-cols-2 gap-4">
            <button onClick={onAllStats} className="glass-card rounded-2xl p-6 text-left hover:bg-white/10 transition">
              <TrendingUp className="w-8 h-8 text-emerald-400 mb-3" />
              <div className="font-display text-2xl">{settings.handicap || '--'}</div>
              <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">Handicap</div>
            </button>
            <button onClick={onClubs} className="glass-card rounded-2xl p-6 text-left hover:bg-white/10 transition">
              <BarChart3 className="w-8 h-8 text-teal-400 mb-3" />
              <div className="font-display text-2xl">{round.savedRounds.length}</div>
              <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">Rondes</div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
