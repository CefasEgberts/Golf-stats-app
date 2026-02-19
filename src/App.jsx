import React, { useState } from 'react';
import { ChevronLeft, Plus, TrendingUp, BarChart3, Calendar, MapPin, Check, X, Settings, Home } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GolfStatsApp({ user, profile, onLogout, onAdmin }) {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const commitHash = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local';
  const appVersion = `${commitHash} v1.34`;
  
  const [settings, setSettings] = useState({
    name: profile?.username || profile?.name || 'Golfer',
    units: 'meters',
    language: 'nl',
    handicap: 13.5,
    showScore: false,
    gender: 'man',
    homeCity: 'Amsterdam',
    bag: []
  });
  
  React.useEffect(() => {
    if (profile?.username || profile?.name) {
      setSettings(prev => ({
        ...prev,
        name: profile.username || profile.name
      }));
    }
  }, [profile]);

  const [currentHole, setCurrentHole] = useState(1);
  const [currentHoleInfo, setCurrentHoleInfo] = useState(null);
  const [currentHoleShots, setCurrentHoleShots] = useState([]);
  const [remainingDistance, setRemainingDistance] = useState(null);
  const [selectedClub, setSelectedClub] = useState('');
  const [suggestedDistance, setSuggestedDistance] = useState(null);
  const [manualDistance, setManualDistance] = useState('');
  const [selectedLie, setSelectedLie] = useState('');
  const [showHoleOverview, setShowHoleOverview] = useState(false);
  const [splashWeather, setSplashWeather] = useState(null);
  const [showBagLimitWarning, setShowBagLimitWarning] = useState(false);
  const [savedRounds, setSavedRounds] = useState([]);
  const [roundData, setRoundData] = useState({
    course: null,
    loop: null,
    teeColor: null,
    date: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    temperature: null,
    holes: []
  });
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyCoursesLoading, setNearbyCoursesLoading] = useState(false);
  const [googleCourses, setGoogleCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  
  // NEW: Fase 2 state
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [dbHoleData, setDbHoleData] = useState(null);
  const [loadingHoleData, setLoadingHoleData] = useState(false);
  const [courseRating, setCourseRating] = useState(null);
  const [allHolesData, setAllHolesData] = useState([]);

  // Fetch course rating for Stableford calculation
  const fetchCourseRating = async (courseName, loopName, gender, teeColor, isCombo, comboId) => {
    try {
      const loopId = loopName.toLowerCase();
      const firstWord = courseName.toLowerCase().split(' ')[0];
      let data, error;
      
      if (isCombo && comboId) {
        // 18-hole combo: fetch by combo_id
        console.log('Fetching combo course rating:', comboId, gender, teeColor.toLowerCase());
        const result = await supabase
          .from('course_ratings')
          .select('*')
          .eq('combo_id', comboId)
          .eq('gender', gender)
          .eq('tee_color', teeColor.toLowerCase())
          .single();
        data = result.data;
        error = result.error;
      } else {
        // 9-hole single loop: fetch by loop_id without combo_id
        console.log('Fetching 9-hole course rating:', loopId, gender, teeColor.toLowerCase());
        const result = await supabase
          .from('course_ratings')
          .select('*')
          .ilike('course_id', '%' + firstWord + '%')
          .eq('loop_id', loopId)
          .is('combo_id', null)
          .eq('gender', gender)
          .eq('tee_color', teeColor.toLowerCase())
          .single();
        data = result.data;
        error = result.error;
      }
      
      if (data) {
        console.log('Course rating loaded:', data);
        setCourseRating(data);
      } else {
        console.log('No course rating found:', error?.message);
        setCourseRating(null);
      }
    } catch (err) {
      console.error('Error fetching course rating:', err);
      setCourseRating(null);
    }
  };

  // Fetch all holes data for the loop (for SI values)
  // For 18-hole combos, fetch from combo_stroke_index
  const fetchAllHolesForLoop = async (courseName, loopName, isCombo, comboId) => {
    try {
      if (isCombo && comboId) {
        // 18-hole combo: get SI from combo_stroke_index
        console.log('Fetching combo SI data:', comboId);
        const { data, error } = await supabase
          .from('combo_stroke_index')
          .select('hole_number, stroke_index_men, stroke_index_ladies, source_loop')
          .eq('combo_id', comboId)
          .order('hole_number');
        
        if (data && data.length > 0) {
          // Also need par for each hole - fetch from golf_holes for each source loop
          const enrichedData = await Promise.all(data.map(async (hole) => {
            const sourceFirstWord = courseName.toLowerCase().split(' ')[0];
            const { data: holeData } = await supabase
              .from('golf_holes')
              .select('par')
              .ilike('course_id', '%' + sourceFirstWord + '%')
              .eq('loop_id', hole.source_loop)
              .eq('hole_number', hole.hole_number <= 9 ? hole.hole_number : hole.hole_number - 9)
              .single();
            
            return {
              ...hole,
              par: holeData?.par || 4
            };
          }));
          
          console.log('Combo holes data loaded:', enrichedData.length, 'holes');
          setAllHolesData(enrichedData);
        } else {
          console.log('No combo SI data found');
          setAllHolesData([]);
        }
      } else {
        // 9-hole single loop
        const loopId = loopName.toLowerCase();
        const firstWord = courseName.toLowerCase().split(' ')[0];
        
        const { data, error } = await supabase
          .from('golf_holes')
          .select('hole_number, par, stroke_index_men, stroke_index_ladies')
          .ilike('course_id', '%' + firstWord + '%')
          .eq('loop_id', loopId)
          .order('hole_number');
        
        if (data && data.length > 0) {
          console.log('All holes data loaded:', data.length, 'holes');
          setAllHolesData(data);
        } else {
          console.log('No holes data found for loop');
          setAllHolesData([]);
        }
      }
    } catch (err) {
      console.error('Error fetching all holes:', err);
      setAllHolesData([]);
    }
  };

  // Calculate playing handicap (baan handicap) for 9 holes
  const calculatePlayingHandicap = () => {
    if (!courseRating || !settings.handicap) return null;
    const hcpIndex = settings.handicap;
    const slope = courseRating.slope_rating;
    const cr = parseFloat(courseRating.course_rating);
    const par = courseRating.par;
    
    // Baan HCP = (HCP Index * Slope / 113) + (CR - Par)
    const playingHcp = Math.round((hcpIndex * slope / 113) + (cr - par));
    return playingHcp;
  };

  // Calculate Stableford points for a single hole
  const calculateStablefordForHole = (score, holePar, strokeIndex) => {
    const playingHcp = calculatePlayingHandicap();
    if (playingHcp === null || !strokeIndex) return null;
    
    // Determine if 9 or 18 holes based on course rating data
    const is18Holes = courseRating?.holes === 18;
    
    // How many extra strokes on this hole?
    let extraStrokes = 0;
    if (is18Holes) {
      // 18 holes: SI 1-18, playingHcp distributed across 18
      if (playingHcp >= strokeIndex) extraStrokes += 1;
      if (playingHcp >= strokeIndex + 18) extraStrokes += 1;
    } else {
      // 9 holes: SI 1-9, playingHcp distributed across 9
      if (playingHcp >= strokeIndex) extraStrokes += 1;
      if (playingHcp >= strokeIndex + 9) extraStrokes += 1;
      if (playingHcp >= strokeIndex + 18) extraStrokes += 1;
    }
    
    // Net score
    const netScore = score - extraStrokes;
    
    // Stableford points based on net score vs par
    const diff = holePar - netScore;
    if (diff >= 3) return 5; // 3+ under par (albatros or better)
    if (diff === 2) return 4; // 2 under par (eagle)
    if (diff === 1) return 3; // 1 under par (birdie)
    if (diff === 0) return 2; // par
    if (diff === -1) return 1; // 1 over par (bogey)
    return 0; // 2+ over par
  };

  // Get stroke index for a hole
  const getStrokeIndex = (holeNumber) => {
    const holeData = allHolesData.find(h => h.hole_number === holeNumber);
    if (!holeData) return null;
    if (settings.gender === 'vrouw') return holeData.stroke_index_ladies;
    return holeData.stroke_index_men;
  };

  // Splash screen effect
  React.useEffect(() => {
    if (currentScreen === 'splash') {
      const fetchRealWeather = async () => {
        try {
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
              const { latitude, longitude } = position.coords;
              const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`
              );
              const data = await response.json();
              const temp = Math.round(data.current.temperature_2m);
              const weatherCode = data.current.weathercode;
              let condition = 'sunny';
              if (weatherCode >= 51 && weatherCode <= 99) condition = 'rainy';
              else if (weatherCode >= 1 && weatherCode <= 48) condition = 'cloudy';
              setSplashWeather({ temp, condition });
            }, () => {
              const temps = [2, 5, 8, 12, 15, 18, 21, 24];
              const temp = temps[Math.floor(Math.random() * temps.length)];
              const conditions = ['sunny', 'cloudy', 'rainy'];
              const condition = conditions[Math.floor(Math.random() * conditions.length)];
              setSplashWeather({ temp, condition });
            });
          } else {
            setSplashWeather({ temp: 15, condition: 'cloudy' });
          }
        } catch (error) {
          console.error('Weather fetch failed:', error);
          setSplashWeather({ temp: 15, condition: 'cloudy' });
        }
      };
      fetchRealWeather();
      setTimeout(() => setCurrentScreen('home'), 2000);
    }
  }, [currentScreen]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (settings.language === 'nl') {
      if (hour < 12) return 'Goedemorgen';
      if (hour < 18) return 'Goedemiddag';
      return 'Goedenavond';
    } else {
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    }
  };

  const getWeatherMessage = () => {
    if (!splashWeather) return '';
    const name = settings.name || 'golfer';
    if (splashWeather.condition === 'rainy') {
      return settings.language === 'nl' 
        ? `Het is altijd weer om te golfen, ${name}!` 
        : `It's always a good day to golf, ${name}!`;
    }
    if (splashWeather.temp < 10) {
      return settings.language === 'nl'
        ? `Wat ben je toch een bikkel, ${name}!`
        : `You're a tough one, ${name}!`;
    }
    return settings.language === 'nl'
      ? `Wat een topweer om een rondje te spelen, ${name}!`
      : `Perfect weather for a round, ${name}!`;
  };

  React.useEffect(() => {
    if (roundData.course && roundData.temperature === null) {
      setFetchingWeather(true);
      const fetchCourseWeather = async () => {
        try {
          const lat = roundData.course.lat || 52.3676;
          const lng = roundData.course.lng || 4.9041;
          const response = await fetch(
            'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&current=temperature_2m&timezone=auto'
          );
          const data = await response.json();
          const temp = Math.round(data.current.temperature_2m);
          setRoundData(prev => ({ ...prev, temperature: temp }));
        } catch (error) {
          console.error('Weather fetch failed for course:', error);
          setRoundData(prev => ({ ...prev, temperature: 15 }));
        } finally {
          setFetchingWeather(false);
        }
      };
      fetchCourseWeather();
    }
  }, [roundData.course]);

  // NEW: Fetch hole data from database
  const fetchHoleFromDatabase = async (courseName, loopName, holeNumber) => {
    setLoadingHoleData(true);
    setDbHoleData(null);
    
    try {
      const loopId = loopName.toLowerCase();
      
      // First try exact match with coursename-loopname
      const courseId = courseName.toLowerCase().replace(/\s+/g, '-') + '-' + loopId;
      console.log('Fetching hole data for:', courseId, loopId, holeNumber);
      
      let { data, error } = await supabase
        .from('golf_holes')
        .select('*')
        .eq('course_id', courseId)
        .eq('loop_id', loopId)
        .eq('hole_number', holeNumber)
        .single();
      
      // If not found, try searching with first word of course name
      if (error || !data) {
        const firstWord = courseName.toLowerCase().split(' ')[0];
        const partialCourseId = firstWord + '-' + loopId;
        console.log('Trying partial match:', partialCourseId);
        
        const result = await supabase
          .from('golf_holes')
          .select('*')
          .ilike('course_id', '%' + firstWord + '%')
          .eq('loop_id', loopId)
          .eq('hole_number', holeNumber)
          .single();
        
        data = result.data;
        error = result.error;
      }
      
      if (error || !data) {
        // Last resort: just search by loop_id and hole_number
        console.log('Trying loop_id + hole_number only');
        const result = await supabase
          .from('golf_holes')
          .select('*')
          .eq('loop_id', loopId)
          .eq('hole_number', holeNumber)
          .single();
        
        data = result.data;
        error = result.error;
      }
      
      if (error) {
        console.log('No hole data found in database:', error.message);
        setDbHoleData(null);
      } else if (data) {
        console.log('Hole data loaded from database:', data);
        setDbHoleData(data);
      }
    } catch (err) {
      console.error('Error fetching hole data:', err);
      setDbHoleData(null);
    } finally {
      setLoadingHoleData(false);
    }
  };

  // Build hole info from database data or fallback
  const getHoleInfo = (courseId, holeNumber) => {
    // If we have database data, use it
    if (dbHoleData && dbHoleData.hole_number === holeNumber) {
      const teeColor = roundData.teeColor ? roundData.teeColor.toLowerCase() : null;
      const distances = dbHoleData.distances || {};
      const totalDistance = teeColor && distances[teeColor] ? distances[teeColor] : 
        Object.values(distances)[0] || 300;
      
      return {
        number: holeNumber,
        par: dbHoleData.par || 4,
        totalDistance: totalDistance,
        distances: distances,
        hazards: dbHoleData.hazards || [],
        photoUrl: dbHoleData.photo_url || null,
        holeStrategy: dbHoleData.hole_strategy || null,
        strategyIsAiGenerated: dbHoleData.strategy_is_ai_generated || false,
        greenDepth: 25,
        fairwayWidth: 30
      };
    }
    
    // Fallback: generate basic data
    const pars = [4, 3, 5, 4, 4, 3, 5, 4, 4];
    const par = pars[(holeNumber - 1) % 9];
    const baseDistance = par === 3 ? 150 : par === 4 ? 350 : 480;
    const variation = Math.floor(Math.random() * 50) - 25;
    const totalDistance = baseDistance + variation;
    
    return {
      number: holeNumber,
      par,
      totalDistance,
      distances: {},
      hazards: [],
      photoUrl: null,
      holeStrategy: null,
      strategyIsAiGenerated: false,
      greenDepth: 25,
      fairwayWidth: 30
    };
  };

  const allCourses = [];

  const allClubs = [
    'Driver', 'Houten 3', 'Houten 5', 'Houten 7',
    'Hybride 3', 'Hybride 4',
    'Ijzer 1', 'Ijzer 2', 'Ijzer 3', 'Ijzer 4', 'Ijzer 5', 'Ijzer 6', 'Ijzer 7', 'Ijzer 8', 'Ijzer 9',
    'PW', 'GW', 'AW', 'LW', 'Putter'
  ];

  const getAvailableClubs = () => {
    if (settings.bag.length === 0) return allClubs;
    return settings.bag;
  };

  const clubs = getAvailableClubs();

  const toggleClubInBag = (club) => {
    const currentBag = settings.bag;
    if (currentBag.includes(club)) {
      setSettings({...settings, bag: currentBag.filter(c => c !== club)});
    } else {
      if (currentBag.length >= 14) {
        setShowBagLimitWarning(true);
        setTimeout(() => setShowBagLimitWarning(false), 2000);
        return;
      }
      setSettings({...settings, bag: [...currentBag, club]});
    }
  };

  const convertDistance = (meters) => {
    if (settings.units === 'yards') return Math.round(meters * 1.09361);
    return Math.round(meters);
  };

  const getUnitLabel = () => settings.units === 'yards' ? 'yard' : 'm';

  const t = {
    nl: {
      golfStats: 'GOLF STATS',
      tagline: 'Track. Analyze. Improve.',
      newRound: 'NIEUWE RONDE',
      startTracking: 'Begin met tracken',
      whichTee: 'Van welke tee?',
      tee: 'Tee',
      startTime: 'Starttijd',
      temperature: 'Temperatuur',
      date: 'Datum',
      startRound: 'START RONDE',
      hole: 'HOLE',
      par: 'Par',
      toGo: 'Nog te gaan',
      toMiddleGreen: 'tot midden green',
      onGreen: 'OP DE GREEN!',
      finishHole: 'Rond de hole af',
      putts: 'Aantal putts',
      score: 'Score voor dit hole',
      completeHole: 'HOLE AFRONDEN',
      shot: 'Slag',
      whichClub: 'Welke club?',
      distancePlayed: 'Geslagen afstand',
      adjust: 'Pas aan indien nodig',
      distanceOk: 'AFSTAND AKKOORD',
      shotsThisHole: 'Slagen dit hole',
      undo: 'Ongedaan maken',
      holeInfo: 'Hole Info',
      importantDistances: 'Afstanden per tee',
      front: 'Voorkant green',
      middle: 'Midden green',
      back: 'Achterkant green',
      hazards: 'Hindernissen',
      beginHole: 'BEGIN HOLE',
      statistics: 'STATISTIEKEN',
      holesPlayed: 'holes gespeeld',
      totalPutts: 'Total Putts',
      avgPutts: 'Avg Putts',
      settings: 'Instellingen',
      name: 'Voornaam',
      units: 'Eenheden',
      meters: 'Meters',
      yards: 'Yards',
      language: 'Taal',
      dutch: 'Nederlands',
      english: 'Engels',
      save: 'Opslaan',
      change: 'Wijzig',
      lie: 'Lie',
      fairway: 'Fairway',
      rough: 'Rough',
      bunker: 'Bunker',
      penalty: 'Penalty',
      green: 'Green',
      fringe: 'Fringe',
      myBag: 'Wat zit er in mijn tas?',
      bagSubtitle: 'Selecteer maximaal 14 clubs',
      clubsSelected: 'clubs geselecteerd',
      bagLimitWarning: 'Maximum 14 clubs! Verwijder eerst een club.',
      clearBag: 'Wis tas',
      useDuringRound: 'Deze clubs zijn beschikbaar tijdens je ronde',
      handicap: 'Handicap',
      handicapPlaceholder: 'bijv. 13.5',
      showScoreInput: 'Stableford punten tonen',
      yes: 'Ja',
      no: 'Nee',
      showScoreHelp: 'Wanneer Ja: Stableford punten worden berekend en getoond per hole en aan het einde van de ronde',
      myRounds: 'Mijn Scorekaarten',
      noRoundsYet: 'Nog geen rondes gespeeld',
      viewRound: 'Bekijk',
      howToPlay: 'Hoe te spelen',
      noStrategyAvailable: 'Helaas is er voor deze hole geen tekst beschikbaar',
      aiGenerated: 'Let op: deze tekst is door AI gegenereerd en komt niet van de golfclub.',
      fromClub: 'Deze tekst komt van de golfclub/scorekaart.',
      tapToEnlarge: 'Tik op foto om te vergroten',
      tapToShrink: 'Tik om te verkleinen',
      loadingHole: 'Hole data laden...',
      noPhoto: 'Geen foto beschikbaar'
    },
    en: {
      golfStats: 'GOLF STATS',
      tagline: 'Track. Analyze. Improve.',
      newRound: 'NEW ROUND',
      startTracking: 'Start tracking',
      whichTee: 'Which tee?',
      tee: 'Tee',
      startTime: 'Start time',
      temperature: 'Temperature',
      date: 'Date',
      startRound: 'START ROUND',
      hole: 'HOLE',
      par: 'Par',
      toGo: 'To go',
      toMiddleGreen: 'to middle green',
      onGreen: 'ON THE GREEN!',
      finishHole: 'Finish the hole',
      putts: 'Number of putts',
      score: 'Score for this hole',
      completeHole: 'COMPLETE HOLE',
      shot: 'Shot',
      whichClub: 'Which club?',
      distancePlayed: 'Distance played',
      adjust: 'Adjust if needed',
      distanceOk: 'DISTANCE OK',
      shotsThisHole: 'Shots this hole',
      undo: 'Undo',
      holeInfo: 'Hole Info',
      importantDistances: 'Distances per tee',
      front: 'Front green',
      middle: 'Middle green',
      back: 'Back green',
      hazards: 'Hazards',
      beginHole: 'BEGIN HOLE',
      statistics: 'STATISTICS',
      holesPlayed: 'holes played',
      totalPutts: 'Total Putts',
      avgPutts: 'Avg Putts',
      settings: 'Settings',
      name: 'First name',
      units: 'Units',
      meters: 'Meters',
      yards: 'Yards',
      language: 'Language',
      dutch: 'Dutch',
      english: 'English',
      save: 'Save',
      change: 'Change',
      lie: 'Lie',
      fairway: 'Fairway',
      rough: 'Rough',
      bunker: 'Bunker',
      penalty: 'Penalty',
      green: 'Green',
      fringe: 'Fringe',
      myBag: 'What\'s in my bag?',
      bagSubtitle: 'Select maximum 14 clubs',
      clubsSelected: 'clubs selected',
      bagLimitWarning: 'Maximum 14 clubs! Remove a club first.',
      clearBag: 'Clear bag',
      useDuringRound: 'These clubs will be available during your round',
      handicap: 'Handicap',
      handicapPlaceholder: 'e.g. 13.5',
      showScoreInput: 'Show Stableford points',
      yes: 'Yes',
      no: 'No',
      showScoreHelp: 'When Yes: Stableford points are calculated and shown per hole and at the end of the round',
      myRounds: 'My Scorecards',
      noRoundsYet: 'No rounds played yet',
      viewRound: 'View',
      howToPlay: 'How to play',
      noStrategyAvailable: 'Unfortunately no strategy text is available for this hole',
      aiGenerated: 'Note: this text was generated by AI, not from the golf club.',
      fromClub: 'This text comes from the golf club/scorecard.',
      tapToEnlarge: 'Tap photo to enlarge',
      tapToShrink: 'Tap to shrink',
      loadingHole: 'Loading hole data...',
      noPhoto: 'No photo available'
    }
  };

  const tr = (key) => t[settings.language][key] || key;

  const Dist = ({value}) => `${convertDistance(value)} ${getUnitLabel()}`;

  const calculateStablefordPoints = (score, par, strokeIndex, playingHandicap) => {
    const strokesReceived = Math.floor(playingHandicap / 18) + (strokeIndex <= (playingHandicap % 18) ? 1 : 0);
    const netScore = score - strokesReceived;
    const diff = par - netScore;
    if (diff >= 2) return 4;
    if (diff === 1) return 3;
    if (diff === 0) return 2;
    if (diff === -1) return 1;
    return 0;
  };

  const getNearbyCoursesSimulated = async () => {
    setNearbyCoursesLoading(true);
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          try {
            const { data: courses, error } = await supabase.from('golf_courses').select('*');
            if (error) throw error;
            if (courses && courses.length > 0) {
              const coursesWithDistance = courses.map(course => {
                const distance = calculateDistance(latitude, longitude, course.latitude, course.longitude);
                return {
                  id: course.id, name: course.name, city: course.city,
                  loops: course.loops, teeColors: course.tee_colors,
                  lat: parseFloat(course.latitude), lng: parseFloat(course.longitude),
                  distance: distance.toFixed(1)
                };
              }).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
              setGoogleCourses(coursesWithDistance.slice(0, 20));
            }
          } catch (error) { console.error('Error fetching golf courses:', error); }
          setNearbyCoursesLoading(false);
        }, async () => {
          const cityCoordinates = {
            'Amsterdam': { lat: 52.3676, lng: 4.9041 }, 'Rotterdam': { lat: 51.9244, lng: 4.4777 },
            'Den Haag': { lat: 52.0705, lng: 4.3007 }, 'Utrecht': { lat: 52.0907, lng: 5.1214 },
            'Eindhoven': { lat: 51.4416, lng: 5.4697 }, 'Groningen': { lat: 53.2194, lng: 6.5665 },
            'Tilburg': { lat: 51.5555, lng: 5.0913 }, 'Almere': { lat: 52.3508, lng: 5.2647 },
            'Breda': { lat: 51.5719, lng: 4.7683 }, 'Nijmegen': { lat: 51.8126, lng: 5.8372 },
            'Haarlem': { lat: 52.3874, lng: 4.6462 }, 'Arnhem': { lat: 51.9851, lng: 5.8987 },
            'Enschede': { lat: 52.2215, lng: 6.8937 }, 'Apeldoorn': { lat: 52.2112, lng: 5.9699 },
            'Hoofddorp': { lat: 52.3026, lng: 4.6891 }, 'Maastricht': { lat: 50.8514, lng: 5.6909 },
            'Leiden': { lat: 52.1601, lng: 4.4970 }, 'Dordrecht': { lat: 51.8133, lng: 4.6690 },
            'Zoetermeer': { lat: 52.0575, lng: 4.4933 }, 'Zwolle': { lat: 52.5168, lng: 6.0830 }
          };
          const coords = cityCoordinates[settings.homeCity] || cityCoordinates['Amsterdam'];
          setUserLocation({ lat: coords.lat, lng: coords.lng });
          try {
            const { data: courses, error } = await supabase.from('golf_courses').select('*');
            if (error) throw error;
            if (courses && courses.length > 0) {
              const coursesWithDistance = courses.map(course => {
                const distance = calculateDistance(coords.lat, coords.lng, course.latitude, course.longitude);
                return {
                  id: course.id, name: course.name, city: course.city,
                  loops: course.loops, teeColors: course.tee_colors,
                  lat: parseFloat(course.latitude), lng: parseFloat(course.longitude),
                  distance: distance.toFixed(1)
                };
              }).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
              setGoogleCourses(coursesWithDistance.slice(0, 20));
            }
          } catch (error) { console.error('Error fetching golf courses:', error); }
          setNearbyCoursesLoading(false);
        });
      } else {
        setUserLocation({ lat: 52.3676, lng: 4.9041 });
        setNearbyCoursesLoading(false);
      }
    } catch (error) {
      setUserLocation({ lat: 52.3676, lng: 4.9041 });
      setNearbyCoursesLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getFilteredCourses = () => {
    const coursesToUse = googleCourses.length > 0 ? googleCourses : allCourses;
    if (!searchQuery.trim()) return userLocation ? coursesToUse.slice(0, 20) : [];
    return coursesToUse.filter(course => 
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.city && course.city.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };
  
  const searchCoursesInDatabase = async (query) => {
    if (!query || query.length < 2) { setGoogleCourses([]); return; }
    try {
      const { data: courses, error } = await supabase
        .from('golf_courses').select('*')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%`).limit(20);
      if (error) throw error;
      if (courses) {
        const formattedCourses = courses.map(course => ({
          id: course.id, name: course.name, city: course.city,
          loops: course.loops, teeColors: course.tee_colors,
          lat: parseFloat(course.latitude), lng: parseFloat(course.longitude),
          distance: '--'
        }));
        setGoogleCourses(formattedCourses);
      }
    } catch (error) { console.error('Error searching courses:', error); }
  };
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (showSearch && searchQuery.length >= 2) searchCoursesInDatabase(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showSearch]);

  const filteredCourses = getFilteredCourses();

  // NEW: Start hole with database fetch
  const startHole = async (holeNumber) => {
    // Fetch hole data from database
    if (roundData.course && roundData.loop) {
      await fetchHoleFromDatabase(roundData.course.name, roundData.loop.name, holeNumber);
    }
  };

  // NEW: Effect to build hole info after dbHoleData is loaded
  React.useEffect(() => {
    if (dbHoleData !== null || !loadingHoleData) {
      if (currentHoleInfo === null && currentHole && roundData.course) {
        const holeInfo = getHoleInfo(roundData.course.id, currentHole);
        setCurrentHoleInfo(holeInfo);
        setRemainingDistance(holeInfo.totalDistance);
      }
    }
  }, [dbHoleData, loadingHoleData]);

  const addShot = () => {
    if (selectedClub === 'Putter') {
      const puttsCount = manualDistance ? parseInt(manualDistance) : 1;
      const newShot = {
        shotNumber: currentHoleShots.length + 1,
        club: selectedClub, distanceToGreen: remainingDistance,
        distancePlayed: 0, lie: selectedLie, putts: puttsCount
      };
      setCurrentHoleShots([...currentHoleShots, newShot]);
      setSelectedClub(''); setSuggestedDistance(null); setManualDistance(''); setSelectedLie('');
    } else {
      const distancePlayed = manualDistance ? parseInt(manualDistance) : suggestedDistance;
      const newShot = {
        shotNumber: currentHoleShots.length + 1,
        club: selectedClub, distanceToGreen: remainingDistance,
        distancePlayed: distancePlayed, lie: selectedLie
      };
      setCurrentHoleShots([...currentHoleShots, newShot]);
      setRemainingDistance(Math.max(0, remainingDistance - distancePlayed));
      setSelectedClub(''); setSuggestedDistance(null); setManualDistance(''); setSelectedLie('');
    }
  };

  const undoLastShot = () => {
    if(currentHoleShots.length === 0) return;
    const lastShot = currentHoleShots[currentHoleShots.length - 1];
    setRemainingDistance(lastShot.distanceToGreen);
    setCurrentHoleShots(currentHoleShots.slice(0, -1));
    setSelectedClub(''); setSuggestedDistance(null); setManualDistance(''); setSelectedLie('');
  };

  const deleteShot = (shotNumber) => {
    const newShots = currentHoleShots
      .filter(s => s.shotNumber !== shotNumber)
      .map((s, i) => ({...s, shotNumber: i + 1}));
    setCurrentHoleShots(newShots);
    if(newShots.length === 0) {
      setRemainingDistance(currentHoleInfo.totalDistance);
    } else {
      const totalPlayed = newShots.reduce((sum, s) => sum + s.distancePlayed, 0);
      setRemainingDistance(Math.max(0, currentHoleInfo.totalDistance - totalPlayed));
    }
  };
  
  const finishHole = async (putts, score) => {
    const holeData = {
      hole: currentHole, shots: currentHoleShots, putts, score,
      totalShots: currentHoleShots.length + putts
    };
    const newHoles = [...roundData.holes, holeData];
    const updatedRound = { ...roundData, holes: newHoles };
    setRoundData(updatedRound);
    
    if (!roundData.loop || !roundData.loop.holes) {
      alert('Error: No loop data found'); return;
    }
    
    const currentIndex = roundData.loop.holes.indexOf(currentHole);
    
    if (currentIndex < roundData.loop.holes.length - 1) {
      const nextHole = roundData.loop.holes[currentIndex + 1];
      
      // Reset state for next hole
      setCurrentHoleInfo(null);
      setCurrentHoleShots([]);
      setSelectedClub(''); setSuggestedDistance(null); setSelectedLie('');
      setPhotoExpanded(false); setShowStrategy(false);
      setCurrentHole(nextHole);
      
      // Determine which source loop this hole belongs to
      const isCombo = roundData.loop.isFull || false;
      let fetchLoopName = roundData.loop.name;
      
      if (isCombo) {
        // For combos, check combo_stroke_index to find source_loop
        const comboHole = allHolesData.find(h => h.hole_number === nextHole);
        if (comboHole && comboHole.source_loop) {
          fetchLoopName = comboHole.source_loop;
        } else {
          // Fallback: hole 1-9 = first loop, 10-18 = second loop
          const loops = roundData.loop.name.split(/[+&]/);
          fetchLoopName = nextHole <= 9 ? loops[0].trim() : (loops[1] || loops[0]).trim();
        }
      }
      
      // For combo holes 10-18, the actual hole_number in golf_holes is 1-9
      const dbHoleNumber = isCombo && nextHole > 9 ? nextHole - 9 : nextHole;
      
      // Fetch next hole data from database
      await fetchHoleFromDatabase(roundData.course.name, fetchLoopName, dbHoleNumber);
      
      setShowHoleOverview(true);
    } else {
      setSavedRounds([updatedRound, ...savedRounds]);
      setCurrentScreen('stats');
    }
  };

  // Rebuild hole info when dbHoleData changes and we're on tracking screen
  React.useEffect(() => {
    if (currentScreen === 'track' && currentHole && roundData.course && !loadingHoleData) {
      console.log('Rebuilding hole info. dbHoleData:', dbHoleData ? 'loaded' : 'null', 'currentHole:', currentHole);
      
      // Build hole info using dbHoleData if available
      const teeColor = roundData.teeColor ? roundData.teeColor.toLowerCase() : null;
      
      // For combo holes 10-18, dbHoleData has hole_number 1-9
      const dbHoleMatches = dbHoleData && (
        dbHoleData.hole_number === currentHole || 
        (roundData.loop?.isFull && currentHole > 9 && dbHoleData.hole_number === currentHole - 9)
      );
      
      if (dbHoleMatches) {
        const distances = dbHoleData.distances || {};
        const totalDistance = teeColor && distances[teeColor] ? distances[teeColor] : 
          Object.values(distances)[0] || 300;
        
        const holeInfo = {
          number: currentHole,
          par: dbHoleData.par || 4,
          totalDistance: totalDistance,
          distances: distances,
          hazards: dbHoleData.hazards || [],
          photoUrl: dbHoleData.photo_url || null,
          holeStrategy: dbHoleData.hole_strategy || null,
          strategyIsAiGenerated: dbHoleData.strategy_is_ai_generated || false,
          greenDepth: 25,
          fairwayWidth: 30
        };
        
        console.log('Hole info built from DB:', holeInfo.par, 'strategy:', holeInfo.holeStrategy ? 'yes' : 'no', 'photo:', holeInfo.photoUrl ? 'yes' : 'no');
        setCurrentHoleInfo(holeInfo);
        if (currentHoleShots.length === 0) {
          setRemainingDistance(totalDistance);
        }
      } else {
        // Fallback
        const pars = [4, 3, 5, 4, 4, 3, 5, 4, 4];
        const par = pars[(currentHole - 1) % 9];
        const baseDistance = par === 3 ? 150 : par === 4 ? 350 : 480;
        const holeInfo = {
          number: currentHole, par, totalDistance: baseDistance,
          distances: {}, hazards: [], photoUrl: null,
          holeStrategy: null, strategyIsAiGenerated: false,
          greenDepth: 25, fairwayWidth: 30
        };
        setCurrentHoleInfo(holeInfo);
        if (currentHoleShots.length === 0) {
          setRemainingDistance(baseDistance);
        }
      }
    }
  }, [dbHoleData, loadingHoleData, currentHole, currentScreen]);
  
  React.useEffect(() => {
    if (selectedClub && remainingDistance) {
      setSuggestedDistance(remainingDistance);
    }
  }, [selectedClub, remainingDistance, currentHoleShots.length]);

  const calculateStats = () => {
    const completedHoles = roundData.holes.filter(h => h.score);
    const totalScore = completedHoles.reduce((sum, h) => sum + parseInt(h.score || 0), 0);
    const totalPutts = completedHoles.reduce((sum, h) => sum + parseInt(h.putts || 0), 0);
    
    // Calculate total Stableford points
    let totalStableford = 0;
    let hasStableford = false;
    
    completedHoles.forEach(hole => {
      const holeData = allHolesData.find(h => h.hole_number === hole.hole);
      if (holeData && courseRating && settings.handicap) {
        const si = settings.gender === 'vrouw' ? holeData.stroke_index_ladies : holeData.stroke_index_men;
        const pts = calculateStablefordForHole(hole.score, holeData.par || 4, si);
        if (pts !== null) {
          totalStableford += pts;
          hasStableford = true;
        }
      }
    });
    
    return { totalScore, totalPutts, holesPlayed: completedHoles.length, totalStableford, hasStableford };
  };

  const stats = calculateStats();

  // Get tee color map for display
  const getTeeColorClass = (color) => {
    const colorMap = {
      'wit': 'bg-white text-gray-900',
      'geel': 'bg-yellow-400 text-gray-900',
      'oranje': 'bg-orange-500 text-white',
      'rood': 'bg-red-500 text-white',
      'blauw': 'bg-blue-500 text-white',
      'zwart': 'bg-gray-900 text-white border border-white/30'
    };
    return colorMap[color.toLowerCase()] || 'bg-white/20 text-white';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');
        .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.05em; }
        .font-body { font-family: 'Inter', sans-serif; }
        .animate-slide-up { animation: slideUp 0.4s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .glass-card { background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.12); }
        .btn-primary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); transition: all 0.3s ease; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4); }
        .btn-secondary { background: rgba(255, 255, 255, 0.1); transition: all 0.3s ease; }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
        .club-btn { transition: all 0.2s ease; }
        .club-btn:hover { transform: scale(1.05); }
        .club-btn.selected { background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5); }
      `}</style>

      {/* ==================== SPLASH SCREEN ==================== */}
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
              {getGreeting()}{settings.name && `, ${settings.name}`}!
            </div>
            {splashWeather && (
              <div className="glass-card rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="text-6xl">
                    {splashWeather.condition === 'rainy' ? '\u{1F327}\u{FE0F}' : splashWeather.condition === 'cloudy' ? '\u{2601}\u{FE0F}' : '\u{2600}\u{FE0F}'}
                  </div>
                  <div>
                    <div className="font-display text-5xl text-emerald-300">{splashWeather.temp}°</div>
                    <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">Celsius</div>
                  </div>
                </div>
                <div className="font-body text-lg text-white text-center leading-relaxed">{getWeatherMessage()}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== HOME SCREEN ==================== */}
      {currentScreen === 'home' && (
        <div className="animate-slide-up">
          <div className="p-6 pt-12">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="font-display text-6xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">{tr('golfStats')}</h1>
                <p className="font-body text-emerald-200/70 text-sm">{tr('tagline')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentScreen('allStats')} className="glass-card p-3 rounded-xl hover:bg-white/15 transition" title="Statistieken">
                  <BarChart3 className="w-6 h-6 text-emerald-400" />
                </button>
                {onAdmin && (
                  <button onClick={onAdmin} className="glass-card p-3 rounded-xl hover:bg-white/15 transition" title="Admin Dashboard">
                    <span className="text-emerald-400 text-xl">{'\u{1F451}'}</span>
                  </button>
                )}
                <button onClick={() => setCurrentScreen('settings')} className="glass-card p-3 rounded-xl hover:bg-white/15 transition" title="Instellingen">
                  <Settings className="w-6 h-6 text-emerald-400" />
                </button>
                {onLogout && (
                  <button onClick={onLogout} className="glass-card p-3 rounded-xl hover:bg-white/15 transition" title="Uitloggen">
                    <span className="text-red-400 text-xl">{'\u{1F6AA}'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 mt-8">
            {/* Saved Rounds */}
            {savedRounds.length > 0 && (
              <div className="glass-card rounded-3xl p-8 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display text-3xl mb-1">{tr('myRounds').toUpperCase()}</h2>
                    <p className="font-body text-emerald-200/60 text-sm">{savedRounds.length} {savedRounds.length === 1 ? 'ronde' : 'rondes'}</p>
                  </div>
                  <BarChart3 className="w-12 h-12 text-emerald-400" />
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {savedRounds.slice(0, 20).map((round, index) => (
                    <div key={index} className="glass-card rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition">
                      <button onClick={() => { setRoundData(round); setCurrentScreen('roundHistory'); }} className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-body font-semibold text-white">{round.course.name}</div>
                            <div className="font-body text-xs text-emerald-200/60 mt-1">{round.loop.name}</div>
                            <div className="font-body text-xs text-emerald-200/50 mt-1">{round.date} {round.time && '• ' + round.time}</div>
                          </div>
                          <div className="text-right mr-4">
                            <div className="font-display text-2xl text-emerald-300">{round.holes.reduce((sum, h) => sum + (h.score || 0), 0)}</div>
                            <div className="font-body text-xs text-emerald-200/60">{tr('viewRound')}</div>
                          </div>
                        </div>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Weet je zeker dat je deze ronde wilt verwijderen?')) setSavedRounds(savedRounds.filter((_, i) => i !== index)); }}
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
                  <h2 className="font-display text-3xl mb-1">{tr('newRound').toUpperCase()}</h2>
                  <p className="font-body text-emerald-200/60 text-sm">{tr('startTracking')}</p>
                </div>
                <div className="flex gap-2">
                  {(roundData.course || userLocation || showSearch) && (
                    <button onClick={() => { 
                      setRoundData({ course: null, loop: null, teeColor: null, date: new Date().toISOString().split('T')[0], startTime: new Date().toTimeString().slice(0, 5), temperature: null, holes: [] });
                      setUserLocation(null); setShowSearch(false); setSearchQuery(''); setGoogleCourses([]);
                    }} className="p-3 rounded-xl hover:bg-white/10 transition" title="Opnieuw beginnen">
                      <Home className="w-6 h-6 text-emerald-400" />
                    </button>
                  )}
                  <Plus className="w-12 h-12 text-emerald-400" />
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Location / Search buttons */}
                {!userLocation && !roundData.course && !showSearch && (
                  <div className="space-y-3">
                    <button onClick={getNearbyCoursesSimulated} disabled={nearbyCoursesLoading}
                      className="w-full btn-primary rounded-xl py-4 font-body font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                      <MapPin className="w-5 h-5" />{nearbyCoursesLoading ? 'Zoeken...' : 'Vind banen in de buurt'}
                    </button>
                    <button onClick={() => setShowSearch(true)} className="w-full btn-secondary rounded-xl py-4 font-body font-medium">
                      Zoek op naam of plaats
                    </button>
                  </div>
                )}

                {/* Search Input */}
                {showSearch && !roundData.course && (
                  <div className="space-y-3 animate-slide-up">
                    <div className="relative">
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Zoek baan of plaats..." autoFocus
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
                      {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300">{'\u2715'}</button>}
                    </div>
                    <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="w-full btn-secondary rounded-xl py-3 font-body text-sm">
                      Gebruik locatie in plaats daarvan
                    </button>
                  </div>
                )}

                {/* Course List */}
                {((userLocation && !roundData.course) || (showSearch && searchQuery)) && (
                  <div className="space-y-3 animate-slide-up">
                    <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">
                      {showSearch ? `${filteredCourses.length} banen gevonden` : 'Banen bij jou in de buurt'}
                    </label>
                    {filteredCourses.length === 0 && showSearch && (
                      <div className="glass-card rounded-xl p-6 text-center"><div className="font-body text-emerald-200/60">Geen banen gevonden voor "{searchQuery}"</div></div>
                    )}
                    {filteredCourses.map((course) => (
                      <button key={course.id} onClick={() => { setRoundData({ ...roundData, course }); setShowSearch(false); setSearchQuery(''); }}
                        className="w-full glass-card rounded-xl p-4 text-left hover:bg-white/15 transition group">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-body font-semibold text-white group-hover:text-emerald-300 transition">{course.name}</div>
                            <div className="font-body text-xs text-emerald-200/60 mt-1">{course.city}</div>
                          </div>
                          {!showSearch && <div className="text-right"><div className="font-display text-xl text-emerald-400">{course.distance}km</div></div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Loop Selection */}
                {roundData.course && !roundData.loop && (
                  <div className="space-y-3 animate-slide-up">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-body font-semibold text-emerald-300 text-lg">{roundData.course.name}</div>
                        <div className="font-body text-xs text-emerald-200/60">{roundData.course.city}</div>
                      </div>
                      <button onClick={() => setRoundData({ ...roundData, course: null })} className="font-body text-xs text-emerald-300 hover:text-emerald-200">Wijzigen</button>
                    </div>
                    <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">Welke lus speel je?</label>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {roundData.course.loops.filter(l => !l.isFull).map((loop) => (
                        <button key={loop.id} onClick={() => setRoundData({ ...roundData, loop })}
                          className="glass-card rounded-xl p-4 text-center hover:bg-white/15 transition group overflow-hidden">
                          <div className="font-display text-2xl text-emerald-300 group-hover:text-emerald-200 transition mb-1 truncate uppercase">{loop.name}</div>
                          <div className="font-body text-xs text-emerald-200/60">9 holes</div>
                        </button>
                      ))}
                    </div>
                    {roundData.course.loops.filter(l => l.isFull).length > 0 && (
                      <>
                        <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider mt-4">Of kies een combinatie (18 holes)</label>
                        <select 
                          onChange={(e) => {
                            const selectedLoop = roundData.course.loops.find(l => l.id === e.target.value);
                            if (selectedLoop) setRoundData({ ...roundData, loop: selectedLoop });
                          }}
                          defaultValue=""
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 font-body text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition appearance-none cursor-pointer"
                          style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%2310b981\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8 12L2 6h12z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center'}}
                        >
                          <option value="" disabled style={{background: '#1a3a2a', color: '#999'}}>Selecteer een 18-holes combinatie...</option>
                          {roundData.course.loops.filter(l => l.isFull).map((loop) => (
                            <option key={loop.id} value={loop.id} style={{background: '#1a3a2a', color: 'white'}}>{loop.name} (18 holes)</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                )}

                {/* Tee Color Selection */}
                {roundData.course && roundData.loop && !roundData.teeColor && (
                  <div className="space-y-3 animate-slide-up">
                    <div className="glass-card rounded-xl p-4 bg-emerald-500/10 border-emerald-400/30 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-body font-semibold text-white">{roundData.course.name}</div>
                          <div className="font-body text-xs text-emerald-200/70 mt-1">{roundData.loop.name}</div>
                        </div>
                        <button onClick={() => setRoundData({ ...roundData, loop: null })} className="font-body text-xs text-emerald-300 hover:text-emerald-200">Wijzigen</button>
                      </div>
                    </div>
                    <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">Van welke tee speel je?</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(roundData.course.teeColors || ['Wit']).map((color) => (
                        <button key={color} onClick={() => setRoundData({ ...roundData, teeColor: color })}
                          className={`${getTeeColorClass(color)} rounded-xl py-5 font-body font-bold text-lg hover:scale-105 transition shadow-lg`}>
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date, Time & Start */}
                {roundData.course && roundData.loop && roundData.teeColor && (
                  <div className="space-y-4 animate-slide-up">
                    <div className="glass-card rounded-xl p-4 bg-emerald-500/10 border-emerald-400/30">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-body font-semibold text-white">{roundData.course.name}</div>
                          <div className="font-body text-xs text-emerald-200/70 mt-1">{roundData.loop.name}</div>
                        </div>
                        <button onClick={() => setRoundData({ ...roundData, teeColor: null })} className="font-body text-xs text-emerald-300 hover:text-emerald-200">Wijzigen</button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getTeeColorClass(roundData.teeColor)}`}>{roundData.teeColor} Tee</div>
                      </div>
                    </div>
                    <div>
                      <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">Starttijd</label>
                      <input type="time" value={roundData.startTime} onChange={(e) => setRoundData({ ...roundData, startTime: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
                    </div>
                    <div>
                      <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">Temperatuur (°C)</label>
                      <input type="number" value={roundData.temperature || ''} onChange={(e) => setRoundData({ ...roundData, temperature: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder={fetchingWeather ? 'Ophalen...' : 'bijv. 18'} disabled={fetchingWeather}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">Datum</label>
                      <div className="relative">
                        <input type="date" value={roundData.date} onChange={(e) => setRoundData({ ...roundData, date: e.target.value })}
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none" />
                      </div>
                    </div>
                    <button onClick={async () => {
                      const firstHole = roundData.loop.holes[0];
                      setCurrentHole(firstHole);
                      setCurrentHoleInfo(null);
                      setCurrentHoleShots([]);
                      setSelectedClub(''); setSuggestedDistance(null);
                      setPhotoExpanded(false); setShowStrategy(false);
                      
                      // Determine if this is a combo (18-hole) or single loop (9-hole)
                      const isCombo = roundData.loop.isFull || false;
                      const comboId = isCombo ? roundData.loop.id : null;
                      console.log('Starting round. isCombo:', isCombo, 'comboId:', comboId, 'loop:', roundData.loop);
                      
                      // Fetch course rating for Stableford
                      await fetchCourseRating(roundData.course.name, roundData.loop.name, settings.gender, roundData.teeColor, isCombo, comboId);
                      // Fetch all holes SI data
                      await fetchAllHolesForLoop(roundData.course.name, roundData.loop.name, isCombo, comboId);
                      // Fetch first hole data
                      const firstLoopName = isCombo ? roundData.loop.name.split(/[+&]/)[0].trim() : roundData.loop.name;
                      await fetchHoleFromDatabase(roundData.course.name, firstLoopName, firstHole);
                      setShowHoleOverview(true);
                      setCurrentScreen('track');
                    }} className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider mt-6">START RONDE</button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            {!userLocation && !roundData.course && (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setCurrentScreen('stats')} className="glass-card rounded-2xl p-6 text-left hover:bg-white/10 transition">
                  <TrendingUp className="w-8 h-8 text-emerald-400 mb-3" />
                  <div className="font-display text-2xl">{settings.handicap || '--'}</div>
                  <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">Handicap</div>
                </button>
                <button onClick={() => setCurrentScreen('clubs')} className="glass-card rounded-2xl p-6 text-left hover:bg-white/10 transition">
                  <BarChart3 className="w-8 h-8 text-teal-400 mb-3" />
                  <div className="font-display text-2xl">{savedRounds.length}</div>
                  <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">Rondes</div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== SHOT TRACKING SCREEN ==================== */}
      {currentScreen === 'track' && roundData.loop && currentHoleInfo && (
        <div className="animate-slide-up min-h-screen flex flex-col bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900">
          
          {/* ===== HOLE OVERVIEW MODAL ===== */}
          {showHoleOverview && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-slide-up">
              <div className="glass-card rounded-3xl p-6 max-w-md w-full border-2 border-emerald-400/50 max-h-[90vh] overflow-y-auto">
                {/* Hole Header */}
                <div className="text-center mb-4">
                  <div className="font-display text-6xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">HOLE {currentHoleInfo.number}</div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="font-body text-emerald-200/70 text-sm uppercase tracking-wider">Par {currentHoleInfo.par}</div>
                    <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                    <div className="font-body text-emerald-200/70 text-sm uppercase tracking-wider">{currentHoleInfo.totalDistance}m</div>
                  </div>
                </div>

                {/* HOLE PHOTO with toggle */}
                <div className="mb-4">
                  {currentHoleInfo.photoUrl ? (
                    <div className="relative">
                      <button onClick={() => setPhotoExpanded(!photoExpanded)} className="w-full">
                        <img 
                          src={currentHoleInfo.photoUrl} 
                          alt={'Hole ' + currentHoleInfo.number}
                          className={'w-full object-contain rounded-2xl border border-emerald-600/30 transition-all duration-300 ' + (photoExpanded ? 'max-h-[70vh]' : 'max-h-48')}
                        />
                      </button>
                      <div className="text-center mt-2">
                        <span className="font-body text-xs text-emerald-200/50">
                          {photoExpanded ? tr('tapToShrink') : tr('tapToEnlarge')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                      <div className="text-center text-emerald-200/40 text-sm">
                        {'\u{1F4F8}'} {tr('noPhoto')}
                      </div>
                    </div>
                  )}
                </div>

                {/* HOW TO PLAY BUTTON */}
                <button onClick={() => setShowStrategy(!showStrategy)}
                  className={'w-full rounded-xl py-3 px-4 font-body font-medium mb-4 transition border-2 ' + 
                    (showStrategy ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' : 'bg-white/5 border-white/20 text-white hover:bg-white/10')}>
                  {'\u{1F3CC}\u{FE0F}'} {tr('howToPlay')}
                  <span className="ml-2">{showStrategy ? '\u25B2' : '\u25BC'}</span>
                </button>

                {/* STRATEGY TEXT (collapsible) */}
                {showStrategy && (
                  <div className="glass-card rounded-xl p-4 mb-4 animate-slide-up">
                    {currentHoleInfo.holeStrategy ? (
                      <>
                        <p className="font-body text-white text-sm leading-relaxed">{currentHoleInfo.holeStrategy}</p>
                        <p className={'font-body text-xs mt-3 italic ' + (currentHoleInfo.strategyIsAiGenerated ? 'text-yellow-400' : 'text-emerald-400')}>
                          {currentHoleInfo.strategyIsAiGenerated 
                            ? '\u26A0\u{FE0F} ' + tr('aiGenerated')
                            : '\u2705 ' + tr('fromClub')}
                        </p>
                      </>
                    ) : (
                      <p className="font-body text-white/50 text-sm italic">{tr('noStrategyAvailable')}</p>
                    )}
                  </div>
                )}

                {/* Distances per tee color */}
                {currentHoleInfo.distances && Object.keys(currentHoleInfo.distances).length > 0 && (
                  <div className="glass-card rounded-xl p-4 mb-4">
                    <div className="font-body text-xs text-emerald-200/70 mb-3 uppercase tracking-wider text-center">{tr('importantDistances')}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(currentHoleInfo.distances).map(([color, dist]) => {
                        const isSelected = roundData.teeColor && color.toLowerCase() === roundData.teeColor.toLowerCase();
                        return (
                          <div key={color} className={'rounded-lg p-2 text-center ' + (isSelected ? 'bg-emerald-500/30 border border-emerald-400/50' : 'bg-white/5')}>
                            <div className="font-body text-xs text-emerald-200/60 capitalize">{color}</div>
                            <div className={'font-display text-lg ' + (isSelected ? 'text-emerald-300' : 'text-white')}>{dist}m</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Hazards */}
                {currentHoleInfo.hazards && currentHoleInfo.hazards.length > 0 && (
                  <div className="glass-card rounded-xl p-4 mb-4">
                    <div className="font-body text-xs text-emerald-200/70 mb-3 uppercase tracking-wider text-center">{tr('hazards')}</div>
                    <div className="space-y-2">
                      {currentHoleInfo.hazards.map((hazard, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className={'w-3 h-3 rounded-full ' + (hazard.type.includes('water') ? 'bg-blue-500' : 'bg-yellow-600')}></div>
                            <span className="font-body text-sm text-white capitalize">{hazard.type} {hazard.side}</span>
                          </div>
                          <span className="font-display text-base text-white/70">{hazard.distance}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={() => { setShowHoleOverview(false); setPhotoExpanded(false); setShowStrategy(false); }}
                  className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">BEGIN HOLE</button>
                
                {/* Abort Round Button */}
                <button onClick={() => {
                  const msg = settings.language === 'nl' 
                    ? 'Weet je het zeker? De ronde wordt niet opgeslagen.' 
                    : 'Are you sure? The round will not be saved.';
                  if (window.confirm(msg)) {
                    setCurrentScreen('home');
                    setRoundData({ course: null, loop: null, teeColor: null, date: new Date().toISOString().split('T')[0], startTime: new Date().toTimeString().slice(0, 5), temperature: null, holes: [] });
                    setCurrentHoleInfo(null); setCurrentHoleShots([]); setDbHoleData(null);
                    setPhotoExpanded(false); setShowStrategy(false); setShowHoleOverview(false);
                  }
                }} className="w-full bg-red-500/20 border-2 border-red-500/50 hover:bg-red-500/30 rounded-xl py-3 font-body font-medium text-red-300 mt-3 transition">
                  {settings.language === 'nl' ? 'Ronde afbreken' : 'Abort round'}
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="p-6 bg-gradient-to-b from-black/20 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => {
                const msg = settings.language === 'nl' 
                  ? 'Weet je het zeker? De ronde wordt niet opgeslagen.' 
                  : 'Are you sure? The round will not be saved.';
                if (window.confirm(msg)) {
                  setCurrentScreen('home');
                  setRoundData({ course: null, loop: null, teeColor: null, date: new Date().toISOString().split('T')[0], startTime: new Date().toTimeString().slice(0, 5), temperature: null, holes: [] });
                  setCurrentHoleInfo(null); setCurrentHoleShots([]); setDbHoleData(null);
                }
              }}><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={() => { setShowHoleOverview(true); setPhotoExpanded(false); setShowStrategy(false); }}
                className="glass-card px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="font-body text-xs text-emerald-300 uppercase tracking-wider">Hole Info</span>
              </button>
            </div>
            <div className="text-center mb-4">
              <div className="font-display text-5xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">HOLE {currentHole}</div>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="font-body text-emerald-200/70">Par {currentHoleInfo.par}</span>
                <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                <span className="font-body text-emerald-200/70">{currentHoleInfo.totalDistance}m</span>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">{tr('toGo')}</div>
              <div className="font-display text-7xl text-white">{convertDistance(remainingDistance)}<span className="text-4xl text-emerald-300 ml-2">{getUnitLabel()}</span></div>
              <div className="font-body text-xs text-emerald-200/60 mt-2">{tr('toMiddleGreen')}</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 px-6 overflow-y-auto pb-6">
            {/* Club Selection */}
            <div className="mb-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{tr('shot')} {currentHoleShots.length + 1}: {tr('whichClub')}</label>
              <div className="grid grid-cols-4 gap-2">
                {clubs.map((club) => (
                  <button key={club} onClick={() => setSelectedClub(club)}
                    className={'club-btn glass-card rounded-xl py-3 px-2 font-body text-sm font-medium ' + (selectedClub === club ? 'selected' : '')}>{club}</button>
                ))}
              </div>
            </div>

            {/* Distance/Putts confirmation */}
            {selectedClub && (
              <div className="space-y-4 animate-slide-up">
                {selectedClub === 'Putter' ? (
                  <div className="glass-card rounded-xl p-6 bg-emerald-500/10 border-emerald-400/30">
                    <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider text-center">{tr('putts')}</div>
                    <div className="text-center mb-4">
                      <input type="number" value={manualDistance} onChange={(e) => setManualDistance(e.target.value)} placeholder="1"
                        className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center inline-block" />
                      <span className="font-display text-2xl text-emerald-300 ml-2">{manualDistance == 1 ? 'putt' : 'putts'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-xl p-6 bg-emerald-500/10 border-emerald-400/30">
                    <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider text-center">{tr('distancePlayed')}</div>
                    <div className="text-center mb-4">
                      <input type="number" value={manualDistance} onChange={(e) => setManualDistance(e.target.value)} placeholder={suggestedDistance?.toString()}
                        className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center inline-block" />
                      <span className="font-display text-2xl text-emerald-300 ml-2">{getUnitLabel()}</span>
                    </div>
                    <div className="font-body text-xs text-emerald-200/50 text-center">{tr('adjust')}</div>
                  </div>
                )}

                {/* Lie Selection */}
                <div>
                  <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{tr('lie')}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'fairway', emoji: '\u{1F7E2}', color: 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/50' },
                      { key: 'rough', emoji: '\u{1F7E4}', color: 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/50' },
                      { key: 'bunker', emoji: '\u{1F7E1}', color: 'bg-yellow-500 border-yellow-400 text-gray-900 shadow-lg shadow-yellow-500/50' },
                      { key: 'fringe', emoji: '\u{1F7E8}', color: 'bg-lime-500 border-lime-400 text-gray-900 shadow-lg shadow-lime-500/50' },
                      { key: 'green', emoji: '\u{1F7E9}', color: 'bg-emerald-400 border-emerald-300 text-white shadow-lg shadow-emerald-400/50' },
                      { key: 'penalty', emoji: '\u{1F534}', color: 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/50' }
                    ].map(({ key, emoji, color }) => (
                      <button key={key} onClick={() => setSelectedLie(key)}
                        className={'rounded-xl py-4 flex items-center justify-center gap-2 font-body font-medium transition border-2 ' +
                          (selectedLie === key ? color : 'bg-white/10 border-white/20 text-white hover:bg-white/15')}>
                        {emoji} {tr(key)}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={addShot} disabled={!selectedLie}
                  className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider disabled:opacity-50 disabled:cursor-not-allowed">
                  {tr('distanceOk').toUpperCase()}
                </button>
              </div>
            )}

            {/* Shot History */}
            {currentHoleShots.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-body text-xs text-emerald-200/70 uppercase tracking-wider">Slagen dit hole</label>
                  <button onClick={undoLastShot} className="btn-secondary rounded-lg px-3 py-1.5 font-body text-xs font-medium hover:bg-white/20 transition">
                    {'\u21B6'} Ongedaan maken
                  </button>
                </div>
                <div className="space-y-2">
                  {currentHoleShots.map((shot) => (
                    <div key={shot.shotNumber} className="glass-card rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-emerald-500/30 rounded-full flex items-center justify-center font-display text-emerald-300">{shot.shotNumber}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-body font-semibold text-white">{shot.club}</span>
                            {shot.lie && <span className="text-sm">{shot.lie === 'fairway' ? '\u{1F7E2}' : shot.lie === 'rough' ? '\u{1F7E4}' : shot.lie === 'bunker' ? '\u{1F7E1}' : shot.lie === 'fringe' ? '\u{1F7E8}' : shot.lie === 'green' ? '\u{1F7E9}' : '\u{1F534}'}</span>}
                          </div>
                          <div className="font-body text-xs text-emerald-200/60">
                            {shot.club === 'Putter' ? (shot.putts || 1) + ' putt' + ((shot.putts || 1) !== 1 ? 's' : '') : Dist({value: shot.distanceToGreen}) + ' \u2192 ' + Dist({value: shot.distanceToGreen - shot.distancePlayed})}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-display text-2xl text-emerald-300">{shot.club === 'Putter' ? (shot.putts || 1) + '\u00D7' : Dist({value: shot.distancePlayed})}</div>
                        <button onClick={() => deleteShot(shot.shotNumber)} className="text-red-400 hover:text-red-300 text-2xl font-bold transition w-8 h-8 flex items-center justify-center">{'\u00D7'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finish Hole */}
            {currentHoleShots.length > 0 && (
              <div className="space-y-4 mt-6 animate-slide-up">
                <div className="glass-card rounded-2xl p-6 bg-emerald-500/10 border-emerald-400/30">
                  <div className="font-display text-2xl text-emerald-300 mb-4 text-center">Hole Afronden</div>
                  
                  {/* Auto-calculated score summary */}
                  {(() => {
                    const totalPutts = currentHoleShots.filter(s => s.club === 'Putter').reduce((sum, s) => sum + (s.putts || 1), 0);
                    const nonPuttShots = currentHoleShots.filter(s => s.club !== 'Putter').length;
                    const autoScore = nonPuttShots + totalPutts;
                    const si = getStrokeIndex(currentHole);
                    const holePar = currentHoleInfo?.par || 4;
                    const stablefordPts = calculateStablefordForHole(autoScore, holePar, si);
                    const playingHcp = calculatePlayingHandicap();
                    const scoreToPar = autoScore - holePar;
                    
                    return (
                      <>
                        {/* Putts summary */}
                        {totalPutts > 0 && (
                          <div className="mb-4 p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                            <div className="font-body text-sm text-emerald-300 text-center">
                              {'\u26F3'} {totalPutts} putt{totalPutts !== 1 ? 's' : ''} geregistreerd
                            </div>
                          </div>
                        )}
                        
                        {/* Auto score display */}
                        <div className="text-center mb-4">
                          <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                            {settings.language === 'nl' ? 'Score deze hole' : 'Score this hole'}
                          </div>
                          <div className="flex items-center justify-center gap-4">
                            <div>
                              <div className={'font-display text-6xl ' + (scoreToPar < 0 ? 'text-emerald-300' : scoreToPar === 0 ? 'text-white' : 'text-red-300')}>
                                {autoScore}
                              </div>
                              <div className="font-body text-xs text-emerald-200/60 mt-1">
                                {scoreToPar > 0 ? '+' + scoreToPar : scoreToPar < 0 ? scoreToPar : 'Par'} ({nonPuttShots} {settings.language === 'nl' ? 'slagen' : 'shots'} + {totalPutts} {totalPutts === 1 ? 'putt' : 'putts'})
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Stableford points - only show if setting enabled and data available */}
                        {settings.showScore && stablefordPts !== null && (
                          <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl border border-yellow-500/30">
                            <div className="text-center">
                              <div className="font-body text-xs text-yellow-200/70 mb-1 uppercase tracking-wider">Stableford</div>
                              <div className="font-display text-5xl text-yellow-300">{stablefordPts}</div>
                              <div className="font-body text-xs text-yellow-200/50 mt-1">
                                {settings.language === 'nl' ? 'punten' : 'points'}
                                {playingHcp !== null && (' \u2022 Baan HCP: ' + playingHcp)}
                                {si && (' \u2022 SI: ' + si)}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Manual score override */}
                        <div className="mb-4">
                          <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">
                            {settings.language === 'nl' ? 'Score aanpassen (optioneel)' : 'Adjust score (optional)'}
                          </label>
                          <input type="number" id="score-input-bottom" placeholder={autoScore.toString()} defaultValue=""
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition text-center" />
                          <div className="font-body text-xs text-emerald-200/50 mt-1 text-center">
                            {settings.language === 'nl' ? 'Laat leeg om berekende score te gebruiken' : 'Leave empty to use calculated score'}
                          </div>
                        </div>

                        <button onClick={() => {
                          const scoreInput = document.getElementById('score-input-bottom');
                          const manualScore = parseInt(scoreInput?.value);
                          const finalScore = manualScore > 0 ? manualScore : autoScore;
                          finishHole(totalPutts, finalScore);
                        }} className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
                          {'\u2713'} {tr('completeHole').toUpperCase()}
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== STATISTICS SCREEN ==================== */}
      {currentScreen === 'stats' && (
        <div className="animate-slide-up min-h-screen pb-6">
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => { setCurrentScreen('home'); setRoundData({ course: null, loop: null, teeColor: null, date: new Date().toISOString().split('T')[0], startTime: new Date().toTimeString().slice(0, 5), temperature: null, holes: [] }); }} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
            <h1 className="font-display text-3xl">{tr('statistics').toUpperCase()}</h1>
            <div className="w-10" />
          </div>
          <div className="px-6 space-y-6">
            <div className="glass-card rounded-3xl p-8 text-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/30">
              <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">{roundData.course?.name}</div>
              <div className="font-body text-xs text-emerald-200/50 mb-4">{roundData.loop?.name} {'\u2022'} {roundData.date}</div>
              <div className="font-display text-8xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">{stats.totalScore}</div>
              <div className="font-body text-emerald-200/60 text-sm">{stats.holesPlayed} {tr('holesPlayed')}</div>
            </div>
            {/* Stableford Total */}
            {stats.hasStableford && settings.showScore && (
              <div className="glass-card rounded-2xl p-6 text-center bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/30">
                <div className="font-body text-xs text-yellow-200/70 mb-2 uppercase tracking-wider">Stableford Punten</div>
                <div className="font-display text-7xl text-yellow-300">{stats.totalStableford}</div>
                <div className="font-body text-xs text-yellow-200/50 mt-2">
                  Baan HCP: {calculatePlayingHandicap()} {'\u2022'} {settings.gender === 'man' ? 'Heren' : 'Dames'}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-4 text-center">
                <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">{tr('totalPutts')}</div>
                <div className="font-display text-4xl text-teal-300">{stats.totalPutts}</div>
              </div>
              <div className="glass-card rounded-2xl p-4 text-center">
                <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">{tr('avgPutts')}</div>
                <div className="font-display text-4xl text-emerald-300">{stats.holesPlayed > 0 ? (stats.totalPutts / stats.holesPlayed).toFixed(1) : '0'}</div>
              </div>
            </div>
            <div>
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">Score per hole</label>
              <div className="space-y-2">
                {roundData.holes.map((hole) => {
                  const holeData = allHolesData.find(h => h.hole_number === hole.hole);
                  const par = holeData?.par || 4;
                  const scoreToPar = hole.score - par;
                  const scoreColor = scoreToPar < 0 ? 'text-emerald-300' : scoreToPar === 0 ? 'text-white' : 'text-red-300';
                  const si = holeData ? (settings.gender === 'vrouw' ? holeData.stroke_index_ladies : holeData.stroke_index_men) : null;
                  const stbPts = si ? calculateStablefordForHole(hole.score, par, si) : null;
                  
                  return (
                    <div key={hole.hole} className="glass-card rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/30 rounded-full flex items-center justify-center"><div className="font-display text-xl text-emerald-300">{hole.hole}</div></div>
                        <div>
                          <div className="font-body text-xs text-emerald-200/60">Par {par}{si ? ' \u2022 SI ' + si : ''}</div>
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
                          <div className={'font-display text-4xl ' + scoreColor}>{hole.score}</div>
                          <div className="font-body text-xs text-emerald-200/60">{scoreToPar > 0 ? '+' + scoreToPar : scoreToPar < 0 ? scoreToPar : 'E'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button onClick={() => { setCurrentScreen('home'); setRoundData({ course: null, loop: null, teeColor: null, date: new Date().toISOString().split('T')[0], startTime: new Date().toTimeString().slice(0, 5), temperature: null, holes: [] }); }}
              className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">{tr('newRound').toUpperCase()}</button>
          </div>
        </div>
      )}

      {/* ==================== SETTINGS SCREEN ==================== */}
      {currentScreen === 'settings' && (
        <div className="animate-slide-up">
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('home')} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
            <div className="text-center">
              <h1 className="font-display text-3xl">{tr('settings').toUpperCase()}</h1>
              <div className="font-body text-xs text-emerald-300/60 mt-1">v{appVersion}</div>
            </div>
            <div className="w-10" />
          </div>
          <div className="px-6 space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{tr('name')}</label>
              <input type="text" value={settings.name} onChange={(e) => setSettings({...settings, name: e.target.value})} placeholder="Bijv. Jan"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
            </div>
            <div className="glass-card rounded-2xl p-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">THUISSTAD</label>
              <input type="text" value={settings.homeCity} onChange={(e) => setSettings({...settings, homeCity: e.target.value})} placeholder="Bijv. Amsterdam"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
              <div className="mt-3 font-body text-xs text-emerald-200/60">Wordt gebruikt als startpunt voor zoeken als je locatie niet beschikbaar is.</div>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{tr('units')}</label>
              <div className="grid grid-cols-2 gap-3">
                {['meters', 'yards'].map(u => (
                  <button key={u} onClick={() => setSettings({...settings, units: u})}
                    className={'rounded-xl py-4 font-body font-medium transition ' + (settings.units === u ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 text-white hover:bg-white/15')}>
                    {tr(u)}
                  </button>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{tr('language')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setSettings({...settings, language: 'nl'})}
                  className={'rounded-xl py-4 font-body font-medium transition ' + (settings.language === 'nl' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 text-white hover:bg-white/15')}>
                  {'\u{1F1F3}\u{1F1F1}'} Nederlands
                </button>
                <button onClick={() => setSettings({...settings, language: 'en'})}
                  className={'rounded-xl py-4 font-body font-medium transition ' + (settings.language === 'en' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 text-white hover:bg-white/15')}>
                  {'\u{1F1EC}\u{1F1E7}'} English
                </button>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">{tr('handicap')}</label>
              <input type="number" step="0.1" value={settings.handicap || ''} onChange={(e) => setSettings({...settings, handicap: parseFloat(e.target.value) || null})} placeholder="bijv. 13.5"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition" />
            </div>
            {/* Gender */}
            <div className="glass-card rounded-2xl p-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                {settings.language === 'nl' ? 'GESLACHT' : 'GENDER'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setSettings({...settings, gender: 'man'})}
                  className={'rounded-xl py-4 font-body font-medium transition ' + (settings.gender === 'man' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 text-white hover:bg-white/15')}>
                  {settings.language === 'nl' ? 'Man' : 'Male'}
                </button>
                <button onClick={() => setSettings({...settings, gender: 'vrouw'})}
                  className={'rounded-xl py-4 font-body font-medium transition ' + (settings.gender === 'vrouw' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 text-white hover:bg-white/15')}>
                  {settings.language === 'nl' ? 'Vrouw' : 'Female'}
                </button>
              </div>
              <div className="mt-3 font-body text-xs text-emerald-200/60">
                {settings.language === 'nl' ? 'I.v.m. handicapberekening a.d.h.v. baanhandicaptabel' : 'For course handicap calculation based on handicap table'}
              </div>
            </div>
            <button onClick={() => setCurrentScreen('bag')} className="w-full btn-secondary rounded-xl py-4 font-display text-xl tracking-wider">
              {'\u26F3'} {tr('myBag').toUpperCase()}{settings.bag.length > 0 && ' (' + settings.bag.length + '/14)'}
            </button>
            <button onClick={() => { setCurrentScreen('splash'); setSplashWeather(null); }}
              className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">{tr('save').toUpperCase()}</button>
          </div>
        </div>
      )}

      {/* ==================== BAG SCREEN ==================== */}
      {currentScreen === 'bag' && (
        <div className="animate-slide-up min-h-screen pb-6">
          {showBagLimitWarning && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 animate-slide-up">
              <div className="glass-card rounded-3xl p-8 max-w-md border-2 border-red-400/50 text-center">
                <div className="text-6xl mb-4">{'\u26A0\u{FE0F}'}</div>
                <div className="font-display text-3xl text-red-400 mb-3">MAXIMUM 14 CLUBS!</div>
                <div className="font-body text-white">{tr('bagLimitWarning')}</div>
              </div>
            </div>
          )}
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('settings')} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
            <h1 className="font-display text-3xl">{tr('myBag').toUpperCase()}</h1>
            <div className="w-10" />
          </div>
          <div className="px-6 space-y-6">
            <div className="text-center">
              <div className="font-display text-6xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">{settings.bag.length} / 14</div>
              <div className="font-body text-emerald-200/70 text-sm">{tr('bagSubtitle')}</div>
            </div>
            {settings.bag.length > 0 && (
              <button onClick={() => setSettings({...settings, bag: []})} className="w-full btn-secondary rounded-xl py-3 font-body text-sm">
                {'\u{1F5D1}\u{FE0F}'} {tr('clearBag')}
              </button>
            )}
            <div>
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">Selecteer je clubs</label>
              <div className="grid grid-cols-2 gap-3">
                {allClubs.map((club) => {
                  const isSelected = settings.bag.includes(club);
                  return (
                    <button key={club} onClick={() => toggleClubInBag(club)}
                      className={'rounded-xl py-4 px-3 font-body font-medium transition border-2 ' +
                        (isSelected ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/50 transform scale-105' : 'bg-white/10 border-white/20 text-white hover:bg-white/15')}>
                      {isSelected && '\u2713 '}{club}
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={() => setCurrentScreen('settings')} className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">KLAAR</button>
          </div>
        </div>
      )}

      {/* ==================== ALL STATS SCREEN ==================== */}
      {currentScreen === 'allStats' && (
        <div className="animate-slide-up min-h-screen pb-6">
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('home')} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
            <h1 className="font-display text-3xl">STATISTIEKEN</h1>
            <div className="w-10" />
          </div>
          <div className="px-6 space-y-6">
            {savedRounds.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <div className="text-6xl mb-4">{'\u{1F4CA}'}</div>
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
                  {savedRounds.slice(0, 5).map((round, index) => {
                    const totalScore = round.holes.reduce((sum, h) => sum + (h.score || 0), 0);
                    return (
                      <div key={index} className="glass-card rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="font-body font-semibold text-white">{round.course?.name}</div>
                          <div className="font-body text-xs text-emerald-200/60">{round.date}</div>
                        </div>
                        <div className="font-display text-3xl text-emerald-300">{totalScore}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== ROUND HISTORY ==================== */}
      {currentScreen === 'roundHistory' && roundData.holes && (
        <div className="animate-slide-up min-h-screen pb-6">
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('home')} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
            <h1 className="font-display text-2xl">{roundData.course?.name}</h1>
            <div className="w-10" />
          </div>
          <div className="px-6 space-y-6">
            <div className="glass-card rounded-2xl p-6 text-center bg-emerald-500/10 border-emerald-400/30">
              <div className="font-body text-xs text-emerald-200/70 mb-2">{roundData.loop?.name}</div>
              <div className="font-display text-6xl text-white mb-2">{roundData.holes.reduce((sum, h) => sum + (h.score || 0), 0)}</div>
              <div className="font-body text-sm text-emerald-200/60">{roundData.date}</div>
            </div>
            <div className="space-y-3">
              {roundData.holes.map((hole, index) => (
                <div key={index} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-display text-2xl text-emerald-300">HOLE {hole.hole}</div>
                    <div className="font-display text-3xl text-white">{hole.score}</div>
                  </div>
                  {hole.shots && hole.shots.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {hole.shots.map((shot) => (
                        <div key={shot.shotNumber} className="flex items-center justify-between text-sm bg-white/5 rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-emerald-300">{shot.shotNumber}.</span>
                            <span className="font-body">{shot.club}</span>
                          </div>
                          <div className="font-display text-emerald-300">{Dist({value: shot.distancePlayed})}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="font-body text-emerald-200/60">Putts:</span>
                    <span className="font-body text-white">{hole.putts || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== CLUB ANALYSIS ==================== */}
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

      {/* Loading overlay for hole data */}
      {loadingHoleData && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-400 border-t-transparent mx-auto mb-3"></div>
            <div className="font-body text-white text-sm">{tr('loadingHole')}</div>
          </div>
        </div>
      )}
    </div>
  );
}
