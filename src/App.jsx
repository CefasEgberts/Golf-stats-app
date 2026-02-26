import React, { useState } from 'react';

// Lib
import { TEE_COLOR_CLASSES, CITY_COORDINATES, DEFAULT_BAGS, ALL_CLUBS, FALLBACK_PARS } from './lib/constants';
import { tr } from './lib/translations';
import { calculateDistance } from './lib/gps';

// Hooks
import { useCourseData } from './hooks/useCourseData';
import { useWeather } from './hooks/useWeather';
import { useRound } from './hooks/useRound';
import { useGpsTracking } from './hooks/useGpsTracking';

// Components
import SplashScreen from './components/SplashScreen';
import SettingsScreen from './components/SettingsScreen';
import BagScreen from './components/BagScreen';
import StatsScreen from './components/StatsScreen';
import RoundHistory from './components/RoundHistory';
import HomeScreen from './components/HomeScreen';
import TrackingScreen from './components/TrackingScreen';
import AllStatsScreen from './components/AllStatsScreen';
import ClubAnalysis from './components/ClubAnalysis';

// ─── Helpers ────────────────────────────────────────────────────────────────

const commitHash = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local';
const appVersion = `${commitHash} v1.94`;

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
  const greenPoints = round.currentHoleInfo ? {
    frontLat: round.currentHoleInfo.greenFrontLat, frontLng: round.currentHoleInfo.greenFrontLng,
    backLat: round.currentHoleInfo.greenBackLat, backLng: round.currentHoleInfo.greenBackLng,
    leftLat: round.currentHoleInfo.greenLeftLat, leftLng: round.currentHoleInfo.greenLeftLng,
    rightLat: round.currentHoleInfo.greenRightLat, rightLng: round.currentHoleInfo.greenRightLng
  } : null;
  const gps = useGpsTracking(round.currentHoleInfo?.greenLat, round.currentHoleInfo?.greenLng, greenPoints);

  // Convenience aliases
  const t = (key) => tr(settings.language, key);
  const convertDistance = (m) => settings.units === 'yards' ? Math.round(m * 1.09361) : Math.round(m);
  const getUnitLabel = () => settings.units === 'yards' ? 'yard' : 'm';
  const Dist = ({ value }) => `${convertDistance(value)} ${getUnitLabel()}`;

  const clubs = settings.bag.length > 0 ? settings.bag : ALL_CLUBS;

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

  // Suggest distance after club is selected (prefer GPS shot distance)
  React.useEffect(() => {
    if (round.selectedClub && round.selectedClub !== 'Putter') {
      if (gps.gpsTracking && gps.gpsShotDistance != null) {
        round.setSuggestedDistance(gps.gpsShotDistance);
      } else if (round.remainingDistance) {
        round.setSuggestedDistance(round.remainingDistance);
      }
    }
  }, [round.selectedClub, round.remainingDistance, round.currentHoleShots.length, gps.gpsShotDistance, gps.gpsTracking]);

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
          greenLat: d.latitude || null, greenLng: d.longitude || null,
          greenFrontLat: d.green_front_lat || null, greenFrontLng: d.green_front_lng || null,
          greenBackLat: d.green_back_lat || null, greenBackLng: d.green_back_lng || null,
          greenLeftLat: d.green_left_lat || null, greenLeftLng: d.green_left_lng || null,
          greenRightLat: d.green_right_lat || null, greenRightLng: d.green_right_lng || null
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

  // GPS distance → remaining distance sync
  React.useEffect(() => {
    if (gps.gpsDistanceToGreen != null && gps.gpsTracking) {
      round.setRemainingDistance(gps.gpsDistanceToGreen);
    }
  }, [gps.gpsDistanceToGreen, gps.gpsTracking]);

  // Search debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const q = searchQuery.trim();
      if (showSearch && q.length >= 2) courseData.searchCoursesInDatabase(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showSearch]);

  // ── Nearby courses ───────────────────────────────────────────────────────

  const getNearbyCoursesSimulated = async () => {
    courseData.setNearbyCoursesLoading(true);
    const processCourses = (courses, lat, lng, accuracy) => {
      const withDist = courses.map(c => ({
        id: c.id, name: c.name, city: c.city, loops: c.loops,
        teeColors: c.tee_colors, lat: parseFloat(c.latitude), lng: parseFloat(c.longitude),
        distance: calculateDistance(lat, lng, c.latitude, c.longitude).toFixed(1)
      })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      courseData.setGoogleCourses(withDist.slice(0, 20));
      courseData.setNearbyCoursesLoading(false);
      if (accuracy && accuracy > 500) {
        console.warn('GPS nauwkeurigheid laag:', Math.round(accuracy) + 'm');
      }
    };

    const fetchAndProcess = async (lat, lng, accuracy) => {
      setUserLocation({ lat, lng });
      const { supabase } = await import('./lib/supabase');
      const { data: courses } = await supabase.from('golf_courses').select('*');
      if (courses) processCourses(courses, lat, lng, accuracy);
      else courseData.setNearbyCoursesLoading(false);
    };

    const getPosition = (options) => new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, options)
    );

    if ('geolocation' in navigator) {
      try {
        // Eerste poging: snel maar mogelijk onnauwkeurig
        const pos = await getPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        const { latitude, longitude, accuracy } = pos.coords;

        // Als GPS te onnauwkeurig is (>500m), doe een tweede poging
        if (accuracy > 500) {
          try {
            const pos2 = await getPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
            await fetchAndProcess(pos2.coords.latitude, pos2.coords.longitude, pos2.coords.accuracy);
          } catch {
            // Tweede poging mislukt, gebruik eerste resultaat
            await fetchAndProcess(latitude, longitude, accuracy);
          }
        } else {
          await fetchAndProcess(latitude, longitude, accuracy);
        }
      } catch {
        // GPS helemaal niet beschikbaar, val terug op thuisstad
        const coords = CITY_COORDINATES[settings.homeCity] || CITY_COORDINATES['Amsterdam'];
        await fetchAndProcess(coords.lat, coords.lng, null);
      }
    } else {
      courseData.setNearbyCoursesLoading(false);
    }
  };

  const filteredCourses = (() => {
    const list = courseData.googleCourses;
    const q = searchQuery.trim();
    if (!q) return userLocation ? list.slice(0, 20) : [];
    return list.filter(c =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(q.toLowerCase()))
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

      gps.resetForNewHole();
      round.setCurrentHoleInfo(null);
      round.setCurrentHoleShots([]);
      round.setSelectedClub(''); round.setSuggestedDistance(null); round.setSelectedLie('');
      round.setPhotoExpanded(false); round.setShowStrategy(false);
      round.setCurrentHole(nextHole);

      await courseData.fetchHoleFromDatabase(course.name, fetchLoopName, dbHoleNumber);
      round.setShowHoleOverview(true);
    } else {
      gps.stopTracking();
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
        @keyframes gpsBlink { 0%, 100% { opacity: 1; box-shadow: 0 0 8px 4px rgba(239,68,68,0.7); } 50% { opacity: 0.4; box-shadow: 0 0 4px 2px rgba(239,68,68,0.3); } }
        .gps-dot { animation: gpsBlink 1.2s ease-in-out infinite; }
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
            <div className="mt-8 font-body text-xs text-emerald-200/30">{appVersion}</div>
          </div>
        </div>
      )}

      {/* ==================== HOME ==================== */}
      {currentScreen === 'home' && (
        <HomeScreen
          settings={settings}
          round={round}
          courseData={courseData}
          weather={weather}
          userLocation={userLocation}
          setUserLocation={setUserLocation}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredCourses={filteredCourses}
          getNearbyCoursesSimulated={getNearbyCoursesSimulated}
          resetToHome={resetToHome}
          startRound={startRound}
          getTeeColorClass={getTeeColorClass}
          t={t}
          user={user}
          gps={gps}
          onSettings={() => setCurrentScreen('settings')}
          onAllStats={() => setCurrentScreen('allStats')}
          onClubs={() => setCurrentScreen('clubs')}
          onRoundHistory={(r) => { if (r) { round.setRoundData(r); setCurrentScreen('roundHistory'); } else { setCurrentScreen('roundsList'); } }}
          onLogout={onLogout}
          onAdmin={onAdmin}
        />
      )}

      {/* ==================== TRACKING ==================== */}
      {currentScreen === 'track' && round.roundData.loop && round.currentHoleInfo && (
        <TrackingScreen
          round={round}
          courseData={courseData}
          settings={settings}
          clubs={clubs}
          convertDistance={convertDistance}
          getUnitLabel={getUnitLabel}
          Dist={Dist}
          t={t}
          finishHole={finishHole}
          gps={gps}
          wind={weather.courseWind}
          user={user}
          onQuit={() => {
            const msg = settings.language === 'nl' ? 'Weet je het zeker? De ronde wordt niet opgeslagen.' : 'Are you sure? The round will not be saved.';
            if (window.confirm(msg)) {
              gps.stopTracking();
              setCurrentScreen('home');
              round.resetRound();
            }
          }}
        />
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

      {/* ==================== ROUNDS LIST ==================== */}
      {currentScreen === 'roundsList' && (
        <div className="animate-slide-up">
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('home')} className="p-2"><span className="text-white text-2xl">‹</span></button>
            <h1 className="font-display text-3xl">{t('myRounds').toUpperCase()}</h1>
            <div className="w-10" />
          </div>
          <div className="px-6 space-y-3">
            {round.savedRounds.length === 0 && (
              <div className="glass-card rounded-xl p-8 text-center">
                <div className="font-body text-emerald-200/60">Nog geen rondes gespeeld</div>
              </div>
            )}
            {round.savedRounds.map((r, index) => (
              <div key={index} className="glass-card rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition">
                <button onClick={() => { round.setRoundData(r); setCurrentScreen('roundHistory'); }} className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-body font-semibold text-white">{r.course?.name}</div>
                      <div className="font-body text-xs text-emerald-200/60 mt-1">{r.loop?.name} • {r.teeColor}</div>
                      <div className="font-body text-xs text-emerald-200/50 mt-1">{r.date} • {r.startTime}</div>
                    </div>
                    <div className="text-right mr-4">
                      <div className="font-display text-2xl text-emerald-300">{r.holes?.reduce((s, h) => s + (h.score || 0), 0)}</div>
                      <div className="font-body text-xs text-emerald-200/60">{r.holes?.length} holes</div>
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
        <AllStatsScreen
          savedRounds={round.savedRounds}
          settings={settings}
          onBack={() => setCurrentScreen('home')}
        />
      )}

      {/* ==================== CLUBS ==================== */}
      {currentScreen === 'clubs' && (
        <ClubAnalysis onBack={() => setCurrentScreen('home')} />
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
