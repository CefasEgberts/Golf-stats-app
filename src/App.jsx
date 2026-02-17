import React, { useState } from 'react';
import { ChevronLeft, Plus, TrendingUp, BarChart3, Calendar, MapPin, Check, X, Settings } from 'lucide-react';

export default function GolfStatsApp({ user, profile, onLogout, onAdmin }) {
  const [currentScreen, setCurrentScreen] = useState('splash');
  
  // Initialize settings with username from profile
  const [settings, setSettings] = useState({
    name: profile?.username || profile?.name || 'Golfer',
    units: 'meters',
    language: 'nl',
    handicap: 13.5,
    showScore: false,
    bag: [
      'Driver', 'Houten 3', 'Houten 5', 'Hybride 3',
      'Ijzer 5', 'Ijzer 6', 'Ijzer 7', 'Ijzer 8', 'Ijzer 9',
      'PW', 'SW', 'AW', 'Putter'
    ]
  });
  
  // Update settings when profile changes
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
  const [savedRounds, setSavedRounds] = useState([]); // History of completed rounds
  const [roundData, setRoundData] = useState({
    course: null,
    loop: null,
    teeColor: null,
    date: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5), // HH:MM format
    temperature: null, // Will be fetched
    holes: []
  });
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyCoursesLoading, setNearbyCoursesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  // Splash screen effect
  React.useEffect(() => {
    if (currentScreen === 'splash') {
      // Fetch real weather based on user location
      const fetchRealWeather = async () => {
        try {
          // Get user's location
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
              const { latitude, longitude } = position.coords;
              
              // Fetch weather from Open-Meteo API (free, no key needed)
              const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`
              );
              
              const data = await response.json();
              const temp = Math.round(data.current.temperature_2m);
              
              // Weather codes: https://open-meteo.com/en/docs
              // 0 = clear, 1-3 = cloudy, 45-48 = fog, 51-67 = rain, 71-77 = snow, 80-99 = rain/thunderstorm
              const weatherCode = data.current.weathercode;
              let condition = 'sunny';
              
              if (weatherCode >= 51 && weatherCode <= 99) {
                condition = 'rainy';
              } else if (weatherCode >= 1 && weatherCode <= 48) {
                condition = 'cloudy';
              }
              
              setSplashWeather({ temp, condition });
            }, (error) => {
              // Fallback if location denied
              console.log('Location access denied, using fallback weather');
              const temps = [2, 5, 8, 12, 15, 18, 21, 24];
              const temp = temps[Math.floor(Math.random() * temps.length)];
              const conditions = ['sunny', 'cloudy', 'rainy'];
              const condition = conditions[Math.floor(Math.random() * conditions.length)];
              setSplashWeather({ temp, condition });
            });
          } else {
            // Fallback if geolocation not supported
            const temps = [2, 5, 8, 12, 15, 18, 21, 24];
            const temp = temps[Math.floor(Math.random() * temps.length)];
            const conditions = ['sunny', 'cloudy', 'rainy'];
            const condition = conditions[Math.floor(Math.random() * conditions.length)];
            setSplashWeather({ temp, condition });
          }
        } catch (error) {
          console.error('Weather fetch failed:', error);
          // Fallback on error
          const temps = [2, 5, 8, 12, 15, 18, 21, 24];
          const temp = temps[Math.floor(Math.random() * temps.length)];
          const conditions = ['sunny', 'cloudy', 'rainy'];
          const condition = conditions[Math.floor(Math.random() * conditions.length)];
          setSplashWeather({ temp, condition });
        }
      };
      
      fetchRealWeather();
      
      // Show splash for 2 seconds
      setTimeout(() => {
        setCurrentScreen('home');
      }, 2000);
    }
  }, [currentScreen]);

  // Get time-based greeting
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

  // Get weather-based message
  const getWeatherMessage = () => {
    if (!splashWeather) return '';
    
    const name = settings.name || (settings.language === 'nl' ? 'golfer' : 'golfer');
    
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

  // Fetch temperature when course is selected
  React.useEffect(() => {
    if (roundData.course && roundData.temperature === null) {
      setFetchingWeather(true);
      // Simulate weather API call - in real app use OpenWeatherMap or similar
      setTimeout(() => {
        const temps = [8, 12, 15, 18, 21, 24, 16, 19, 22]; // Random temps
        const temp = temps[Math.floor(Math.random() * temps.length)];
        setRoundData(prev => ({ ...prev, temperature: temp }));
        setFetchingWeather(false);
      }, 800);
    }
  }, [roundData.course]);

  //Voorbeeld banen in Nederland (in productie komt dit van een API)
  // Hole data would come from course database with yardages and hazards
  const getHoleInfo = (courseId, holeNumber) => {
    // In real app, this comes from database with actual course layouts
    // For demo, generating sample data
    const pars = [4, 3, 5, 4, 4, 3, 5, 4, 4]; // Sample par for 9 holes
    const par = pars[(holeNumber - 1) % 9];
    
    const baseDistance = par === 3 ? 150 : par === 4 ? 350 : 480;
    const variation = Math.floor(Math.random() * 50) - 25;
    const totalDistance = baseDistance + variation;
    
    // Generate hazards based on hole type
    const hazards = [];
    if (par >= 4) {
      hazards.push({ type: 'bunker', side: 'links', distance: Math.floor(totalDistance * 0.6) });
      hazards.push({ type: 'bunker', side: 'rechts', distance: Math.floor(totalDistance * 0.65) });
    }
    if (par === 5) {
      hazards.push({ type: 'water', side: 'links', distance: Math.floor(totalDistance * 0.3) });
    }
    if (Math.random() > 0.5) {
      hazards.push({ type: 'fairway bunker', side: 'rechts', distance: Math.floor(totalDistance * 0.5) });
    }
    
    // In real app, actual hole photos from database
    // Using Unsplash golf course images as placeholders
    const photoUrls = [
      'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&q=80', // Golf course aerial
      'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80', // Golf fairway
      'https://images.unsplash.com/photo-1592919505780-303950717480?w=800&q=80', // Golf green
      'https://images.unsplash.com/photo-1596727362302-b8d891c42ab8?w=800&q=80', // Golf hole view
      'https://images.unsplash.com/photo-1587174147455-fa6be35af322?w=800&q=80', // Golf course
    ];
    
    return {
      number: holeNumber,
      par,
      totalDistance,
      hazards,
      greenDepth: 25 + Math.floor(Math.random() * 15),
      fairwayWidth: 25 + Math.floor(Math.random() * 20),
      photoUrl: photoUrls[holeNumber % photoUrls.length]
    };
  };

  const allCourses = [
    { 
      id: 1, 
      name: 'The Dutch', 
      city: 'Spijk',
      distance: 2.3,
      lat: 53.3485,
      lng: 6.8555,
      loops: [
        { id: 'dunes', name: 'Dunes', holes: [1,2,3,4,5,6,7,8,9] },
        { id: 'links', name: 'Links', holes: [10,11,12,13,14,15,16,17,18] },
        { id: 'dunes-links', name: 'Dunes + Links', holes: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18], isFull: true }
      ],
      teeColors: ['Wit', 'Geel', 'Oranje', 'Blauw', 'Zwart']
    },
    { 
      id: 2, 
      name: 'Golfclub de Batouwe', 
      city: 'Dodewaard',
      distance: 4.5,
      lat: 51.9167,
      lng: 5.6500,
      loops: [
        { id: 'appel', name: 'Appel', holes: [1,2,3,4,5,6,7,8,9] },
        { id: 'kers', name: 'Kers', holes: [10,11,12,13,14,15,16,17,18] },
        { id: 'peer', name: 'Peer', holes: [19,20,21,22,23,24,25,26,27] },
        { id: 'appel-kers', name: 'Appel + Kers', holes: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18], isFull: true },
        { id: 'appel-peer', name: 'Appel + Peer', holes: [1,2,3,4,5,6,7,8,9,19,20,21,22,23,24,25,26,27], isFull: true },
        { id: 'kers-peer', name: 'Kers + Peer', holes: [10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27], isFull: true }
      ],
      teeColors: ['Wit', 'Geel', 'Rood', 'Blauw']
    },
    { 
      id: 3, 
      name: 'Haarlemmermeersche', 
      city: 'Cruquius',
      distance: 3.8,
      lat: 52.3283,
      lng: 4.6358,
      loops: [
        { id: 'cruquius', name: 'Cruquius', holes: [1,2,3,4,5,6,7,8,9] },
        { id: 'lynden', name: 'Lynden', holes: [10,11,12,13,14,15,16,17,18] },
        { id: 'leeghwater', name: 'Leeghwater', holes: [19,20,21,22,23,24,25,26,27] },
        { id: 'cruquius-lynden', name: 'Cruquius + Lynden', holes: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18], isFull: true },
        { id: 'cruquius-leeghwater', name: 'Cruquius + Leeghwater', holes: [1,2,3,4,5,6,7,8,9,19,20,21,22,23,24,25,26,27], isFull: true },
        { id: 'lynden-leeghwater', name: 'Lynden + Leeghwater', holes: [10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27], isFull: true }
      ],
      teeColors: ['Wit', 'Geel', 'Rood', 'Blauw', 'Zwart']
    },
    { 
      id: 4, 
      name: 'Noordwijkse Golf Club', 
      city: 'Noordwijk',
      distance: 5.7,
      lat: 52.2584,
      lng: 4.4464,
      loops: [
        { id: 'duinen', name: 'Duinen', holes: [1,2,3,4,5,6,7,8,9] },
        { id: 'bos', name: 'Bos', holes: [10,11,12,13,14,15,16,17,18] },
        { id: 'strand', name: 'Strand', holes: [19,20,21,22,23,24,25,26,27] },
        { id: 'duinen-bos', name: 'Duinen + Bos', holes: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18], isFull: true },
        { id: 'duinen-strand', name: 'Duinen + Strand', holes: [1,2,3,4,5,6,7,8,9,19,20,21,22,23,24,25,26,27], isFull: true },
        { id: 'bos-strand', name: 'Bos + Strand', holes: [10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27], isFull: true }
      ],
      teeColors: ['Wit', 'Geel', 'Rood', 'Blauw']
    },
    { 
      id: 5, 
      name: 'Amsterdamse Golf Club', 
      city: 'Duivendrecht',
      distance: 8.2,
      lat: 52.3167,
      lng: 4.9583,
      loops: [
        { id: 'old', name: 'Old Course', holes: [1,2,3,4,5,6,7,8,9] },
        { id: 'new', name: 'New Course', holes: [10,11,12,13,14,15,16,17,18] },
        { id: 'old-new', name: 'Old + New Course', holes: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18], isFull: true }
      ],
      teeColors: ['Wit', 'Geel', 'Blauw', 'Zwart']
    },
    { 
      id: 6, 
      name: 'Golfbaan Spaarnwoude', 
      city: 'Haarlem',
      distance: 12.1,
      lat: 52.4333,
      lng: 4.7167,
      loops: [
        { id: 'yellow', name: 'Yellow', holes: [1,2,3,4,5,6,7,8,9] },
        { id: 'red', name: 'Red', holes: [10,11,12,13,14,15,16,17,18] },
        { id: 'blue', name: 'Blue', holes: [19,20,21,22,23,24,25,26,27] },
        { id: 'orange', name: 'Orange', holes: [28,29,30,31,32,33,34,35,36] },
        { id: 'green', name: 'Green', holes: [37,38,39,40,41,42,43,44,45] },
        { id: 'purple', name: 'Purple', holes: [46,47,48,49,50,51,52,53,54] },
        { id: 'yellow-red', name: 'Yellow + Red', holes: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18], isFull: true },
        { id: 'blue-orange', name: 'Blue + Orange', holes: [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36], isFull: true },
        { id: 'green-purple', name: 'Green + Purple', holes: [37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54], isFull: true }
      ],
      teeColors: ['Wit', 'Geel', 'Oranje', 'Blauw', 'Zwart']
    },
    { 
      id: 7, 
      name: 'Golfclub Broekpolder', 
      city: 'Vlaardingen',
      distance: 18.5,
      lat: 51.9083,
      lng: 4.3417,
      loops: [
        { id: 'polder', name: 'Polder', holes: [1,2,3,4,5,6,7,8,9] },
        { id: 'water', name: 'Water', holes: [10,11,12,13,14,15,16,17,18] },
        { id: 'park', name: 'Park', holes: [19,20,21,22,23,24,25,26,27] },
        { id: 'polder-water', name: 'Polder + Water', holes: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18], isFull: true },
        { id: 'water-park', name: 'Water + Park', holes: [10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27], isFull: true },
        { id: 'polder-park', name: 'Polder + Park', holes: [1,2,3,4,5,6,7,8,9,19,20,21,22,23,24,25,26,27], isFull: true }
      ],
      teeColors: ['Wit', 'Geel', 'Rood', 'Blauw']
    },
    { 
      id: 8, 
      name: 'Golfcentrum Hoofddorp', 
      city: 'Hoofddorp',
      distance: 4.2,
      lat: 52.3042,
      lng: 4.6889,
      loops: [
        { id: 'north', name: 'North', holes: [1,2,3,4,5,6,7,8,9] },
        { id: 'south', name: 'South', holes: [10,11,12,13,14,15,16,17,18] },
        { id: 'north-south', name: 'North + South', holes: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18], isFull: true }
      ],
      teeColors: ['Wit', 'Geel', 'Rood', 'Blauw']
    }
  ];

  const allClubs = [
    'Driver', 'Houten 3', 'Houten 5', 'Houten 7',
    'Hybride 3', 'Hybride 4',
    'Ijzer 1', 'Ijzer 2', 'Ijzer 3', 'Ijzer 4', 'Ijzer 5', 'Ijzer 6', 'Ijzer 7', 'Ijzer 8', 'Ijzer 9',
    'PW', 'GW', 'AW', 'LW', 'Putter'
  ];

  // Get clubs available for selection (either all clubs or user's bag)
  const getAvailableClubs = () => {
    if (settings.bag.length === 0) return allClubs;
    return settings.bag;
  };

  const clubs = getAvailableClubs();

  // Toggle club in bag
  const toggleClubInBag = (club) => {
    const currentBag = settings.bag;
    if (currentBag.includes(club)) {
      // Remove from bag
      setSettings({...settings, bag: currentBag.filter(c => c !== club)});
    } else {
      // Add to bag (if under 14)
      if (currentBag.length >= 14) {
        setShowBagLimitWarning(true);
        setTimeout(() => setShowBagLimitWarning(false), 2000);
        return;
      }
      setSettings({...settings, bag: [...currentBag, club]});
    }
  };

  // Distance conversion utility
  const convertDistance = (meters) => {
    if (settings.units === 'yards') {
      return Math.round(meters * 1.09361);
    }
    return Math.round(meters);
  };

  const getUnitLabel = () => settings.units === 'yards' ? 'yard' : 'm';

  // Translations
  const t = {
    nl: {
      golfStats: 'GOLF STATS',
      tagline: 'Track. Analyze. Improve.',
      newRound: 'NIEUWE RONDE',
      startTracking: 'Begin met tracken',
      findCourses: 'Vind banen in de buurt',
      searchName: 'Zoek op naam',
      searching: 'Zoeken...',
      useLocation: 'Gebruik locatie',
      nearby: 'In de buurt',
      coursesFound: 'banen',
      whichLoop: 'Welke lus?',
      holes: 'holes',
      combos: '18 holes combinaties',
      whichTee: 'Van welke tee?',
      tee: 'Tee',
      startTime: 'Starttijd',
      temperature: 'Temperatuur',
      autoFetched: 'Automatisch opgehaald',
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
      importantDistances: 'Belangrijke afstanden',
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
      showScoreInput: 'Score tonen tijdens invoeren slag',
      yes: 'Ja',
      no: 'Nee',
      showScoreHelp: 'Wanneer Nee: score wordt alleen getoond aan het einde na het invoeren van de slagen van alle holes',
      myRounds: 'Mijn Scorekaarten',
      noRoundsYet: 'Nog geen rondes gespeeld',
      viewRound: 'Bekijk',
      stablefordPoints: 'Stableford Punten',
      playingHandicap: 'Speel Handicap'
    },
    en: {
      golfStats: 'GOLF STATS',
      tagline: 'Track. Analyze. Improve.',
      newRound: 'NEW ROUND',
      startTracking: 'Start tracking',
      findCourses: 'Find nearby courses',
      searchName: 'Search by name',
      searching: 'Searching...',
      useLocation: 'Use location',
      nearby: 'Nearby',
      coursesFound: 'courses',
      whichLoop: 'Which loop?',
      holes: 'holes',
      combos: '18 holes combinations',
      whichTee: 'Which tee?',
      tee: 'Tee',
      startTime: 'Start time',
      temperature: 'Temperature',
      autoFetched: 'Auto fetched',
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
      importantDistances: 'Important distances',
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
      showScoreInput: 'Show score while entering shots',
      yes: 'Yes',
      no: 'No',
      showScoreHelp: 'When No: score is only shown at the end after entering all shots for all holes',
      myRounds: 'My Scorecards',
      noRoundsYet: 'No rounds played yet',
      viewRound: 'View',
      stablefordPoints: 'Stableford Points',
      playingHandicap: 'Playing Handicap'
    }
  };

  const tr = (key) => t[settings.language][key] || key;

  // Distance display component
  const Dist = ({value}) => `${convertDistance(value)} ${getUnitLabel()}`;

  // Calculate Stableford points for a hole
  const calculateStablefordPoints = (score, par, strokeIndex, playingHandicap) => {
    // Calculate strokes received on this hole based on stroke index
    const strokesReceived = Math.floor(playingHandicap / 18) + (strokeIndex <= (playingHandicap % 18) ? 1 : 0);
    
    // Net score = actual score - strokes received
    const netScore = score - strokesReceived;
    
    // Stableford points based on net score vs par
    const diff = par - netScore;
    if (diff >= 2) return 4; // 2+ under par
    if (diff === 1) return 3; // 1 under par (birdie)
    if (diff === 0) return 2; // par
    if (diff === -1) return 1; // 1 over par (bogey)
    return 0; // 2+ over par
  };

  // Simulate getting user location
  const getNearbyCoursesSimulated = async () => {
    setNearbyCoursesLoading(true);
    
    try {
      // Get user's location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          
          try {
            // Call Supabase Edge Function to search for golf courses
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-golf-courses`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ latitude, longitude })
              }
            );

            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              // Map Google Places results to our course format
              const googleCourses = data.results.map(place => ({
                name: place.name,
                city: place.vicinity || '',
                loops: [{ name: '18 holes', holes: 18 }],
                tees: [{ color: 'Wit', rating: 72.0, slope: 130 }],
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng
              }));
              
              console.log(`Found ${googleCourses.length} golf courses nearby!`, googleCourses);
              // For now, we'll still use the Dutch courses but show we found real ones
            }
          } catch (error) {
            console.error('Error fetching golf courses:', error);
          }
          
          setNearbyCoursesLoading(false);
        }, (error) => {
          console.log('Location denied, using default location');
          setUserLocation({ lat: 52.3676, lng: 4.9041 }); // Amsterdam
          setNearbyCoursesLoading(false);
        });
      } else {
        setUserLocation({ lat: 52.3676, lng: 4.9041 }); // Amsterdam fallback
        setNearbyCoursesLoading(false);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setUserLocation({ lat: 52.3676, lng: 4.9041 });
      setNearbyCoursesLoading(false);
    }
  };

  // Filter courses based on search query
  const getFilteredCourses = () => {
    if (!searchQuery.trim()) {
      return userLocation ? allCourses.slice(0, 5) : [];
    }
    return allCourses.filter(course => 
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredCourses = getFilteredCourses();

  const addShot = () => {
    if (selectedClub === 'Putter') {
      // For Putter: manualDistance is number of putts, distance is 0
      const puttsCount = manualDistance ? parseInt(manualDistance) : 1;
      
      const newShot = {
        shotNumber: currentHoleShots.length + 1,
        club: selectedClub,
        distanceToGreen: remainingDistance,
        distancePlayed: 0, // Putts don't reduce distance
        lie: selectedLie,
        putts: puttsCount // Store putts separately
      };
      
      const updatedShots = [...currentHoleShots, newShot];
      setCurrentHoleShots(updatedShots);
      // Distance stays the same for putts
      
      // Reset for next shot
      setSelectedClub('');
      setSuggestedDistance(null);
      setManualDistance('');
      setSelectedLie('');
    } else {
      // For all other clubs: normal distance tracking
      const distancePlayed = manualDistance ? parseInt(manualDistance) : suggestedDistance;
      
      const newShot = {
        shotNumber: currentHoleShots.length + 1,
        club: selectedClub,
        distanceToGreen: remainingDistance,
        distancePlayed: distancePlayed,
        lie: selectedLie
      };
      
      const updatedShots = [...currentHoleShots, newShot];
      setCurrentHoleShots(updatedShots);
      
      const newRemainingDistance = remainingDistance - distancePlayed;
      setRemainingDistance(Math.max(0, newRemainingDistance));
      
      // Reset for next shot
      setSelectedClub('');
      setSuggestedDistance(null);
      setManualDistance('');
      setSelectedLie('');
    }
  };

  const undoLastShot = () => {
    if(currentHoleShots.length === 0) return;
    const lastShot = currentHoleShots[currentHoleShots.length - 1];
    setRemainingDistance(lastShot.distanceToGreen);
    setCurrentHoleShots(currentHoleShots.slice(0, -1));
    setSelectedClub('');
    setSuggestedDistance(null);
    setManualDistance('');
    setSelectedLie('');
  };

  const deleteShot = (shotNumber) => {
    const newShots = currentHoleShots
      .filter(s => s.shotNumber !== shotNumber)
      .map((s, i) => ({...s, shotNumber: i + 1}));
    setCurrentHoleShots(newShots);
    
    // Recalculate remaining distance based on all remaining shots
    if(newShots.length === 0) {
      setRemainingDistance(currentHoleInfo.totalDistance);
    } else {
      const totalPlayed = newShots.reduce((sum, s) => sum + s.distancePlayed, 0);
      setRemainingDistance(Math.max(0, currentHoleInfo.totalDistance - totalPlayed));
    }
  };
  
  const finishHole = (putts, score) => {
    console.log('finishHole called with putts:', putts, 'score:', score);
    console.log('currentHole:', currentHole);
    console.log('roundData.loop:', roundData.loop);
    console.log('currentHoleShots:', currentHoleShots);
    
    // Save hole data
    const holeData = {
      hole: currentHole,
      shots: currentHoleShots,
      putts,
      score,
      totalShots: currentHoleShots.length + putts
    };
    
    const newHoles = [...roundData.holes, holeData];
    const updatedRound = { ...roundData, holes: newHoles };
    setRoundData(updatedRound);
    
    console.log('Hole data saved:', holeData);
    console.log('Total holes now:', newHoles.length);
    
    // Move to next hole or finish round
    if (!roundData.loop || !roundData.loop.holes) {
      console.error('No loop data!');
      alert('Error: No loop data found');
      return;
    }
    
    const currentIndex = roundData.loop.holes.indexOf(currentHole);
    console.log('Current hole index:', currentIndex, 'of', roundData.loop.holes.length);
    
    if (currentIndex < roundData.loop.holes.length - 1) {
      // Go to next hole
      const nextHole = roundData.loop.holes[currentIndex + 1];
      console.log('Moving to next hole:', nextHole);
      const nextHoleInfo = getHoleInfo(roundData.course.id, nextHole);
      setCurrentHole(nextHole);
      setCurrentHoleInfo(nextHoleInfo);
      setRemainingDistance(nextHoleInfo.totalDistance);
      setCurrentHoleShots([]);
      setSelectedClub('');
      setSuggestedDistance(null);
      setSelectedLie('');
      setShowHoleOverview(true);
    } else {
      // Round complete - save to history
      console.log('Round complete! Going to stats screen');
      setSavedRounds([updatedRound, ...savedRounds]);
      setCurrentScreen('stats');
    }
  };
  
  // Calculate suggested distance when club is selected
  React.useEffect(() => {
    if (selectedClub && remainingDistance) {
      // If it's the first shot, suggest full remaining distance (tee shot)
      if (currentHoleShots.length === 0) {
        setSuggestedDistance(remainingDistance);
      } else {
        // For subsequent shots, suggest remaining distance (could be refined with club averages)
        setSuggestedDistance(remainingDistance);
      }
    }
  }, [selectedClub, remainingDistance, currentHoleShots.length]);

  const calculateStats = () => {
    const completedHoles = roundData.holes.filter(h => h.score);
    const totalScore = completedHoles.reduce((sum, h) => sum + parseInt(h.score || 0), 0);
    const totalPutts = completedHoles.reduce((sum, h) => sum + parseInt(h.putts || 0), 0);
    const girCount = completedHoles.filter(h => h.gir === true).length;
    const girPercentage = completedHoles.length > 0 ? ((girCount / completedHoles.length) * 100).toFixed(1) : 0;
    
    return { totalScore, totalPutts, girPercentage, holesPlayed: completedHoles.length };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap');
        
        .font-display {
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: 0.05em;
        }
        
        .font-body {
          font-family: 'Inter', sans-serif;
        }
        
        .animate-slide-up {
          animation: slideUp 0.4s ease-out;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
        }
        
        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        .club-btn {
          transition: all 0.2s ease;
        }
        
        .club-btn:hover {
          transform: scale(1.05);
        }
        
        .club-btn.selected {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
        }
        
        .stat-card {
          transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
        }
      `}</style>

      {/* Splash Screen */}
      {currentScreen === 'splash' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-slide-up">
          <div className="text-center max-w-md">
            {/* Logo/Title */}
            <div className="font-display text-8xl mb-8 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              GOLF STATS
            </div>
            
            {/* Greeting */}
            <div className="font-display text-4xl text-white mb-6">
              {getGreeting()}
              {settings.name && `, ${settings.name}`}!
            </div>
            
            {/* Weather info */}
            {splashWeather && (
              <div className="glass-card rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="text-6xl">
                    {splashWeather.condition === 'rainy' ? '🌧️' : 
                     splashWeather.condition === 'cloudy' ? '☁️' : '☀️'}
                  </div>
                  <div>
                    <div className="font-display text-5xl text-emerald-300">
                      {convertDistance(splashWeather.temp)}°
                    </div>
                    <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">
                      {settings.language === 'nl' ? 'Celsius' : 'Celsius'}
                    </div>
                  </div>
                </div>
                
                {/* Weather message */}
                <div className="font-body text-lg text-white text-center leading-relaxed">
                  {getWeatherMessage()}
                </div>
              </div>
            )}
            
            {/* Loading indicator */}
            {!splashWeather && (
              <div className="font-body text-emerald-200/60 text-sm">
                {settings.language === 'nl' ? 'Weer ophalen...' : 'Fetching weather...'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Home Screen */}
      {currentScreen === 'home' && (
        <div className="animate-slide-up">
          {/* Header */}
          <div className="p-6 pt-12">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="font-display text-6xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                  {tr('golfStats')}
                </h1>
                <p className="font-body text-emerald-200/70 text-sm">{tr('tagline')}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentScreen('allStats')}
                  className="glass-card p-3 rounded-xl hover:bg-white/15 transition"
                  title="Statistieken"
                >
                  <BarChart3 className="w-6 h-6 text-emerald-400" />
                </button>
                {onAdmin && (
                  <button 
                    onClick={onAdmin}
                    className="glass-card p-3 rounded-xl hover:bg-white/15 transition"
                    title="Admin Dashboard"
                  >
                    <span className="text-emerald-400 text-xl">👑</span>
                  </button>
                )}
                <button 
                  onClick={() => setCurrentScreen('settings')}
                  className="glass-card p-3 rounded-xl hover:bg-white/15 transition"
                  title="Instellingen"
                >
                  <Settings className="w-6 h-6 text-emerald-400" />
                </button>
                {onLogout && (
                  <button 
                    onClick={onLogout}
                    className="glass-card p-3 rounded-xl hover:bg-white/15 transition"
                    title="Uitloggen"
                  >
                    <span className="text-red-400 text-xl">🚪</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="px-6 mt-8">
            {/* My Scorecards - Show if there are saved rounds */}
            {savedRounds.length > 0 && (
              <div className="glass-card rounded-3xl p-8 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display text-3xl mb-1">{tr('myRounds').toUpperCase()}</h2>
                    <p className="font-body text-emerald-200/60 text-sm">
                      {savedRounds.length} {savedRounds.length === 1 ? 'ronde' : 'rondes'}
                    </p>
                  </div>
                  <BarChart3 className="w-12 h-12 text-emerald-400" />
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {savedRounds.slice(0, 20).map((round, index) => (
                    <div key={index} className="glass-card rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition">
                      <button
                        onClick={() => {
                          setRoundData(round);
                          setCurrentScreen('roundHistory');
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-body font-semibold text-white">{round.course.name}</div>
                            <div className="font-body text-xs text-emerald-200/60 mt-1">{round.loop.name}</div>
                            <div className="font-body text-xs text-emerald-200/50 mt-1">
                              {round.date} • {round.time}
                            </div>
                          </div>
                          <div className="text-right mr-4">
                            <div className="font-display text-2xl text-emerald-300">
                              {round.holes.reduce((sum, h) => sum + (h.score || 0), 0)}
                            </div>
                            <div className="font-body text-xs text-emerald-200/60">{tr('viewRound')}</div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const confirmMessage = settings.language === 'nl' 
                            ? `Weet je zeker dat je deze ronde wilt verwijderen?\n\n${round.course.name} - ${round.loop.name}\n${round.date}`
                            : `Are you sure you want to delete this round?\n\n${round.course.name} - ${round.loop.name}\n${round.date}`;
                          
                          if (window.confirm(confirmMessage)) {
                            const newRounds = savedRounds.filter((_, i) => i !== index);
                            setSavedRounds(newRounds);
                          }
                        }}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                        title={settings.language === 'nl' ? 'Verwijder ronde' : 'Delete round'}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card rounded-3xl p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-3xl mb-1">{tr('newRound').toUpperCase()}</h2>
                  <p className="font-body text-emerald-200/60 text-sm">{tr('startTracking')}</p>
                </div>
                <Plus className="w-12 h-12 text-emerald-400" />
              </div>
              
              <div className="space-y-4">
                {/* Location Button or Search Toggle */}
                {!userLocation && !roundData.course && !showSearch && (
                  <div className="space-y-3">
                    <button
                      onClick={getNearbyCoursesSimulated}
                      disabled={nearbyCoursesLoading}
                      className="w-full btn-primary rounded-xl py-4 font-body font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <MapPin className="w-5 h-5" />
                      {nearbyCoursesLoading ? 'Zoeken...' : 'Vind banen in de buurt'}
                    </button>
                    <button
                      onClick={() => setShowSearch(true)}
                      className="w-full btn-secondary rounded-xl py-4 font-body font-medium"
                    >
                      Zoek op naam of plaats
                    </button>
                  </div>
                )}

                {/* Search Input */}
                {showSearch && !roundData.course && (
                  <div className="space-y-3 animate-slide-up">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Zoek baan of plaats..."
                        autoFocus
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300 hover:text-emerald-200"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                      }}
                      className="w-full btn-secondary rounded-xl py-3 font-body text-sm"
                    >
                      Gebruik locatie in plaats daarvan
                    </button>
                  </div>
                )}

                {/* Nearby Courses List */}
                {((userLocation && !roundData.course) || (showSearch && searchQuery)) && (
                  <div className="space-y-3 animate-slide-up">
                    <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">
                      {showSearch ? `${filteredCourses.length} banen gevonden` : 'Banen bij jou in de buurt'}
                    </label>
                    {filteredCourses.length === 0 && showSearch && (
                      <div className="glass-card rounded-xl p-6 text-center">
                        <div className="font-body text-emerald-200/60">
                          Geen banen gevonden voor "{searchQuery}"
                        </div>
                      </div>
                    )}
                    {filteredCourses.map((course) => (
                      <button
                        key={course.id}
                        onClick={() => {
                          setRoundData({ ...roundData, course });
                          setShowSearch(false);
                          setSearchQuery('');
                        }}
                        className="w-full glass-card rounded-xl p-4 text-left hover:bg-white/15 transition group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-body font-semibold text-white group-hover:text-emerald-300 transition">
                              {course.name}
                            </div>
                            <div className="font-body text-xs text-emerald-200/60 mt-1">
                              {course.city}
                            </div>
                          </div>
                          {!showSearch && (
                            <div className="text-right">
                              <div className="font-display text-xl text-emerald-400">
                                {course.distance}km
                              </div>
                            </div>
                          )}
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
                        <div className="font-body font-semibold text-emerald-300 text-lg">
                          {roundData.course.name}
                        </div>
                        <div className="font-body text-xs text-emerald-200/60">
                          {roundData.course.city}
                        </div>
                      </div>
                      <button
                        onClick={() => setRoundData({ ...roundData, course: null })}
                        className="font-body text-xs text-emerald-300 hover:text-emerald-200"
                      >
                        Wijzigen
                      </button>
                    </div>
                    
                    <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">
                      Welke lus speel je?
                    </label>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {roundData.course.loops.filter(l => !l.isFull).map((loop) => (
                        <button
                          key={loop.id}
                          onClick={() => setRoundData({ ...roundData, loop })}
                          className="glass-card rounded-xl p-4 text-center hover:bg-white/15 transition group"
                        >
                          <div className="font-display text-2xl text-emerald-300 group-hover:text-emerald-200 transition mb-1">
                            {loop.name}
                          </div>
                          <div className="font-body text-xs text-emerald-200/60">
                            9 holes
                          </div>
                        </button>
                      ))}
                    </div>

                    {roundData.course.loops.filter(l => l.isFull).length > 0 && (
                      <>
                        <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider mt-4">
                          Of kies een combinatie (18 holes)
                        </label>
                        <div className="space-y-2">
                          {roundData.course.loops.filter(l => l.isFull).map((loop) => (
                            <button
                              key={loop.id}
                              onClick={() => setRoundData({ ...roundData, loop })}
                              className="w-full glass-card rounded-xl p-4 text-left hover:bg-white/15 transition group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-body font-semibold text-white group-hover:text-emerald-300 transition">
                                  {loop.name}
                                </div>
                                <div className="font-body text-sm text-emerald-400">
                                  18 holes
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
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
                          <div className="font-body font-semibold text-white">
                            {roundData.course.name}
                          </div>
                          <div className="font-body text-xs text-emerald-200/70 mt-1">
                            {roundData.loop.name}
                          </div>
                        </div>
                        <button
                          onClick={() => setRoundData({ ...roundData, loop: null })}
                          className="font-body text-xs text-emerald-300 hover:text-emerald-200"
                        >
                          Wijzigen
                        </button>
                      </div>
                    </div>

                    <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                      Van welke tee speel je?
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {roundData.course.teeColors.map((color) => {
                        const colorMap = {
                          'Wit': 'bg-white text-gray-900',
                          'Geel': 'bg-yellow-400 text-gray-900',
                          'Oranje': 'bg-orange-500 text-white',
                          'Rood': 'bg-red-500 text-white',
                          'Blauw': 'bg-blue-500 text-white',
                          'Zwart': 'bg-gray-900 text-white border-2 border-white/30'
                        };
                        return (
                          <button
                            key={color}
                            onClick={() => setRoundData({ ...roundData, teeColor: color })}
                            className={`${colorMap[color]} rounded-xl py-5 font-body font-bold text-lg hover:scale-105 transition shadow-lg`}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Date, Time & Temperature Selection */}
                {roundData.course && roundData.loop && roundData.teeColor && (
                  <div className="space-y-4 animate-slide-up">
                    <div className="glass-card rounded-xl p-4 bg-emerald-500/10 border-emerald-400/30">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-body font-semibold text-white">
                            {roundData.course.name}
                          </div>
                          <div className="font-body text-xs text-emerald-200/70 mt-1">
                            {roundData.loop.name}
                          </div>
                        </div>
                        <button
                          onClick={() => setRoundData({ ...roundData, teeColor: null })}
                          className="font-body text-xs text-emerald-300 hover:text-emerald-200"
                        >
                          Wijzigen
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          roundData.teeColor === 'Wit' ? 'bg-white text-gray-900' :
                          roundData.teeColor === 'Geel' ? 'bg-yellow-400 text-gray-900' :
                          roundData.teeColor === 'Oranje' ? 'bg-orange-500 text-white' :
                          roundData.teeColor === 'Rood' ? 'bg-red-500 text-white' :
                          roundData.teeColor === 'Blauw' ? 'bg-blue-500 text-white' :
                          'bg-gray-900 text-white border border-white/30'
                        }`}>
                          {roundData.teeColor} Tee
                        </div>
                      </div>
                    </div>

                    {/* Start Time */}
                    <div>
                      <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">
                        Starttijd
                      </label>
                      <input
                        type="time"
                        value={roundData.startTime}
                        onChange={(e) => setRoundData({ ...roundData, startTime: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                      />
                    </div>

                    {/* Temperature */}
                    <div>
                      <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">
                        Temperatuur (°C)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={roundData.temperature || ''}
                          onChange={(e) => setRoundData({ ...roundData, temperature: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder={fetchingWeather ? 'Ophalen...' : 'bijv. 18'}
                          disabled={fetchingWeather}
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition disabled:opacity-50"
                        />
                        {roundData.temperature && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-body text-sm">
                            °C
                          </div>
                        )}
                      </div>
                      <div className="font-body text-xs text-emerald-200/50 mt-2">
                        {fetchingWeather ? '🌡️ Automatisch ophalen...' : '🌡️ Automatisch opgehaald, aanpasbaar'}
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">Datum</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={roundData.date}
                          onChange={(e) => setRoundData({ ...roundData, date: e.target.value })}
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                        />
                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none" />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const firstHole = roundData.loop.holes[0];
                        const holeInfo = getHoleInfo(roundData.course.id, firstHole);
                        setCurrentHole(firstHole);
                        setCurrentHoleInfo(holeInfo);
                        setRemainingDistance(holeInfo.totalDistance);
                        setCurrentHoleShots([]);
                        setSelectedClub('');
                        setSuggestedDistance(null);
                        setShowHoleOverview(true);
                        setCurrentScreen('track');
                      }}
                      className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider mt-6"
                    >
                      START RONDE
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Preview */}
            {!userLocation && !roundData.course && (
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setCurrentScreen('stats')}
                  className="glass-card rounded-2xl p-6 text-left hover:bg-white/10 transition"
                >
                  <TrendingUp className="w-8 h-8 text-emerald-400 mb-3" />
                  <div className="font-display text-2xl">12.4</div>
                  <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">Handicap</div>
                </button>
                
                <button 
                  onClick={() => setCurrentScreen('clubs')}
                  className="glass-card rounded-2xl p-6 text-left hover:bg-white/10 transition"
                >
                  <BarChart3 className="w-8 h-8 text-teal-400 mb-3" />
                  <div className="font-display text-2xl">18</div>
                  <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">Rondes</div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shot Tracking Screen */}
      {currentScreen === 'track' && roundData.loop && currentHoleInfo && (
        <div className="animate-slide-up min-h-screen flex flex-col bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900">
          
          {/* Hole Overview Modal */}
          {showHoleOverview && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-slide-up">
              <div className="glass-card rounded-3xl p-6 max-w-md w-full border-2 border-emerald-400/50 max-h-[90vh] overflow-y-auto">
                {/* Hole Header */}
                <div className="text-center mb-4">
                  <div className="font-display text-6xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                    HOLE {currentHoleInfo.number}
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="font-body text-emerald-200/70 text-sm uppercase tracking-wider">
                      Par {currentHoleInfo.par}
                    </div>
                    <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                    <div className="font-body text-emerald-200/70 text-sm uppercase tracking-wider">
                      {currentHoleInfo.totalDistance}m
                    </div>
                  </div>
                </div>

                {/* Hole Visual with distances annotated */}
                <div className="mb-4 rounded-2xl overflow-hidden bg-gradient-to-b from-emerald-900/40 via-green-800/30 to-green-900/50 border border-emerald-600/30 relative">
                  <div className="relative h-64 p-4">
                    {/* Sky/Background */}
                    <div className="absolute inset-0 bg-gradient-to-b from-sky-900/20 to-transparent"></div>
                    
                    {/* Tee Box */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <div className="w-16 h-4 bg-amber-700/80 rounded-sm"></div>
                      <div className="text-center mt-1 font-body text-[10px] text-white/50 uppercase tracking-wider">Tee</div>
                    </div>
                    
                    {/* Fairway */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-24 h-48 bg-gradient-to-t from-green-700/60 to-green-600/40" style={{ clipPath: 'polygon(40% 100%, 60% 100%, 55% 0%, 45% 0%)' }}></div>
                    
                    {/* Hazards with distance labels */}
                    {currentHoleInfo.hazards.slice(0, 4).map((hazard, i) => {
                      const bottomPos = (hazard.distance / currentHoleInfo.totalDistance * 180) + 20;
                      const leftOffset = hazard.side === 'links' ? -40 : 40;
                      return (
                        <div 
                          key={i}
                          className="absolute left-1/2"
                          style={{ 
                            bottom: `${bottomPos}px`,
                            transform: `translateX(calc(-50% + ${leftOffset}px))`
                          }}
                        >
                          <div className={`w-10 h-7 rounded-full ${
                            hazard.type.includes('water') 
                              ? 'bg-blue-600/70 shadow-lg shadow-blue-500/50' 
                              : 'bg-yellow-600/70 shadow-lg shadow-yellow-500/50'
                          }`}></div>
                          {/* Distance label on hazard */}
                          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-display text-white whitespace-nowrap">
                            {hazard.distance}m
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Green with front/back distances */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2">
                      {/* Back of green label */}
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-500/80 px-2 py-1 rounded text-[10px] font-display text-white whitespace-nowrap">
                        Achterkant: {currentHoleInfo.totalDistance + 10}m
                      </div>
                      
                      <div className="w-24 h-16 bg-emerald-500/50 rounded-full blur-[1px]"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-12 bg-emerald-400/60 rounded-full"></div>
                      
                      {/* Flag */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-10 bg-white/90"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-3 bg-red-500/80 -mt-5 ml-0.5" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}></div>
                      
                      {/* Middle green label */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 px-2 py-1 rounded text-xs font-display text-emerald-900 font-bold whitespace-nowrap mt-2">
                        {tr('middle')}: {Dist({value: currentHoleInfo.totalDistance})}
                      </div>
                      
                      {/* Front of green label */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 bg-emerald-500/80 px-2 py-1 rounded text-[10px] font-display text-white whitespace-nowrap">
                        {tr('front')}: {Dist({value: currentHoleInfo.totalDistance - 10})}
                      </div>
                    </div>
                  </div>
                  
                  {/* Photo note */}
                  <div className="px-4 pb-3 text-center border-t border-white/10 pt-3">
                    <div className="font-body text-[10px] text-emerald-200/40 uppercase tracking-wider">
                      📸 In de echte app: echte foto van dit hole
                    </div>
                  </div>
                </div>

                {/* Quick distances reference */}
                <div className="glass-card rounded-xl p-4 mb-4">
                  <div className="font-body text-xs text-emerald-200/70 mb-3 uppercase tracking-wider text-center">
                    {tr('importantDistances')}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="font-body text-xs text-emerald-200/60">{tr('front')}</div>
                      <div className="font-display text-lg text-white">{Dist({value: currentHoleInfo.totalDistance - 10})}</div>
                    </div>
                    <div className="bg-emerald-500/20 rounded-lg p-2 border border-emerald-400/30">
                      <div className="font-body text-xs text-emerald-200/60">{tr('middle')}</div>
                      <div className="font-display text-xl text-emerald-300">{Dist({value: currentHoleInfo.totalDistance})}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 col-span-2">
                      <div className="font-body text-xs text-emerald-200/60">{tr('back')}</div>
                      <div className="font-display text-lg text-white">{Dist({value: currentHoleInfo.totalDistance + 10})}</div>
                    </div>
                  </div>
                </div>

                {/* Hazards list */}
                {currentHoleInfo.hazards.length > 0 && (
                  <div className="glass-card rounded-xl p-4 mb-4">
                    <div className="font-body text-xs text-emerald-200/70 mb-3 uppercase tracking-wider text-center">
                      Hindernissen
                    </div>
                    <div className="space-y-2">
                      {currentHoleInfo.hazards.map((hazard, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${hazard.type.includes('water') ? 'bg-blue-500' : 'bg-yellow-600'}`}></div>
                            <span className="font-body text-sm text-white capitalize">
                              {hazard.type} {hazard.side}
                            </span>
                          </div>
                          <span className="font-display text-base text-white/70">{hazard.distance}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Continue Button */}
                <button
                  onClick={() => setShowHoleOverview(false)}
                  className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider"
                >
                  BEGIN HOLE
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="p-6 bg-gradient-to-b from-black/20 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentScreen('home')}>
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setShowHoleOverview(true)}
                className="glass-card px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="font-body text-xs text-emerald-300 uppercase tracking-wider">Hole Info</span>
              </button>
            </div>
            
            <div className="text-center mb-4">
              <div className="font-display text-5xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                HOLE {currentHole}
              </div>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="font-body text-emerald-200/70">Par {currentHoleInfo.par}</span>
                <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                <span className="font-body text-emerald-200/70">{currentHoleInfo.totalDistance}m</span>
              </div>
            </div>

            {/* Remaining Distance - BIG */}
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                {tr('toGo')}
              </div>
              <div className="font-display text-7xl text-white">
                {convertDistance(remainingDistance)}
                <span className="text-4xl text-emerald-300 ml-2">{getUnitLabel()}</span>
              </div>
              <div className="font-body text-xs text-emerald-200/60 mt-2">
                {tr('toMiddleGreen')}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 px-6 overflow-y-auto pb-6">
            
            {/* Club Selection */}
            <div className="mb-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                {tr('shot')} {currentHoleShots.length + 1}: {tr('whichClub')}
              </label>
                  <div className="grid grid-cols-4 gap-2">
                    {clubs.map((club) => (
                      <button
                        key={club}
                        onClick={() => setSelectedClub(club)}
                        className={`club-btn glass-card rounded-xl py-3 px-2 font-body text-sm font-medium ${
                          selectedClub === club ? 'selected' : ''
                        }`}
                      >
                        {club}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance/Putts confirmation - only show when club is selected */}
                {selectedClub && (
                  <div className="space-y-4 animate-slide-up">
                    {selectedClub === 'Putter' ? (
                      /* Putts input for Putter */
                      <div className="glass-card rounded-xl p-6 bg-emerald-500/10 border-emerald-400/30">
                        <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider text-center">
                          {tr('putts')}
                        </div>
                        <div className="text-center mb-4">
                          <input
                            type="number"
                            value={manualDistance}
                            onChange={(e) => setManualDistance(e.target.value)}
                            placeholder="1"
                            className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition text-center inline-block"
                          />
                          <span className="font-display text-2xl text-emerald-300 ml-2">
                            {manualDistance == 1 ? 'putt' : 'putts'}
                          </span>
                        </div>
                        <div className="font-body text-xs text-emerald-200/50 text-center">
                          {settings.language === 'nl' ? 'Hoeveel putts?' : 'How many putts?'}
                        </div>
                      </div>
                    ) : (
                      /* Distance input for all other clubs */
                      <div className="glass-card rounded-xl p-6 bg-emerald-500/10 border-emerald-400/30">
                        <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider text-center">
                          {tr('distancePlayed')}
                        </div>
                        <div className="text-center mb-4">
                          <input
                            type="number"
                            value={manualDistance}
                            onChange={(e) => setManualDistance(e.target.value)}
                            placeholder={suggestedDistance?.toString()}
                            className="w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-display text-4xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition text-center inline-block"
                          />
                          <span className="font-display text-2xl text-emerald-300 ml-2">{getUnitLabel()}</span>
                        </div>
                        <div className="font-body text-xs text-emerald-200/50 text-center">
                          {tr('adjust')}
                        </div>
                      </div>
                    )}

                    {/* Lie Type Selection */}
                    <div>
                      <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                        {tr('lie')}
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => setSelectedLie('fairway')}
                          className={`rounded-xl py-4 flex items-center justify-center gap-2 font-body font-medium transition border-2 ${
                            selectedLie === 'fairway' 
                              ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/50' 
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                          }`}
                        >
                          🟢 {tr('fairway')}
                        </button>
                        <button
                          onClick={() => setSelectedLie('rough')}
                          className={`rounded-xl py-4 flex items-center justify-center gap-2 font-body font-medium transition border-2 ${
                            selectedLie === 'rough' 
                              ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/50' 
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                          }`}
                        >
                          🟤 {tr('rough')}
                        </button>
                        <button
                          onClick={() => setSelectedLie('bunker')}
                          className={`rounded-xl py-4 flex items-center justify-center gap-2 font-body font-medium transition border-2 ${
                            selectedLie === 'bunker' 
                              ? 'bg-yellow-500 border-yellow-400 text-gray-900 shadow-lg shadow-yellow-500/50' 
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                          }`}
                        >
                          🟡 {tr('bunker')}
                        </button>
                        <button
                          onClick={() => setSelectedLie('fringe')}
                          className={`rounded-xl py-4 flex items-center justify-center gap-2 font-body font-medium transition border-2 ${
                            selectedLie === 'fringe' 
                              ? 'bg-lime-500 border-lime-400 text-gray-900 shadow-lg shadow-lime-500/50' 
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                          }`}
                        >
                          🟨 {tr('fringe')}
                        </button>
                        <button
                          onClick={() => setSelectedLie('green')}
                          className={`rounded-xl py-4 flex items-center justify-center gap-2 font-body font-medium transition border-2 ${
                            selectedLie === 'green' 
                              ? 'bg-emerald-400 border-emerald-300 text-white shadow-lg shadow-emerald-400/50' 
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                          }`}
                        >
                          🟩 {tr('green')}
                        </button>
                        <button
                          onClick={() => setSelectedLie('penalty')}
                          className={`rounded-xl py-4 flex items-center justify-center gap-2 font-body font-medium transition border-2 ${
                            selectedLie === 'penalty' 
                              ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/50' 
                              : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                          }`}
                        >
                          🔴 {tr('penalty')}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={addShot}
                      disabled={!selectedLie}
                      className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tr('distanceOk').toUpperCase()}
                    </button>
                  </div>
                )}

            {/* Shot History */}
            {currentHoleShots.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-body text-xs text-emerald-200/70 uppercase tracking-wider">
                    Slagen dit hole
                  </label>
                  <button 
                    onClick={undoLastShot}
                    className="btn-secondary rounded-lg px-3 py-1.5 font-body text-xs font-medium hover:bg-white/20 transition"
                  >
                    ↶ Ongedaan maken
                  </button>
                </div>
                <div className="space-y-2">
                  {currentHoleShots.map((shot) => (
                    <div key={shot.shotNumber} className="glass-card rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-emerald-500/30 rounded-full flex items-center justify-center font-display text-emerald-300">
                          {shot.shotNumber}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-body font-semibold text-white">{shot.club}</span>
                            {shot.lie && (
                              <span className="text-sm">
                                {shot.lie === 'fairway' ? '🟢' : 
                                 shot.lie === 'rough' ? '🟤' : 
                                 shot.lie === 'bunker' ? '🟡' : 
                                 shot.lie === 'fringe' ? '🟨' :
                                 shot.lie === 'green' ? '🟩' : '🔴'}
                              </span>
                            )}
                          </div>
                          <div className="font-body text-xs text-emerald-200/60">
                            {shot.club === 'Putter' 
                              ? `${shot.putts || 1} putt${(shot.putts || 1) !== 1 ? 's' : ''}`
                              : `${Dist({value: shot.distanceToGreen})} → ${Dist({value: shot.distanceToGreen - shot.distancePlayed})}`
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-display text-2xl text-emerald-300">
                          {shot.club === 'Putter'
                            ? `${shot.putts || 1}×`
                            : Dist({value: shot.distancePlayed})
                          }
                        </div>
                        <button 
                          onClick={() => deleteShot(shot.shotNumber)}
                          className="text-red-400 hover:text-red-300 text-2xl font-bold transition w-8 h-8 flex items-center justify-center"
                          title={settings.language === 'nl' ? 'Verwijder slag' : 'Delete shot'}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finish Hole Inputs - Always available when shots exist */}
            {currentHoleShots.length > 0 && (
              <div className="space-y-4 mt-6 animate-slide-up">
                <div className="glass-card rounded-2xl p-6 bg-emerald-500/10 border-emerald-400/30">
                  <div className="font-display text-2xl text-emerald-300 mb-4 text-center">
                    {settings.language === 'nl' ? 'Hole Afronden' : 'Finish Hole'}
                  </div>
                  
                  {/* Show putts summary if Putter was used */}
                  {currentHoleShots.some(shot => shot.club === 'Putter') && (
                    <div className="mb-4 p-4 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                      <div className="font-body text-sm text-emerald-300 text-center">
                        ⛳ {(() => {
                          const totalPutts = currentHoleShots
                            .filter(shot => shot.club === 'Putter')
                            .reduce((sum, shot) => sum + (shot.putts || 1), 0);
                          return settings.language === 'nl'
                            ? `${totalPutts} putt${totalPutts !== 1 ? 's' : ''} geregistreerd`
                            : `${totalPutts} putt${totalPutts !== 1 ? 's' : ''} recorded`;
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Score input - always show */}
                  <div className="mb-4">
                    <label className="font-body text-xs text-emerald-200/70 mb-2 block uppercase tracking-wider">
                      {tr('score')}
                    </label>
                    <input
                      type="number"
                      id="score-input-bottom"
                      placeholder="0"
                      defaultValue=""
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition text-center"
                    />
                  </div>

                  <button
                    onClick={() => {
                      const scoreInput = document.getElementById('score-input-bottom');
                      const score = parseInt(scoreInput?.value) || 0;
                      
                      // Auto-calculate putts from Putter shots
                      const putts = currentHoleShots
                        .filter(shot => shot.club === 'Putter')
                        .reduce((sum, shot) => sum + (shot.putts || 1), 0);
                      
                      console.log('Bottom button: Finishing hole with putts:', putts, 'score:', score);
                      
                      if (score > 0) {
                        finishHole(putts, score);
                      } else {
                        alert(settings.language === 'nl' ? 'Voer een score in!' : 'Enter a score!');
                      }
                    }}
                    className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider"
                  >
                    ✓ {tr('completeHole').toUpperCase()}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics Screen */}
      {currentScreen === 'stats' && (
        <div className="animate-slide-up min-h-screen pb-6">
          {/* Header */}
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => {
              setCurrentScreen('home');
              setRoundData({ 
                course: null, loop: null, teeColor: null, 
                date: new Date().toISOString().split('T')[0],
                startTime: new Date().toTimeString().slice(0, 5),
                temperature: null, holes: [] 
              });
            }} className="p-2">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-display text-3xl">{tr('statistics').toUpperCase()}</h1>
            <div className="w-10" />
          </div>

          <div className="px-6 space-y-6">
            {/* Total Score */}
            <div className="glass-card rounded-3xl p-8 text-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/30">
              <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                {roundData.course?.name}
              </div>
              <div className="font-body text-xs text-emerald-200/50 mb-4">
                {roundData.loop?.name} • {roundData.date}
              </div>
              <div className="font-display text-8xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                {stats.totalScore}
              </div>
              <div className="font-body text-emerald-200/60 text-sm">
                {stats.holesPlayed} {tr('holesPlayed')}
              </div>
            </div>

            {/* Handicap Impact */}
            {settings.handicap && (
              <div className="glass-card rounded-2xl p-6 bg-emerald-500/10 border-emerald-400/30">
                <div className="font-body text-xs text-emerald-200/70 mb-4 uppercase tracking-wider text-center">
                  Handicap Impact
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="font-body text-xs text-emerald-200/60 mb-1">Was</div>
                    <div className="font-display text-4xl text-white">{settings.handicap}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-body text-xs text-emerald-200/60 mb-1">Wordt</div>
                    <div className="font-display text-4xl text-emerald-300">
                      {(() => {
                        // Simple handicap calculation: (score - course rating) * 0.1
                        // For demo: assume par total is course rating
                        const parTotal = roundData.holes.length * 4; // Simplified
                        const scoreDiff = stats.totalScore - parTotal;
                        const newHandicap = Math.max(0, settings.handicap + (scoreDiff * 0.1));
                        return newHandicap.toFixed(1);
                      })()}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-center font-body text-xs text-emerald-200/50">
                  {settings.language === 'nl' ? 'Gebaseerd op deze ronde' : 'Based on this round'}
                </div>
              </div>
            )}

            {/* Hole by Hole Scores */}
            <div>
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                {settings.language === 'nl' ? 'Score per hole' : 'Score per hole'}
              </label>
              <div className="space-y-2">
                {roundData.holes.map((hole) => {
                  const par = 4; // Simplified - in real app use actual par from course
                  const scoreToPar = hole.score - par;
                  const scoreColor = scoreToPar < 0 ? 'text-emerald-300' : scoreToPar === 0 ? 'text-white' : 'text-red-300';
                  
                  return (
                    <div key={hole.hole} className="glass-card rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/30 rounded-full flex items-center justify-center">
                          <div className="font-display text-xl text-emerald-300">{hole.hole}</div>
                        </div>
                        <div>
                          <div className="font-body text-xs text-emerald-200/60">Par {par}</div>
                          <div className="font-body text-xs text-emerald-200/50">
                            {hole.shots?.length || 0} {settings.language === 'nl' ? 'slagen' : 'shots'} + {hole.putts} {settings.language === 'nl' ? 'putts' : 'putts'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-display text-4xl ${scoreColor}`}>
                          {hole.score}
                        </div>
                        <div className="font-body text-xs text-emerald-200/60">
                          {scoreToPar > 0 ? `+${scoreToPar}` : scoreToPar < 0 ? scoreToPar : 'E'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-4 text-center">
                <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                  {tr('totalPutts')}
                </div>
                <div className="font-display text-4xl text-teal-300">{stats.totalPutts}</div>
              </div>
              <div className="glass-card rounded-2xl p-4 text-center">
                <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                  {tr('avgPutts')}
                </div>
                <div className="font-display text-4xl text-emerald-300">
                  {stats.holesPlayed > 0 ? (stats.totalPutts / stats.holesPlayed).toFixed(1) : '0'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={() => {
                setCurrentScreen('home');
                setRoundData({ 
                  course: null, loop: null, teeColor: null, 
                  date: new Date().toISOString().split('T')[0],
                  startTime: new Date().toTimeString().slice(0, 5),
                  temperature: null, holes: [] 
                });
              }}
              className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider"
            >
              {tr('newRound').toUpperCase()}
            </button>
          </div>
        </div>
      )}

      {/* Settings Screen */}
      {currentScreen === 'settings' && (
        <div className="animate-slide-up">
          {/* Header */}
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('home')} className="p-2">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-display text-3xl">{tr('settings').toUpperCase()}</h1>
            <div className="w-10" />
          </div>

          <div className="px-6 space-y-6">
            {/* Name */}
            <div className="glass-card rounded-2xl p-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                {tr('name')}
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({...settings, name: e.target.value})}
                placeholder={settings.language === 'nl' ? 'Bijv. Jan' : 'e.g. John'}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              />
              {settings.name && (
                <div className="mt-3 font-body text-sm text-emerald-300">
                  {settings.language === 'nl' ? `Hallo, ${settings.name}! 👋` : `Hello, ${settings.name}! 👋`}
                </div>
              )}
            </div>

            {/* Units */}
            <div className="glass-card rounded-2xl p-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                {tr('units')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSettings({...settings, units: 'meters'})}
                  className={`rounded-xl py-4 font-body font-medium transition ${
                    settings.units === 'meters' 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' 
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {tr('meters')}
                </button>
                <button
                  onClick={() => setSettings({...settings, units: 'yards'})}
                  className={`rounded-xl py-4 font-body font-medium transition ${
                    settings.units === 'yards' 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' 
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {tr('yards')}
                </button>
              </div>
              <div className="mt-3 font-body text-xs text-emerald-200/60">
                {settings.language === 'nl' 
                  ? `Alle afstanden worden weergegeven in ${settings.units === 'meters' ? 'meters' : 'yards'}` 
                  : `All distances will be shown in ${settings.units}`}
              </div>
            </div>

            {/* Language */}
            <div className="glass-card rounded-2xl p-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                {tr('language')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSettings({...settings, language: 'nl'})}
                  className={`rounded-xl py-4 font-body font-medium transition ${
                    settings.language === 'nl' 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' 
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  🇳🇱 {tr('dutch')}
                </button>
                <button
                  onClick={() => setSettings({...settings, language: 'en'})}
                  className={`rounded-xl py-4 font-body font-medium transition ${
                    settings.language === 'en' 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' 
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  🇬🇧 {tr('english')}
                </button>
              </div>
            </div>

            {/* Handicap */}
            <div className="glass-card rounded-2xl p-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                {tr('handicap')}
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.handicap || ''}
                onChange={(e) => setSettings({...settings, handicap: parseFloat(e.target.value) || null})}
                placeholder={tr('handicapPlaceholder')}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 font-body text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              />
              <div className="mt-3 font-body text-xs text-emerald-200/60">
                {settings.language === 'nl' 
                  ? 'Voor Stableford punten berekening' 
                  : 'For Stableford points calculation'}
              </div>
            </div>

            {/* Show Score Input */}
            <div className="glass-card rounded-2xl p-6">
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                {tr('showScoreInput')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSettings({...settings, showScore: true})}
                  className={`rounded-xl py-4 font-body font-medium transition ${
                    settings.showScore 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' 
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {tr('yes')}
                </button>
                <button
                  onClick={() => setSettings({...settings, showScore: false})}
                  className={`rounded-xl py-4 font-body font-medium transition ${
                    !settings.showScore 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' 
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {tr('no')}
                </button>
              </div>
              <div className="mt-3 font-body text-xs text-emerald-200/60">
                {tr('showScoreHelp')}
              </div>
            </div>

            {/* Example with conversion */}
            <div className="glass-card rounded-2xl p-6 bg-emerald-500/10 border-emerald-400/30">
              <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                {settings.language === 'nl' ? 'Voorbeeld' : 'Example'}
              </div>
              <div className="font-body text-white">
                350 {settings.language === 'nl' ? 'meter' : 'meters'} = <span className="font-display text-2xl text-emerald-300">{convertDistance(350)} {getUnitLabel()}</span>
              </div>
            </div>

            {/* My Bag button */}
            <button
              onClick={() => setCurrentScreen('bag')}
              className="w-full btn-secondary rounded-xl py-4 font-display text-xl tracking-wider"
            >
              ⛳ {tr('myBag').toUpperCase()}
              {settings.bag.length > 0 && (
                <span className="ml-2 text-sm font-body">({settings.bag.length}/14)</span>
              )}
            </button>

            {/* Save button */}
            <button
              onClick={() => {
                setCurrentScreen('splash');
                setSplashWeather(null);
              }}
              className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider"
            >
              {tr('save').toUpperCase()}
            </button>
          </div>
        </div>
      )}

      {/* My Bag Screen */}
      {currentScreen === 'bag' && (
        <div className="animate-slide-up min-h-screen pb-6">
          {/* Warning overlay */}
          {showBagLimitWarning && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 animate-slide-up">
              <div className="glass-card rounded-3xl p-8 max-w-md border-2 border-red-400/50 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <div className="font-display text-3xl text-red-400 mb-3">
                  {settings.language === 'nl' ? 'MAXIMUM 14 CLUBS!' : 'MAXIMUM 14 CLUBS!'}
                </div>
                <div className="font-body text-white">
                  {tr('bagLimitWarning')}
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('settings')} className="p-2">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-display text-3xl">{tr('myBag').toUpperCase()}</h1>
            <div className="w-10" />
          </div>

          <div className="px-6 space-y-6">
            {/* Counter and subtitle */}
            <div className="text-center">
              <div className="font-display text-6xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                {settings.bag.length} / 14
              </div>
              <div className="font-body text-emerald-200/70 text-sm">
                {tr('bagSubtitle')}
              </div>
            </div>

            {/* Clear bag button */}
            {settings.bag.length > 0 && (
              <button
                onClick={() => setSettings({...settings, bag: []})}
                className="w-full btn-secondary rounded-xl py-3 font-body text-sm"
              >
                🗑️ {tr('clearBag')}
              </button>
            )}

            {/* Club selection grid */}
            <div>
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                {settings.language === 'nl' ? 'Selecteer je clubs' : 'Select your clubs'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {allClubs.map((club) => {
                  const isSelected = settings.bag.includes(club);
                  return (
                    <button
                      key={club}
                      onClick={() => toggleClubInBag(club)}
                      className={`rounded-xl py-4 px-3 font-body font-medium transition border-2 ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/50 transform scale-105'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                      }`}
                    >
                      {isSelected && '✓ '}
                      {club}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info message */}
            {settings.bag.length > 0 && (
              <div className="glass-card rounded-xl p-4 bg-emerald-500/10 border-emerald-400/30 text-center">
                <div className="font-body text-sm text-emerald-200/80">
                  {tr('useDuringRound')}
                </div>
              </div>
            )}

            {/* Done button */}
            <button
              onClick={() => setCurrentScreen('settings')}
              className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider"
            >
              {settings.language === 'nl' ? 'KLAAR' : 'DONE'}
            </button>
          </div>
        </div>
      )}

      {/* All Statistics Screen */}
      {currentScreen === 'allStats' && (
        <div className="animate-slide-up min-h-screen pb-6">
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('home')} className="p-2">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-display text-3xl">STATISTIEKEN</h1>
            <div className="w-10" />
          </div>

          <div className="px-6 space-y-6">
            {savedRounds.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <div className="text-6xl mb-4">📊</div>
                <div className="font-display text-2xl text-emerald-300 mb-2">
                  {settings.language === 'nl' ? 'Nog geen data' : 'No data yet'}
                </div>
                <div className="font-body text-emerald-200/60">
                  {settings.language === 'nl' 
                    ? 'Speel eerst een ronde om statistieken te zien' 
                    : 'Play a round first to see statistics'}
                </div>
              </div>
            ) : (
              <>
                {/* Overall Summary */}
                <div className="glass-card rounded-3xl p-8 text-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/30">
                  <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                    {settings.name || 'Jouw Stats'}
                  </div>
                  <div className="font-display text-7xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                    {settings.handicap || '--'}
                  </div>
                  <div className="font-body text-emerald-200/60 text-sm">Handicap</div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="font-body text-emerald-200/70 text-sm">
                      {savedRounds.length} {savedRounds.length === 1 ? 'ronde' : 'rondes'} gespeeld
                    </div>
                  </div>
                </div>

                {/* Scoring Averages */}
                <div>
                  <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                    Gemiddelde Scores
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-card rounded-xl p-6 text-center">
                      <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                        Gemiddelde Score
                      </div>
                      <div className="font-display text-5xl text-emerald-300">
                        {(() => {
                          const totalScore = savedRounds.reduce((sum, r) => 
                            sum + r.holes.reduce((s, h) => s + (h.score || 0), 0), 0);
                          const totalHoles = savedRounds.reduce((sum, r) => sum + r.holes.length, 0);
                          return totalHoles > 0 ? (totalScore / totalHoles).toFixed(1) : '0';
                        })()}
                      </div>
                      <div className="font-body text-xs text-emerald-200/60 mt-1">per hole</div>
                    </div>
                    <div className="glass-card rounded-xl p-6 text-center">
                      <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                        Beste Ronde
                      </div>
                      <div className="font-display text-5xl text-teal-300">
                        {Math.min(...savedRounds.map(r => 
                          r.holes.reduce((sum, h) => sum + (h.score || 0), 0)
                        ))}
                      </div>
                      <div className="font-body text-xs text-emerald-200/60 mt-1">
                        {savedRounds.length > 0 ? '9 holes' : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Putting Stats */}
                <div>
                  <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                    Putting
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card rounded-xl p-4 text-center">
                      <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                        Gem. Putts
                      </div>
                      <div className="font-display text-4xl text-emerald-300">
                        {(() => {
                          const totalPutts = savedRounds.reduce((sum, r) => 
                            sum + r.holes.reduce((s, h) => s + (h.putts || 0), 0), 0);
                          const totalHoles = savedRounds.reduce((sum, r) => sum + r.holes.length, 0);
                          return totalHoles > 0 ? (totalPutts / totalHoles).toFixed(1) : '0';
                        })()}
                      </div>
                    </div>
                    <div className="glass-card rounded-xl p-4 text-center">
                      <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                        Minste
                      </div>
                      <div className="font-display text-4xl text-teal-300">
                        {(() => {
                          const allPutts = savedRounds.flatMap(r => r.holes.map(h => h.putts || 0));
                          return allPutts.length > 0 ? Math.min(...allPutts) : '0';
                        })()}
                      </div>
                    </div>
                    <div className="glass-card rounded-xl p-4 text-center">
                      <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">
                        Meeste
                      </div>
                      <div className="font-display text-4xl text-red-300">
                        {(() => {
                          const allPutts = savedRounds.flatMap(r => r.holes.map(h => h.putts || 0));
                          return allPutts.length > 0 ? Math.max(...allPutts) : '0';
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shot Distribution */}
                <div>
                  <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                    Lie Verdeling
                  </label>
                  <div className="glass-card rounded-xl p-6">
                    {(() => {
                      const allShots = savedRounds.flatMap(r => 
                        r.holes.flatMap(h => h.shots || [])
                      );
                      const lieCount = {
                        fairway: allShots.filter(s => s.lie === 'fairway').length,
                        rough: allShots.filter(s => s.lie === 'rough').length,
                        bunker: allShots.filter(s => s.lie === 'bunker').length,
                        fringe: allShots.filter(s => s.lie === 'fringe').length,
                        green: allShots.filter(s => s.lie === 'green').length,
                        penalty: allShots.filter(s => s.lie === 'penalty').length,
                      };
                      const total = Object.values(lieCount).reduce((a, b) => a + b, 0);
                      
                      return (
                        <div className="space-y-3">
                          {Object.entries(lieCount).map(([lie, count]) => {
                            const percentage = total > 0 ? (count / total * 100).toFixed(0) : 0;
                            const emoji = lie === 'fairway' ? '🟢' : 
                                        lie === 'rough' ? '🟤' : 
                                        lie === 'bunker' ? '🟡' : 
                                        lie === 'fringe' ? '🟨' :
                                        lie === 'green' ? '🟩' : '🔴'; 
                                        lie === 'green' ? '🟩' : '🔴';
                            const label = lie.charAt(0).toUpperCase() + lie.slice(1);
                            
                            return count > 0 ? (
                              <div key={lie} className="flex items-center gap-3">
                                <div className="text-lg">{emoji}</div>
                                <div className="flex-1">
                                  <div className="flex justify-between mb-1">
                                    <span className="font-body text-sm text-white">{label}</span>
                                    <span className="font-body text-sm text-emerald-300">{count} ({percentage}%)</span>
                                  </div>
                                  <div className="w-full bg-white/10 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        lie === 'fairway' ? 'bg-green-500' : 
                                        lie === 'rough' ? 'bg-amber-600' : 
                                        lie === 'bunker' ? 'bg-yellow-500' : 
                                        lie === 'green' ? 'bg-emerald-400' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Recent Rounds */}
                <div>
                  <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                    Laatste 5 Rondes
                  </label>
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
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Round History Viewer */}
      {currentScreen === 'roundHistory' && roundData.holes && (
        <div className="animate-slide-up min-h-screen pb-6">
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('home')} className="p-2">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-display text-2xl">{roundData.course?.name}</h1>
            <div className="w-10" />
          </div>

          <div className="px-6 space-y-6">
            {/* Round Summary */}
            <div className="glass-card rounded-2xl p-6 text-center bg-emerald-500/10 border-emerald-400/30">
              <div className="font-body text-xs text-emerald-200/70 mb-2">{roundData.loop?.name}</div>
              <div className="font-display text-6xl text-white mb-2">
                {roundData.holes.reduce((sum, h) => sum + (h.score || 0), 0)}
              </div>
              <div className="font-body text-sm text-emerald-200/60">
                {roundData.date} • {roundData.time}
              </div>
            </div>

            {/* Holes List */}
            <div>
              <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">
                Hole voor hole
              </label>
              <div className="space-y-3">
                {roundData.holes.map((hole, index) => (
                  <div key={index} className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-display text-2xl text-emerald-300">HOLE {hole.hole}</div>
                      <div className="font-display text-3xl text-white">{hole.score}</div>
                    </div>
                    
                    {/* Shots */}
                    {hole.shots && hole.shots.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {hole.shots.map((shot) => (
                          <div key={shot.shotNumber} className="flex items-center justify-between text-sm bg-white/5 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <span className="font-display text-emerald-300">{shot.shotNumber}.</span>
                              <span className="font-body">{shot.club}</span>
                              {shot.lie && (
                                <span>
                                  {shot.lie === 'fairway' ? '🟢' : 
                                   shot.lie === 'rough' ? '🟤' : 
                                   shot.lie === 'bunker' ? '🟡' : 
                                   shot.lie === 'fringe' ? '🟨' :
                                   shot.lie === 'green' ? '🟩' : '🔴'}
                                </span>
                              )}
                            </div>
                            <div className="font-display text-emerald-300">{Dist({value: shot.distancePlayed})}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Putts */}
                    <div className="flex justify-between text-sm">
                      <span className="font-body text-emerald-200/60">Putts:</span>
                      <span className="font-body text-white">{hole.putts || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Club Analysis Screen */}
      {currentScreen === 'clubs' && (
        <div className="animate-slide-up">
          {/* Header */}
          <div className="p-6 flex items-center justify-between">
            <button onClick={() => setCurrentScreen('home')} className="p-2">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-display text-3xl">CLUB ANALYSE</h1>
            <div className="w-10" />
          </div>

          <div className="px-6 space-y-3">
            <p className="font-body text-emerald-200/60 text-sm text-center mb-6">
              Statistieken worden beschikbaar na meerdere rondes
            </p>

            {/* Example Club Stats */}
            {['Driver', '7-Iron', 'Putter'].map((club, i) => (
              <div key={club} className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-display text-2xl">{club}</div>
                  <div className="font-body text-xs text-emerald-200/60 uppercase tracking-wider">
                    {Math.floor(Math.random() * 20) + 10} keer gebruikt
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="font-body text-xs text-emerald-200/70 mb-1 uppercase tracking-wider">Gem. Afstand</div>
                    <div className="font-display text-xl text-emerald-300">{180 + i * 50}m</div>
                  </div>
                  <div>
                    <div className="font-body text-xs text-emerald-200/70 mb-1 uppercase tracking-wider">GIR %</div>
                    <div className="font-display text-xl text-teal-300">{45 + i * 15}%</div>
                  </div>
                  <div>
                    <div className="font-body text-xs text-emerald-200/70 mb-1 uppercase tracking-wider">Accuraatheid</div>
                    <div className="font-display text-xl text-emerald-300">{65 + i * 10}%</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="glass-card rounded-2xl p-8 text-center mt-6">
              <BarChart3 className="w-16 h-16 text-emerald-400/50 mx-auto mb-4" />
              <div className="font-body text-emerald-200/60">
                Speel meer rondes om gedetailleerde club statistieken te zien
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
