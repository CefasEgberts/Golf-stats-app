import React, { useState } from 'react';
import { ChevronLeft, Plus, TrendingUp, BarChart3, Calendar, MapPin, Settings, Home } from 'lucide-react';

// Lib
import { TEE_COLOR_CLASSES, CITY_COORDINATES, DEFAULT_BAGS, ALL_CLUBS, FALLBACK_PARS } from './lib/constants';
import { tr } from './lib/translations';
import { calculateDistance } from './lib/gps';
import { calculateStablefordForHole, calculatePlayingHandicap, getStrokeIndex } from './lib/stableford';

// Hooks
import { useCourseData } from './hooks/useCourseData';
import { useWeather } from './hooks/useWeather';
import { useRound } from './hooks/useRound';

// Components
import SplashScreen from './components/SplashScreen';
import SettingsScreen from './components/SettingsScreen';
import BagScreen from './components/BagScreen';
import StatsScreen from './components/StatsScreen';
import RoundHistory from './components/RoundHistory';

// ─── Helpers ────────────────────────────────────────────────────────────────

const commitHash = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local';
const appVersion = `${commitHash} v1.40`;

const getTeeColorClass = (color) =>
  TEE_COLOR_CLASSES[color?.toLowerCase()] || 'bg-white/20 text-white';

// ─── App ────────────────────────────────────────────────────────────────────

export default function GolfStatsApp({ user, profile, onLogout, onAdmin }) {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [userLocation, setUserLocation] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBagLimitWarning, setShowBagLimitWarning] = useState(false);

  // Settings
  const getDefaultBag = () => DEFAULT_BAGS[user?.email?.toLowerCase()] || [];
  const [settings, setSettings] = useState({
    name: profile?.username || profile?.name || 'Golfer',
    units: 'meters',
    language: 'nl',
    handicap: 13.5,
    showScore: false,
    gender: 'man',
    homeCity: 'Amsterdam',
    bag: getDefaultBag()
  });

  React.useEffect(() => {
    if (profile?.username || profile?.name) {
      setSettings(prev => ({ ...prev, name: profile.username || profile.name }));
    }
  }, [profile]);

  // Hooks
  const weather = useWeather();
  const courseData = useCourseData();
  const round = useRound();

  // Convenience aliases
  const t = (key) => tr(settings.language, key);
  const convertDistance = (m) => settings.units === 'yards' ? Math.round(m * 1.09361) : Math.round(m);
  const getUnitLabel = () => settings.units === 'yards' ? 'yard' : 'm';
  const Dist = ({ value }) => `${convertDistance(value)} ${getUnitLabel()}`;

  const clubs = settings.bag.length > 0 ? settings.bag : ALL_CLUBS;

  const toggleClubInBag = (club) => {
    if (settings.bag.includes(club)) {
      setSettings({ ...settings, bag: settings.bag.filter(c => c !== club) });
    } else {
      if (settings.bag.length >= 14) {
        setShowBagLimitWarning(true);
        setTimeout(() => setShowBagLimitWarning(false), 2000);
        return;
      }
      setSettings({ ...settings, bag: [...settings.bag, club] });
    }
  };

  // ── Effects ─────────────────────────────────────────────────────────────

  // Splash: fetch weather + auto-navigate
  React.useEffect(() => {
    if (currentScreen === 'splash') {
      weather.fetchSplashWeather();
      setTimeout(() => setCurrentScreen('home'), 2000);
    }
  }, [currentScreen]);

  // Course weather when round starts
  React.useEffect(() => {
    if (round.roundData.course && round.roundData.temperature === null) {
      const lat = round.roundData.course.lat || 52.3676;
      const lng = round.roundData.course.lng || 4.9041;
      weather.fetchCourseWeather(lat, lng, (temp) =>
        round.setRoundData(prev => ({ ...prev, temperature: temp }))
      );
    }
  }, [round.roundData.course]);

  // Suggest distance after club is selected
  React.useEffect(() => {
    if (round.selectedClub && round.remainingDistance) {
      round.setSuggestedDistance(round.remainingDistance);
    }
  }, [round.selectedClub, round.remainingDistance, round.currentHoleShots.length]);

  // Rebuild hole info when DB data loads
  React.useEffect(() => {
    if (currentScreen === 'track' && round.currentHole && round.roundData.course && !courseData.loadingHoleData) {
      const teeColor = round.roundData.teeColor?.toLowerCase();
      const d = courseData.dbHoleData;
      const isCombo = round.roundData.loop?.isFull || false;
      const dbMatches = d && (d.hole_number === round.currentHole ||
        (isCombo && round.currentHole > 9 && d.hole_number === round.currentHole - 9));

      if (dbMatches) {
        const distances = d.distances || {};
        const totalDistance = (teeColor && distances[teeColor]) ? distances[teeColor] : Object.values(distances)[0] || 300;
        const holeInfo = {
          number: round.currentHole, par: d.par || 4, totalDistance, distances,
          hazards: d.hazards || [], photoUrl: d.photo_url || null,
          holeStrategy: d.hole_strategy || null, strategyIsAiGenerated: d.strategy_is_ai_generated || false,
          greenLat: d.latitude || null, greenLng: d.longitude || null
        };
        round.setCurrentHoleInfo(holeInfo);
        if (round.currentHoleShots.length === 0) round.setRemainingDistance(totalDistance);
      } else {
        const par = FALLBACK_PARS[(round.currentHole - 1) % 9];
        const baseDistance = par === 3 ? 150 : par === 4 ? 350 : 480;
        round.setCurrentHoleInfo({ number: round.currentHole, par, totalDistance: baseDistance, distances: {}, hazards: [], photoUrl: null, holeStrategy: null, strategyIsAiGenerated: false });
        if (round.currentHoleShots.length === 0) round.setRemainingDistance(baseDistance);
      }
    }
  }, [courseData.dbHoleData, courseData.loadingHoleData, round.currentHole, currentScreen]);

  // Search debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (showSearch && searchQuery.length >= 2) courseData.searchCoursesInDatabase(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showSearch]);

  // ── Nearby courses ───────────────────────────────────────────────────────

  const getNearbyCoursesSimulated = async () => {
    courseData.setNearbyCoursesLoading(true);
    const processCourses = (courses, lat, lng) => {
      const withDist = courses.map(c => ({
        id: c.id, name: c.name, city: c.city, loops: c.loops,
        teeColors: c.tee_colors, lat: parseFloat(c.latitude), lng: parseFloat(c.longitude),
        distance: calculateDistance(lat, lng, c.latitude, c.longitude).toFixed(1)
      })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      courseData.setGoogleCourses(withDist.slice(0, 20));
      courseData.setNearbyCoursesLoading(false);
    };

    const fallback = async () => {
      const coords = CITY_COORDINATES[settings.homeCity] || CITY_COORDINATES['Amsterdam'];
      setUserLocation({ lat: coords.lat, lng: coords.lng });
      const { data } = await courseData.searchCoursesInDatabase('') || {};
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          const { supabase } = await import('./lib/supabase');
          const { data: courses } = await supabase.from('golf_courses').select('*');
          if (courses) processCourses(courses, latitude, longitude);
          else courseData.setNearbyCoursesLoading(false);
        },
        async () => {
          const coords = CITY_COORDINATES[settings.homeCity] || CITY_COORDINATES['Amsterdam'];
          setUserLocation(coords);
          const { supabase } = await import('./lib/supabase');
          const { data: courses } = await supabase.from('golf_courses').select('*');
          if (courses) processCourses(courses, coords.lat, coords.lng);
          else courseData.setNearbyCoursesLoading(false);
        }
      );
    } else {
      courseData.setNearbyCoursesLoading(false);
    }
  };

  const filteredCourses = (() => {
    const list = courseData.googleCourses;
    if (!searchQuery.trim()) return userLocation ? list.slice(0, 20) : [];
    return list.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  })();

  // ── Round flow ───────────────────────────────────────────────────────────

  const startRound = async () => {
    const { loop, course, teeColor } = round.roundData;
    const firstHole = loop.holes[0];
    const isCombo = loop.isFull || false;
    const comboId = isCombo ? loop.id : null;

    round.setCurrentHole(firstHole);
    round.setCurrentHoleInfo(null);
    round.setCurrentHoleShots([]);
    round.setSelectedClub(''); round.setSuggestedDistance(null);
    round.setPhotoExpanded(false); round.setShowStrategy(false);

    await courseData.fetchCourseRating(course.name, loop.name, settings.gender, teeColor, isCombo, comboId);
    await courseData.fetchAllHolesForLoop(course.name, loop.name, isCombo, comboId);
    const firstLoopName = isCombo ? loop.name.split(/[+&]/)[0].trim() : loop.name;
    await courseData.fetchHoleFromDatabase(course.name, firstLoopName, firstHole);
    round.setShowHoleOverview(true);
    setCurrentScreen('track');
  };

  const finishHole = async (putts, score) => {
    const updatedRound = round.saveHole(putts, score);
    const { loop, course } = round.roundData;
    if (!loop?.holes) { alert('Error: No loop data'); return; }

    const currentIndex = loop.holes.indexOf(round.currentHole);
    if (currentIndex < loop.holes.length - 1) {
      const nextHole = loop.holes[currentIndex + 1];
      const isCombo = loop.isFull || false;
      let fetchLoopName = loop.name;
      if (isCombo) {
        const comboHole = courseData.allHolesData.find(h => h.hole_number === nextHole);
        fetchLoopName = comboHole?.source_loop || (nextHole <= 9 ? loop.name.split(/[+&]/)[0].trim() : (loop.name.split(/[+&]/)[1] || loop.name.split(/[+&]/)[0]).trim());
      }
      const dbHoleNumber = isCombo && nextHole > 9 ? nextHole - 9 : nextHole;

      round.setCurrentHoleInfo(null);
      round.setCurrentHoleShots([]);
      round.setSelectedClub(''); round.setSuggestedDistance(null); round.setSelectedLie('');
      round.setPhotoExpanded(false); round.setShowStrategy(false);
      round.setCurrentHole(nextHole);

      await courseData.fetchHoleFromDatabase(course.name, fetchLoopName, dbHoleNumber);
      round.setShowHoleOverview(true);
    } else {
      round.finishRound(updatedRound);
      setCurrentScreen('stats');
    }
  };

  const resetToHome = () => {
    round.resetRound();
    setUserLocation(null); setShowSearch(false); setSearchQuery('');
    courseData.setGoogleCourses([]);
  };

  // ─── CSS + render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; }
        .font-body { font-family: 'Inter', sans-serif; }
        .animate-slide-up { animation: slideUp 0.4s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .glass-card { background: rgba(255,255,255,0.08); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.12); }
        .btn-primary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); transition: all 0.3s ease; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(16,185,129,0.4); }
        .btn-secondary { background: rgba(255,255,255,0.1); transition: all 0.3s ease; }
        .btn-secondary:hover { background: rgba(255,255,255,0.15); }
        .club-btn { transition: all 0.2s ease; }
        .club-btn:hover { transform: scale(1.05); }
        .club-btn.selected { background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 12px rgba(16,185,129,0.5); }
      `}</style>

      {/* ==================== SPLASH ==================== */}
      {currentScreen === 'splash' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-slide-up">
          <div className="text-center max-w-md">
            <div onClick={() => setCurrentScreen('home')} className="cursor-pointer hover:scale-105 transition-transform duration-300 mb-8">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-1 h-24 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full mx-auto"></div>
                  <div className="absolute top-2 left-1 w-16 h-10 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-r-lg shadow-lg transform -skew-y-3 animate-pulse"></div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-md"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-display text-7xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">GOLF</span>
                  <span className="text-white/90 mx-2">·</span>
                  <span className="bg-gradient-to-r from-teal-200 via-emerald-300 to-teal-200 bg-clip-text text-transparent">STATS</span>
                </div>
                <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full"></div>
              </div>
            </div>
            <div className="font-display text-4xl text-white mb-6">
              {(() => { const h = new Date().getHours(); return h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond'; })()}{settings.name && `, ${settings.name}`}!
            </div>
            {weather.splashWeather && (
              <div className="glass-card rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="text-6xl">
                    {weather.splashWeather.condition === 'rainy' ? '🌧️' : weather.splashWeather.condition === 'cloudy' ? '⛅' : '☀️'}
                  </div>
                  <div>
                    <div className="font-display text-5xl text-emerald-300">{weather.splashWeather.temp}°</div>
                    <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">Celsius</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== HOME ==================== */}
      {currentScreen === 'home' && (
        <div className="animate-slide-up">
          <div className="p-6 pt-12">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="font-display text-6xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">{t('golfStats')}</h1>
                <p className="font-body text-emerald-200/70 text-sm">{t('tagline')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentScreen('allStats')} className="glass-card p-3 rounded-xl hover:bg-white/15 transition"><BarChart3 className="w-6 h-6 text-emerald-400" /></button>
                {onAdmin && <button onClick={onAdmin} className="glass-card p-3 rounded-xl hover:bg-white/15 transition"><span className="text-emerald-400 text-xl">👑</span></button>}
                <button onClick={() => setCurrentScreen('settings')} className="glass-card p-3 rounded-xl hover:bg-white/15 transition"><Settings className="w-6 h-6 text-emerald-400" /></button>
                {onLogout && <button onClick={onLogout} className="glass-card p-3 rounded-xl hover:bg-white/15 transition"><span className="text-red-400 text-xl">🚪</span></button>}
              </div>
            </div>
          </div>

          <div className="px-6 mt-8">
            {/* Saved Rounds */}
            {round.savedRounds.length > 0 && (
              <div className="glass-card rounded-3xl p-8 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display text-3xl mb-1">{t('myRounds').toUpperCase()}</h2>
                    <p className="font-body text-emerald-200/60 text-sm">{round.savedRounds.length} {round.savedRounds.length === 1 ? 'ronde' : 'rondes'}</p>
                  </div>
                  <BarChart3 className="w-12 h-12 text-emerald-400" />
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {round.savedRounds.slice(0, 20).map((r, index) => (
                    <div key={index} className="glass-card rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition">
                      <button onClick={() => { round.setRoundData(r); setCurrentScreen('roundHistory'); }} className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-body font-semibold text-white">{r.course.name}</div>
                            <div className="font-body text-xs text-emerald-200/60 mt-1">{r.loop.name}</div>
                            <div className="font-body text-xs text-emerald-200/50 mt-1">{r.date}</div>
                          </div>
                          <div className="text-right mr-4">
                            <div className="font-display text-2xl text-emerald-300">{r.holes.reduce((s, h) => s + (h.score || 0), 0)}</div>
                            <div className="font-body text-xs text-emerald-200/60">{t('viewRound')}</div>
                          </div>
                        </div>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Weet je zeker dat je deze ronde wilt verwijderen?')) round.setSavedRounds(prev => prev.filter((_, i) => i !== index)); }}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
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
                  <div className="space-y-4 animate-slide-up">
                    <div className="glass-card rounded-xl p-4 bg-emerald-500/10 border-emerald-400/30">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-body font-semibold text-white">{round.roundData.course.name}</div>
                          <div className="font-body text-xs text-emerald-200/70 mt-1">{round.roundData.loop.name}</div>
                        </div>
                        <button onClick={() => round.setRoundData({ ...round.roundData, teeColor: null })} className="font-body text-xs text-emerald-300 hover:text-emerald-200">Wijzigen</button>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold inline-block mt-2 ${getTeeColorClass(round.roundData.teeColor)}`}>{round.roundData.teeColor} Tee</div>
                    </div>
                    <div>
                      <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">Starttijd</label>
                      <input type="time" value={round.roundData.startTime} onChange={(e) => round.setRoundData({ ...round.roundData, startTime: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
                    </div>
                    <div>
                      <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">Temperatuur (°C)</label>
                      <input type="number" value={round.roundData.temperature || ''} onChange={(e) => round.setRoundData({ ...round.roundData, temperature: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder={weather.fetchingWeather ? 'Ophalen...' : 'bijv. 18'} disabled={weather.fetchingWeather}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">Datum</label>
                      <div className="relative">
                        <input type="date" value={round.roundData.date} onChange={(e) => round.setRoundData({ ...round.roundData, date: e.target.value })}
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none" />
                      </div>
                    </div>
                    <button onClick={startRound} className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider mt-6">START RONDE</button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            {!userLocation && !round.roundData.course && (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setCurrentScreen('allStats')} className="glass-card rounded-2xl p-6 text-left hover:bg-white/10 transition">
                  <TrendingUp className="w-8 h-8 text-emerald-400 mb-3" />
                  <div className="font-display text-2xl">{settings.handicap || '--'}</div>
                  <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">Handicap</div>
                </button>
                <button onClick={() => setCurrentScreen('clubs')} className="glass-card rounded-2xl p-6 text-left hover:bg-white/10 transition">
                  <BarChart3 className="w-8 h-8 text-teal-400 mb-3" />
                  <div className="font-display text-2xl">{round.savedRounds.length}</div>
                  <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">Rondes</div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TRACKING ==================== */}
      {currentScreen === 'track' && round.roundData.loop && round.currentHoleInfo && (
        <div className="animate-slide-up min-h-screen flex flex-col bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900">

          {/* Hole Overview Modal */}
          {round.showHoleOverview && (
            <div className="fixed inset-0 bg-black/95 z-50 flex flex-col"
              onClick={() => { round.setShowHoleOverview(false); round.setShowStrategy(false); }}>
              <div className="flex-shrink-0 px-4 pt-3 pb-2 text-center">
                <span className="font-body text-xs text-white/40">tik om te sluiten</span>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <span className="font-display text-xl bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">HOLE {round.currentHoleInfo.number}</span>
                  <span className="font-body text-emerald-200/70 text-sm">Par {round.currentHoleInfo.par}</span>
                  <span className="font-body text-emerald-200/70 text-sm">{round.currentHoleInfo.totalDistance}m</span>
                  {round.remainingDistance !== round.currentHoleInfo.totalDistance && (
                    <span className="font-body text-red-400 text-sm font-bold">Nog {round.remainingDistance}m</span>
                  )}
                </div>
              </div>
              <div className={'flex-1 flex items-center justify-center px-4 transition-all duration-300 ' + (round.showStrategy ? 'max-h-[40vh]' : '')}
                onClick={(e) => e.stopPropagation()}>
                {round.currentHoleInfo.photoUrl ? (
                  <div className="relative h-full flex items-center justify-center">
                    <img src={round.currentHoleInfo.photoUrl} alt={`Hole ${round.currentHoleInfo.number}`}
                      className="object-contain rounded-xl border border-emerald-600/30 transition-all duration-300"
                      style={{ maxHeight: round.showStrategy ? '35vh' : '72vh', maxWidth: '100%' }} />
                    {round.remainingDistance > 0 && round.currentHoleInfo.totalDistance > 0 && (
                      <div style={{ position: 'absolute', right: '8px', top: Math.max(8, Math.min(88, (1 - round.remainingDistance / round.currentHoleInfo.totalDistance) * 80 + 8)) + '%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '3px', flexDirection: 'row-reverse' }}>
                        <div className="bg-red-500 text-white font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap" style={{ fontSize: '11px' }}>{round.remainingDistance}m</div>
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
                  {round.currentHoleInfo.holeStrategy && (
                    <>
                      <button onClick={() => round.setShowStrategy(!round.showStrategy)}
                        className={'w-full rounded-xl py-3 px-4 font-body font-medium transition border ' +
                          (round.showStrategy ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' : 'bg-white/5 border-white/20 text-white hover:bg-white/10')}>
                        🏌️ {t('howToPlay')} <span className="ml-2 text-xs">{round.showStrategy ? '▲' : '▼'}</span>
                      </button>
                      {round.showStrategy && (
                        <div className="bg-white/5 rounded-xl p-3 mt-2 border border-white/10 animate-slide-up max-h-[30vh] overflow-y-auto">
                          <p className="font-body text-white text-sm leading-relaxed">{round.currentHoleInfo.holeStrategy}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="p-6 bg-gradient-to-b from-black/20 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => {
                const msg = settings.language === 'nl' ? 'Weet je het zeker? De ronde wordt niet opgeslagen.' : 'Are you sure? The round will not be saved.';
                if (window.confirm(msg)) {
                  setCurrentScreen('home');
                  round.resetRound();
                }
              }}><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={() => { round.setShowHoleOverview(true); round.setPhotoExpanded(false); round.setShowStrategy(false); }}
                className="glass-card px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="font-body text-xs text-emerald-300 uppercase tracking-wider">Hole Info</span>
              </button>
            </div>
            <div className="text-center mb-4">
              <div className="font-display text-5xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">HOLE {round.currentHole}</div>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="font-body text-emerald-200/70">Par {round.currentHoleInfo.par}</span>
                <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                <span className="font-body text-emerald-200/70">{round.currentHoleInfo.totalDistance}m</span>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">{t('toGo')}</div>
              <div className="font-display text-7xl text-white">{convertDistance(round.remainingDistance)}<span className="text-4xl text-emerald-300 ml-2">{getUnitLabel()}</span></div>
              <div className="font-body text-xs text-emerald-200/60 mt-2">{t('toMiddleGreen')}</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 px-6 overflow-y-auto pb-6">
            {/* Club Selection */}
            <div className="mb-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{t('shot')} {round.currentHoleShots.length + 1}: {t('whichClub')}</label>
              <div className="grid grid-cols-4 gap-2">
                {clubs.map((club) => (
                  <button key={club} onClick={() => round.setSelectedClub(club)}
                    className={'club-btn glass-card rounded-xl py-3 px-2 font-body text-sm font-medium ' + (round.selectedClub === club ? 'selected' : '')}>{club}</button>
                ))}
              </div>
            </div>

            {/* Distance / Putts */}
            {round.selectedClub && (
              <div className="space-y-4 animate-slide-up">
                {round.selectedClub === 'Putter' ? (
                  <div className="glass-card rounded-xl p-6 bg-emerald-500/10 border-emerald-400/30">
                    <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider text-center">{t('putts')}</div>
                    <div className="text-center mb-4">
                      <input type="number" value={round.manualDistance} onChange={(e) => round.setManualDistance(e.target.value)} placeholder="1"
                        className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center inline-block" />
                      <span className="font-display text-2xl text-emerald-300 ml-2">{round.manualDistance == 1 ? 'putt' : 'putts'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-xl p-6 bg-emerald-500/10 border-emerald-400/30">
                    <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider text-center">{t('distancePlayed')}</div>
                    <div className="text-center mb-4">
                      <input type="number" value={round.manualDistance} onChange={(e) => round.setManualDistance(e.target.value)} placeholder={round.suggestedDistance?.toString()}
                        className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center inline-block" />
                      <span className="font-display text-2xl text-emerald-300 ml-2">{getUnitLabel()}</span>
                    </div>
                    <div className="font-body text-xs text-emerald-200/50 text-center">{t('adjust')}</div>
                  </div>
                )}

                {/* Lie */}
                <div>
                  <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{t('lie')}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'fairway', emoji: '🟢', color: 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/50' },
                      { key: 'rough', emoji: '🟤', color: 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/50' },
                      { key: 'bunker', emoji: '🟡', color: 'bg-yellow-500 border-yellow-400 text-gray-900 shadow-lg shadow-yellow-500/50' },
                      { key: 'fringe', emoji: '🟨', color: 'bg-lime-500 border-lime-400 text-gray-900 shadow-lg shadow-lime-500/50' },
                      { key: 'green', emoji: '🟩', color: 'bg-emerald-400 border-emerald-300 text-white shadow-lg shadow-emerald-400/50' },
                      { key: 'penalty', emoji: '🔴', color: 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/50' }
                    ].map(({ key, emoji, color }) => (
                      <button key={key} onClick={() => round.setSelectedLie(key)}
                        className={'rounded-xl py-4 flex items-center justify-center gap-2 font-body font-medium transition border-2 ' +
                          (round.selectedLie === key ? color : 'bg-white/10 border-white/20 text-white hover:bg-white/15')}>
                        {emoji} {t(key)}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={round.addShot} disabled={!round.selectedLie}
                  className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
                  {t('distanceOk').toUpperCase()}
                </button>
              </div>
            )}

            {/* Shot History */}
            {round.currentHoleShots.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-body text-xs text-emerald-200/70 uppercase tracking-wider">Slagen dit hole</label>
                  <button onClick={round.undoLastShot} className="btn-secondary rounded-lg px-3 py-1.5 font-body text-xs font-medium hover:bg-white/20 transition">↶ Ongedaan maken</button>
                </div>
                <div className="space-y-2">
                  {round.currentHoleShots.map((shot) => (
                    <div key={shot.shotNumber} className="glass-card rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-emerald-500/30 rounded-full flex items-center justify-center font-display text-emerald-300">{shot.shotNumber}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-body font-semibold text-white">{shot.club}</span>
                          </div>
                          <div className="font-body text-xs text-emerald-200/60">
                            {shot.club === 'Putter' ? `${shot.putts || 1} putt${(shot.putts || 1) !== 1 ? 's' : ''}` : `${Dist({ value: shot.distanceToGreen })} → ${Dist({ value: shot.distanceToGreen - shot.distancePlayed })}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-display text-2xl text-emerald-300">{shot.club === 'Putter' ? `${shot.putts || 1}×` : Dist({ value: shot.distancePlayed })}</div>
                        <button onClick={() => round.deleteShot(shot.shotNumber)} className="text-red-400 hover:text-red-300 text-2xl font-bold transition w-8 h-8 flex items-center justify-center">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finish Hole */}
            {round.currentHoleShots.length > 0 && (() => {
              const totalPutts = round.currentHoleShots.filter(s => s.club === 'Putter').reduce((sum, s) => sum + (s.putts || 1), 0);
              const nonPuttShots = round.currentHoleShots.filter(s => s.club !== 'Putter').length;
              const autoScore = nonPuttShots + totalPutts;
              const si = getStrokeIndex(courseData.allHolesData, round.currentHole, settings.gender);
              const holePar = round.currentHoleInfo?.par || 4;
              const stablefordPts = calculateStablefordForHole(autoScore, holePar, si, courseData.courseRating, settings.handicap);
              const playingHcp = calculatePlayingHandicap(settings.handicap, courseData.courseRating);
              const scoreToPar = autoScore - holePar;

              return (
                <div className="space-y-4 mt-6 animate-slide-up">
                  <div className="glass-card rounded-2xl p-6 bg-emerald-500/10 border-emerald-400/30">
                    <div className="font-display text-2xl text-emerald-300 mb-4 text-center">Hole Afronden</div>
                    {totalPutts > 0 && (
                      <div className="mb-4 p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                        <div className="font-body text-sm text-emerald-300 text-center">⛳ {totalPutts} putt{totalPutts !== 1 ? 's' : ''} geregistreerd</div>
                      </div>
                    )}
                    <div className="text-center mb-4">
                      <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">Score deze hole</div>
                      <div className={'font-display text-6xl ' + (scoreToPar < 0 ? 'text-emerald-300' : scoreToPar === 0 ? 'text-white' : 'text-red-300')}>{autoScore}</div>
                      <div className="font-body text-xs text-emerald-200/60 mt-1">
                        {scoreToPar > 0 ? '+' + scoreToPar : scoreToPar < 0 ? scoreToPar : 'Par'} ({nonPuttShots} slagen + {totalPutts} putts)
                      </div>
                    </div>
                    {settings.showScore && stablefordPts !== null && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl border border-yellow-500/30">
                        <div className="text-center">
                          <div className="font-body text-xs text-yellow-200/70 mb-1 uppercase tracking-wider">Stableford</div>
                          <div className="font-display text-5xl text-yellow-300">{stablefordPts}</div>
                          <div className="font-body text-xs text-yellow-200/50 mt-1">
                            punten{playingHcp !== null && ` • Baan HCP: ${playingHcp}`}{si && ` • SI: ${si}`}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="mb-4">
                      <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">Score aanpassen (optioneel)</label>
                      <input type="number" id="score-input-bottom" placeholder={autoScore.toString()} defaultValue=""
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center" />
                      <div className="font-body text-xs text-emerald-200/50 mt-1 text-center">Laat leeg om berekende score te gebruiken</div>
                    </div>
                    <button onClick={() => {
                      const scoreInput = document.getElementById('score-input-bottom');
                      const manualScore = parseInt(scoreInput?.value);
                      const finalScore = manualScore > 0 ? manualScore : autoScore;
                      finishHole(totalPutts, finalScore);
                    }} className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
                      ✓ {t('completeHole').toUpperCase()}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================== STATS SCREEN ==================== */}
      {currentScreen === 'stats' && (
        <StatsScreen
          roundData={round.roundData}
          allHolesData={courseData.allHolesData}
          courseRating={courseData.courseRating}
          settings={settings}
          convertDistance={convertDistance}
          getUnitLabel={getUnitLabel}
          onNewRound={resetToHome}
          onHome={() => setCurrentScreen('home')}
        />
      )}

      {/* ==================== SETTINGS ==================== */}
      {currentScreen === 'settings' && (
        <SettingsScreen
          settings={settings}
          setSettings={setSettings}
          appVersion={appVersion}
          onSave={() => { setCurrentScreen('splash'); weather.setSplashWeather(null); }}
          onBag={() => setCurrentScreen('bag')}
        />
      )}

      {/* ==================== BAG ==================== */}
      {currentScreen === 'bag' && (
        <BagScreen
          settings={settings}
          setSettings={setSettings}
          showBagLimitWarning={showBagLimitWarning}
          onBack={() => setCurrentScreen('settings')}
        />
      )}

      {/* ==================== ROUND HISTORY ==================== */}
      {currentScreen === 'roundHistory' && round.roundData.holes && (
        <RoundHistory
          roundData={round.roundData}
          convertDistance={convertDistance}
          getUnitLabel={getUnitLabel}
          onBack={() => setCurrentScreen('home')}
        />
      )}

      {/* ==================== ALL STATS ==================== */}
      {currentScreen === 'allStats' && (
        <div className="animate-slide-up min-h-screen pb-6">
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('home')} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
            <h1 className="font-display text-3xl">STATISTIEKEN</h1>
            <div className="w-10" />
          </div>
          <div className="px-6 space-y-6">
            {round.savedRounds.length === 0 ? (
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
                    <div className="font-body text-emerald-200/70 text-sm">{round.savedRounds.length} rondes gespeeld</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {round.savedRounds.slice(0, 5).map((r, index) => (
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
      )}

      {/* ==================== CLUBS ==================== */}
      {currentScreen === 'clubs' && (
        <div className="animate-slide-up">
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('home')} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
            <h1 className="font-display text-3xl">CLUB ANALYSE</h1>
            <div className="w-10" />
          </div>
          <div className="px-6">
            <div className="glass-card rounded-2xl p-8 text-center">
              <BarChart3 className="w-16 h-16 text-emerald-400/50 mx-auto mb-4" />
              <div className="font-body text-emerald-200/60">Speel meer rondes om gedetailleerde club statistieken te zien</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {courseData.loadingHoleData && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-400 border-t-transparent mx-auto mb-3"></div>
            <div className="font-body text-white text-sm">{t('loadingHole')}</div>
          </div>
        </div>
      )}
    </div>
  );
}
