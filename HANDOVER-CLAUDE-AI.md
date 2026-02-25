# Golf Stats App — Handover Document voor Claude.ai
> Upload dit document aan het begin van je sessie zodat Claude direct de volledige context heeft.

---

## Project Overzicht

**Golf Stats App** is een PWA voor het tracken van golfronden met live GPS, hole-foto's, Stableford scoring en AI-analyse.

| Item | Waarde |
|---|---|
| **Live URL** | golf-stats-app-peach.vercel.app |
| **Domein** | golfstats.nl (DNS pending via TransIP) |
| **GitHub** | Golf-stats-app repo |
| **Versie** | v1.40 |
| **Datum** | 25 februari 2026 |

---

## Tech Stack

| Laag | Technologie |
|---|---|
| Frontend | React 18 + Tailwind CSS 3 + Vite 4 |
| Backend | Supabase (PostgreSQL + Edge Functions + Storage) |
| Hosting | Vercel |
| Icons | lucide-react |
| Fonts | Bebas Neue (display) + Inter (body) |

**Supabase:**
- Project ID: `owocwwrzyspbpapmtckp`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93b2N3d3J6eXNwYnBhcG10Y2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjg4MzksImV4cCI6MjA4NjkwNDgzOX0.gt7sFERmogirDSqq0o6yxI3KG0ukhitkujBe4uynaPo`

**package.json dependencies:**
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "lucide-react": "^0.263.1",
  "@supabase/supabase-js": "^2.38.0"
}
```

---

## Projectstructuur

```
src/
├── App.jsx                    # Hoofdcomponent (935 regels), routing + tracking screen
├── main.jsx                   # Entry point, auth flow, Root component
├── LoginScreen.jsx            # Login scherm (email/wachtwoord via Supabase Auth)
├── AdminDashboard.jsx         # Admin: gebruikers beheren
├── index.css                  # Base styles, fonts, scrollbar
├── lib/
│   ├── supabase.js            # Supabase client (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
│   ├── gps.js                 # calculateDistance (km), haversineMeters, getCurrentPosition
│   ├── constants.js           # ALL_CLUBS, DEFAULT_BAGS, CITY_COORDINATES, TEE_COLOR_CLASSES, FALLBACK_PARS
│   ├── translations.js        # nl/en vertalingen, tr(language, key) functie
│   └── stableford.js          # calculatePlayingHandicap, calculateStablefordForHole, getStrokeIndex
├── hooks/
│   ├── useWeather.js          # Weer via open-meteo.com API
│   ├── useCourseData.js       # Supabase queries voor banen, holes, ratings, tees
│   └── useRound.js            # Ronde state: shots, holes, score, putts
├── components/
│   ├── SplashScreen.jsx       # Weer + begroeting
│   ├── StatsScreen.jsx        # Scorekaart na ronde
│   ├── SettingsScreen.jsx     # Naam, handicap, geslacht, eenheden, taal
│   ├── BagScreen.jsx          # Club selectie (max 14)
│   └── RoundHistory.jsx       # Eerder gespeelde ronde bekijken
```

**Config bestanden:**
- `vite.config.js` — Vite + React plugin, base: '/'
- `tailwind.config.js` — Content: `./index.html` + `./src/**/*.{js,ts,jsx,tsx}`, fonts: display (Bebas Neue), body (Inter)
- `public/manifest.json` — PWA manifest met golf-icon-512.svg
- `.github/workflows/auto-version.yml` — Auto-bump versie bij push

---

## Database Schema

### Tabel: `golf_courses`
| Kolom | Type | Beschrijving |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Baannaam |
| `latitude` | numeric | |
| `longitude` | numeric | |
| `loops` | jsonb | Array: `[{id, name, holes: [1..9], isFull: false}, {id: "cruquius-leeghwater", name: "Cruquius + Leeghwater", holes: [1..18], isFull: true}]` |
| `tee_colors` | jsonb | Bijv. `["Wit","Geel","Blauw","Rood"]` |
| `city` | text | |

### Tabel: `golf_holes`
| Kolom | Type | Beschrijving |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | text | Bijv. "haarlemmermeersche-cruquius" |
| `loop_id` | text | Bijv. "cruquius" |
| `hole_number` | integer | 1-9 |
| `par` | integer | |
| `stroke_index_men` | integer | |
| `stroke_index_ladies` | integer | |
| `distances` | jsonb | `{"wit": 384, "geel": 369, "blauw": 338, "rood": 338}` |
| `photo_url` | text | URL naar hole foto |
| `hole_strategy` | text | Speeladvies |
| `strategy_is_ai_generated` | boolean | |
| `hazards` | jsonb | |
| `latitude` | double precision | **GPS midden van de green** |
| `longitude` | double precision | **GPS midden van de green** |

### Tabel: `course_ratings`
| Kolom | Type | Beschrijving |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | text | |
| `loop_id` | text | |
| `combo_id` | text nullable | Voor 18-holes combinaties |
| `gender` | text | "man" of "vrouw" |
| `tee_color` | text | |
| `course_rating` | numeric | CR waarde |
| `slope_rating` | integer | Slope waarde |
| `par` | integer | Par voor de loop |
| `holes` | integer | 9 of 18 |

### Tabel: `combo_stroke_index`
| Kolom | Type | Beschrijving |
|---|---|---|
| `combo_id` | text | Bijv. "cruquius-leeghwater" |
| `hole_number` | integer | 1-18 |
| `stroke_index_men` | integer | Hernummerde SI |
| `stroke_index_ladies` | integer | |
| `source_loop` | text | Originele loop (bijv. "cruquius" voor hole 1-9) |

### Tabel: `profiles`
| Kolom | Type | Beschrijving |
|---|---|---|
| `id` | uuid PK | Matcht auth.users.id |
| `email` | text | |
| `name` | text | Volledige naam |
| `username` | text | Roepnaam (voor begroeting) |
| `approved` | boolean | Account goedgekeurd? |
| `role` | text | "user" of "admin" |

---

## Banen in Database

### 1. Haarlemmermeersche Golf Club — VOLLEDIG
- **Lussen:** Cruquius, Leeghwater, Lynden (elk 9 holes)
- **Combo's:** 6 stuks (cruquius-leeghwater, cruquius-lynden, leeghwater-cruquius, leeghwater-lynden, lynden-cruquius, lynden-leeghwater)
- **Tee-kleuren:** Wit, Geel, Oranje, Blauw, Rood, Zwart
- **CR/Slope:** Volledig ingevuld voor 9-hole en 18-hole combo's

**GPS Coordinaten (midden green) — Cruquius:** VOLLEDIG
| Hole | Latitude | Longitude |
|---|---|---|
| 1 | 52.33687738471238 | 4.657382728377972 |
| 2 | 52.33838195950194 | 4.654843725581544 |
| 3 | 52.33868988432179 | 4.650461074977808 |
| 4 | 52.33579374730557 | 4.6558708096161405 |
| 5 | 52.33817147801686 | 4.651775232240094 |
| 6 | 52.33925115945819 | 4.649191573561674 |
| 7 | 52.33925895490574 | 4.654862863747138 |
| 8 | 52.33967990650536 | 4.65280231626077 |
| 9 | 52.339750064715716 | 4.654767172687399 |

**Leeghwater holes 1-9:** GPS coordinaten ONTBREKEN
**Lynden holes 1-9:** GPS coordinaten ONTBREKEN

### 2. Spaarnwoude — SQL NOG NIET UITGEVOERD
- **Lussen:** C (par 37), D (par 36), E (par 35)
- **Combo's:** C-D, C-E, D-C, D-E, E-C, E-D
- **Tee-kleuren:** Wit, Geel, Blauw, Rood
- De volledige SQL staat in `golf-app-project-samenvatting-22feb.md`

---

## Edge Function

**`analyze-hole-photo.ts`** — GEDEPLOYED op Supabase
- Model: `claude-haiku-4-5-20251001`
- Analyseert hole foto's en retourneert: par, distances, hazards, hole_strategy, strategy_is_ai_generated, crop coordinates

---

## Huidige Features (v1.40)

1. **Splash screen** met weer (open-meteo API) + tijdgebonden begroeting
2. **Baanselectie** via GPS nabijheid of zoeken in database
3. **Lusselectie** — 9-hole knoppen + 18-hole combo dropdown
4. **Tee-kleur selectie** — dynamisch uit database (distances veld van hole 1)
5. **Shot tracking** per hole — club selectie, afstand (auto/manueel), lie (fairway/rough/bunker/fringe/green/penalty)
6. **Putter registratie** — aantal putts invoeren
7. **Hole Info overlay** — foto met positie-pijl (remaining distance indicator), strategie tekst, green vlag marker
8. **Stableford scoring** — baan HCP berekening (HCP Index * Slope / 113 + CR - Par), SI-gebaseerde punten
9. **Score overzicht** per hole + totaal na ronde
10. **Instellingen** — naam, handicap, geslacht, eenheden (m/yards), taal (nl/en), thuisstad
11. **Club bag management** — max 14 clubs, default bag per email
12. **Ronde historie** — bekijken + verwijderen (in-memory, niet persistent naar DB)
13. **Admin dashboard** — gebruikers bekijken, blokkeren, verwijderen
14. **Login** — email/wachtwoord via Supabase Auth met approval check

---

## App Flow

```
main.jsx (Root)
  ├── LoginScreen (niet ingelogd)
  ├── AdminDashboard (admin + showAdmin)
  └── GolfStatsApp (ingelogd)
       ├── splash → 2 sec auto-navigate → home
       ├── home → baan selectie → lus selectie → tee kleur → start/tijd/temp → START RONDE
       ├── track → club selectie → afstand → lie → AFSTAND AKKOORD → [herhaal] → HOLE AFRONDEN
       │   └── Hole Info overlay (foto + strategie)
       ├── stats → scorekaart na ronde
       ├── settings → naam/handicap/geslacht/eenheden/taal
       ├── bag → club selectie
       ├── roundHistory → detail van opgeslagen ronde
       ├── allStats → statistieken overzicht
       └── clubs → club analyse (placeholder)
```

---

## Belangrijke Code Patronen

### Screen navigatie
De app gebruikt `currentScreen` state in App.jsx:
```javascript
const [currentScreen, setCurrentScreen] = useState('splash');
// Mogelijke waarden: 'splash', 'home', 'track', 'stats', 'settings', 'bag', 'roundHistory', 'allStats', 'clubs'
```

### Hooks structuur
```javascript
const weather = useWeather();     // { splashWeather, fetchSplashWeather, fetchCourseWeather, ... }
const courseData = useCourseData(); // { courseRating, allHolesData, dbHoleData, fetchAvailableTees, ... }
const round = useRound();         // { roundData, currentHole, currentHoleShots, addShot, saveHole, ... }
```

### Stableford berekening
```javascript
// Playing handicap (baanhandicap)
playingHcp = Math.round((hcpIndex * slope / 113) + (cr - par));

// Extra slagen per hole (9-hole)
if (playingHcp >= strokeIndex) extraStrokes += 1;
if (playingHcp >= strokeIndex + 9) extraStrokes += 1;
if (playingHcp >= strokeIndex + 18) extraStrokes += 1;

// Netto score → Stableford punten
netScore = score - extraStrokes;
diff = holePar - netScore;
// diff >= 3 → 5 pts, 2 → 4, 1 → 3, 0 → 2, -1 → 1, else → 0
```

### 18-hole combo logica
Bij combo's (bijv. "Cruquius + Leeghwater"):
- `combo_stroke_index` tabel bevat hernummerde SI voor holes 1-18
- `source_loop` veld geeft aan welke originele 9-hole loop de hole komt
- Hole 10+ worden opgehaald als hole_number - 9 uit de source_loop
- Course rating wordt opgehaald via `combo_id` in plaats van `loop_id`

### Nearby courses
- Haalt alle banen op uit `golf_courses`, berekent Haversine afstand naar GPS locatie
- Fallback: gebruikt `settings.homeCity` coordinaten uit `CITY_COORDINATES`

---

## CSS Design System

**Achtergrond:** `bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900`

**Glass cards:**
```css
.glass-card {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.12);
}
```

**Knoppen:**
```css
.btn-primary { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.btn-secondary { background: rgba(255,255,255,0.1); }
```

**Animatie:** `.animate-slide-up` — slideUp 0.4s ease-out (opacity + translateY)

**Kleuren:** Emerald/teal als primair, geel voor Stableford, rood voor over par / fouten

---

## Wat er nog NIET werkt / TODO's

### Hoge prioriteit
- [ ] **Spaarnwoude SQL uitvoeren** — 5 stappen SQL staat in `golf-app-project-samenvatting-22feb.md`
- [ ] **GPS live tracking** — Rode knipperende dot op hole-foto, real-time afstand tot green
  - `golf_holes.latitude/longitude` = midden green (al in DB voor Cruquius)
  - Needs: `useGpsTracking.js` hook met watchPosition
  - GPS dot positie op foto = `1 - (remainingDist / totalDist)` als top% ratio
  - CSS: `@keyframes gpsBlink { 50% { opacity: 0.4; } }`

### Medium prioriteit
- [ ] **DNS fixen** golfstats.nl (TransIP A record naar 216.198.79.1 + CNAME www)
- [ ] **GPS coordinaten** Leeghwater holes 1-9 invoeren in DB
- [ ] **GPS coordinaten** Lynden holes 1-9 invoeren in DB
- [ ] **Hole foto's uploaden** (Haarlemmermeersche + Spaarnwoude)

### Laag prioriteit
- [ ] Spaarnwoude omgekeerde combi CR/Slope checken
- [ ] 18-hole ronde met Stableford end-to-end testen
- [ ] Rondes persistent opslaan in Supabase (nu alleen in-memory)

---

## Volledige Broncode

Hieronder volgt de complete broncode van alle bestanden. Dit is nodig zodat je direct code kunt schrijven/wijzigen.

---

### `src/main.jsx`
```jsx
import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { supabase } from './lib/supabase'
import LoginScreen from './LoginScreen'
import AdminDashboard from './AdminDashboard'
import GolfStatsApp from './App'
import './index.css'

function Root() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (authUser) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    setUser(authUser);
    setProfile(data);
    setLoading(false);
  };

  const handleLogin = (authUser, userProfile) => {
    setUser(authUser);
    setProfile(userProfile);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setShowAdmin(false);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        gap: '20px'
      }}>
        <div style={{
          width: '50px', height: '50px',
          border: '4px solid rgba(16,185,129,0.1)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ color: '#10b981', fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', letterSpacing: '2px' }}>
          GOLF STATS
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (showAdmin && profile?.role === 'admin') {
    return <AdminDashboard onBack={() => setShowAdmin(false)} />;
  }

  return (
    <GolfStatsApp
      user={user}
      profile={profile}
      onLogout={handleLogout}
      onAdmin={profile?.role === 'admin' ? () => setShowAdmin(true) : null}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
```

---

### `src/lib/supabase.js`
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

### `src/lib/gps.js`
```javascript
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const haversineMeters = (lat1, lng1, lat2, lng2) => {
  return calculateDistance(lat1, lng1, lat2, lng2) * 1000;
};

export const getCurrentPosition = () =>
  new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000
    })
  );
```

---

### `src/lib/constants.js`
```javascript
export const ALL_CLUBS = [
  'Driver', 'Houten 3', 'Houten 5', 'Houten 7',
  'Hybride 3', 'Hybride 4',
  'Ijzer 1', 'Ijzer 2', 'Ijzer 3', 'Ijzer 4', 'Ijzer 5',
  'Ijzer 6', 'Ijzer 7', 'Ijzer 8', 'Ijzer 9',
  'PW', 'GW', 'SW', 'AW', 'LW', 'Putter'
];

export const DEFAULT_BAGS = {
  'cefas@golfstats.nl': [
    'Driver', 'Houten 3', 'Houten 5', 'Hybride 3',
    'Ijzer 5', 'Ijzer 6', 'Ijzer 7', 'Ijzer 8', 'Ijzer 9',
    'PW', 'AW', 'SW', 'Putter'
  ]
};

export const CITY_COORDINATES = {
  'Amsterdam':   { lat: 52.3676, lng: 4.9041 },
  'Rotterdam':   { lat: 51.9244, lng: 4.4777 },
  'Den Haag':    { lat: 52.0705, lng: 4.3007 },
  'Utrecht':     { lat: 52.0907, lng: 5.1214 },
  'Eindhoven':   { lat: 51.4416, lng: 5.4697 },
  'Groningen':   { lat: 53.2194, lng: 6.5665 },
  'Tilburg':     { lat: 51.5555, lng: 5.0913 },
  'Almere':      { lat: 52.3508, lng: 5.2647 },
  'Breda':       { lat: 51.5719, lng: 4.7683 },
  'Nijmegen':    { lat: 51.8126, lng: 5.8372 },
  'Haarlem':     { lat: 52.3874, lng: 4.6462 },
  'Arnhem':      { lat: 51.9851, lng: 5.8987 },
  'Enschede':    { lat: 52.2215, lng: 6.8937 },
  'Apeldoorn':   { lat: 52.2112, lng: 5.9699 },
  'Hoofddorp':   { lat: 52.3026, lng: 4.6891 },
  'Maastricht':  { lat: 50.8514, lng: 5.6909 },
  'Leiden':      { lat: 52.1601, lng: 4.4970 },
  'Dordrecht':   { lat: 51.8133, lng: 4.6690 },
  'Zoetermeer':  { lat: 52.0575, lng: 4.4933 },
  'Zwolle':      { lat: 52.5168, lng: 6.0830 }
};

export const TEE_COLOR_CLASSES = {
  'wit':    'bg-white text-gray-900',
  'geel':   'bg-yellow-400 text-gray-900',
  'oranje': 'bg-orange-500 text-white',
  'rood':   'bg-red-500 text-white',
  'blauw':  'bg-blue-500 text-white',
  'zwart':  'bg-gray-900 text-white border border-white/30'
};

export const TEE_COLOR_ORDER = ['wit', 'geel', 'oranje', 'blauw', 'rood'];

export const FALLBACK_PARS = [4, 3, 5, 4, 4, 3, 5, 4, 4];
```

---

### `src/lib/translations.js`
```javascript
export const translations = {
  nl: {
    golfStats: 'GOLF STATS', tagline: 'Track. Analyze. Improve.',
    newRound: 'NIEUWE RONDE', startTracking: 'Begin met tracken',
    whichTee: 'Van welke tee?', tee: 'Tee', startTime: 'Starttijd',
    temperature: 'Temperatuur', date: 'Datum', startRound: 'START RONDE',
    hole: 'HOLE', par: 'Par', toGo: 'Nog te gaan',
    toMiddleGreen: 'tot midden green', onGreen: 'OP DE GREEN!',
    finishHole: 'Rond de hole af', putts: 'Aantal putts',
    score: 'Score voor dit hole', completeHole: 'HOLE AFRONDEN',
    shot: 'Slag', whichClub: 'Welke club?', distancePlayed: 'Geslagen afstand',
    adjust: 'Pas aan indien nodig', distanceOk: 'AFSTAND AKKOORD',
    shotsThisHole: 'Slagen dit hole', undo: 'Ongedaan maken',
    holeInfo: 'Hole Info', importantDistances: 'Afstanden per tee',
    front: 'Voorkant green', middle: 'Midden green', back: 'Achterkant green',
    hazards: 'Hindernissen', beginHole: 'BEGIN HOLE',
    statistics: 'STATISTIEKEN', holesPlayed: 'holes gespeeld',
    totalPutts: 'Total Putts', avgPutts: 'Avg Putts',
    settings: 'Instellingen', name: 'Voornaam', units: 'Eenheden',
    meters: 'Meters', yards: 'Yards', language: 'Taal',
    dutch: 'Nederlands', english: 'Engels', save: 'Opslaan',
    change: 'Wijzig', lie: 'Lie', fairway: 'Fairway', rough: 'Rough',
    bunker: 'Bunker', penalty: 'Penalty', green: 'Green', fringe: 'Fringe',
    myBag: 'Wat zit er in mijn tas?', bagSubtitle: 'Selecteer maximaal 14 clubs',
    clubsSelected: 'clubs geselecteerd',
    bagLimitWarning: 'Maximum 14 clubs! Verwijder eerst een club.',
    clearBag: 'Wis tas', useDuringRound: 'Deze clubs zijn beschikbaar tijdens je ronde',
    handicap: 'Handicap', handicapPlaceholder: 'bijv. 13.5',
    showScoreInput: 'Stableford punten tonen', yes: 'Ja', no: 'Nee',
    showScoreHelp: 'Wanneer Ja: Stableford punten worden berekend en getoond per hole en aan het einde van de ronde',
    myRounds: 'Mijn Scorekaarten', noRoundsYet: 'Nog geen rondes gespeeld',
    viewRound: 'Bekijk', howToPlay: 'Hoe te spelen',
    noStrategyAvailable: 'Helaas is er voor deze hole geen tekst beschikbaar',
    aiGenerated: 'Let op: deze tekst is door AI gegenereerd en komt niet van de golfclub.',
    fromClub: 'Deze tekst komt van de golfclub/scorekaart.',
    tapToEnlarge: 'Tik op foto om te vergroten', tapToShrink: 'Tik om te verkleinen',
    loadingHole: 'Hole data laden...', noPhoto: 'Geen foto beschikbaar'
  },
  en: {
    golfStats: 'GOLF STATS', tagline: 'Track. Analyze. Improve.',
    newRound: 'NEW ROUND', startTracking: 'Start tracking',
    whichTee: 'Which tee?', tee: 'Tee', startTime: 'Start time',
    temperature: 'Temperature', date: 'Date', startRound: 'START ROUND',
    hole: 'HOLE', par: 'Par', toGo: 'To go',
    toMiddleGreen: 'to middle green', onGreen: 'ON THE GREEN!',
    finishHole: 'Finish the hole', putts: 'Number of putts',
    score: 'Score for this hole', completeHole: 'COMPLETE HOLE',
    shot: 'Shot', whichClub: 'Which club?', distancePlayed: 'Distance played',
    adjust: 'Adjust if needed', distanceOk: 'DISTANCE OK',
    shotsThisHole: 'Shots this hole', undo: 'Undo',
    holeInfo: 'Hole Info', importantDistances: 'Distances per tee',
    front: 'Front green', middle: 'Middle green', back: 'Back green',
    hazards: 'Hazards', beginHole: 'BEGIN HOLE',
    statistics: 'STATISTICS', holesPlayed: 'holes played',
    totalPutts: 'Total Putts', avgPutts: 'Avg Putts',
    settings: 'Settings', name: 'First name', units: 'Units',
    meters: 'Meters', yards: 'Yards', language: 'Language',
    dutch: 'Dutch', english: 'English', save: 'Save',
    change: 'Change', lie: 'Lie', fairway: 'Fairway', rough: 'Rough',
    bunker: 'Bunker', penalty: 'Penalty', green: 'Green', fringe: 'Fringe',
    myBag: "What's in my bag?", bagSubtitle: 'Select maximum 14 clubs',
    clubsSelected: 'clubs selected',
    bagLimitWarning: 'Maximum 14 clubs! Remove a club first.',
    clearBag: 'Clear bag', useDuringRound: 'These clubs will be available during your round',
    handicap: 'Handicap', handicapPlaceholder: 'e.g. 13.5',
    showScoreInput: 'Show Stableford points', yes: 'Yes', no: 'No',
    showScoreHelp: 'When Yes: Stableford points are calculated and shown per hole and at the end of the round',
    myRounds: 'My Scorecards', noRoundsYet: 'No rounds played yet',
    viewRound: 'View', howToPlay: 'How to play',
    noStrategyAvailable: 'Unfortunately no strategy text is available for this hole',
    aiGenerated: 'Note: this text was generated by AI, not from the golf club.',
    fromClub: 'This text comes from the golf club/scorecard.',
    tapToEnlarge: 'Tap photo to enlarge', tapToShrink: 'Tap to shrink',
    loadingHole: 'Loading hole data...', noPhoto: 'No photo available'
  }
};

export const tr = (language, key) => translations[language]?.[key] || key;
```

---

### `src/lib/stableford.js`
```javascript
export const calculatePlayingHandicap = (hcpIndex, courseRating) => {
  if (!courseRating || hcpIndex == null) return null;
  const slope = courseRating.slope_rating;
  const cr = parseFloat(courseRating.course_rating);
  const par = courseRating.par;
  return Math.round((hcpIndex * slope / 113) + (cr - par));
};

export const calculateStablefordForHole = (score, holePar, strokeIndex, courseRating, hcpIndex) => {
  const playingHcp = calculatePlayingHandicap(hcpIndex, courseRating);
  if (playingHcp === null || !strokeIndex) return null;

  const is18Holes = courseRating?.holes === 18;
  let extraStrokes = 0;

  if (is18Holes) {
    if (playingHcp >= strokeIndex) extraStrokes += 1;
    if (playingHcp >= strokeIndex + 18) extraStrokes += 1;
  } else {
    if (playingHcp >= strokeIndex) extraStrokes += 1;
    if (playingHcp >= strokeIndex + 9) extraStrokes += 1;
    if (playingHcp >= strokeIndex + 18) extraStrokes += 1;
  }

  const netScore = score - extraStrokes;
  const diff = holePar - netScore;

  if (diff >= 3) return 5;
  if (diff === 2) return 4;
  if (diff === 1) return 3;
  if (diff === 0) return 2;
  if (diff === -1) return 1;
  return 0;
};

export const getStrokeIndex = (allHolesData, holeNumber, gender) => {
  const holeData = allHolesData.find(h => h.hole_number === holeNumber);
  if (!holeData) return null;
  return gender === 'vrouw' ? holeData.stroke_index_ladies : holeData.stroke_index_men;
};
```

---

### `src/hooks/useWeather.js`
```javascript
import { useState } from 'react';

export const useWeather = () => {
  const [splashWeather, setSplashWeather] = useState(null);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  const fetchSplashWeather = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
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
          } catch {
            setSplashWeather({ temp: 15, condition: 'cloudy' });
          }
        },
        () => {
          const temps = [2, 5, 8, 12, 15, 18, 21, 24];
          const conditions = ['sunny', 'cloudy', 'rainy'];
          setSplashWeather({
            temp: temps[Math.floor(Math.random() * temps.length)],
            condition: conditions[Math.floor(Math.random() * conditions.length)]
          });
        }
      );
    } else {
      setSplashWeather({ temp: 15, condition: 'cloudy' });
    }
  };

  const fetchCourseWeather = async (lat, lng, onResult) => {
    setFetchingWeather(true);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&timezone=auto`
      );
      const data = await response.json();
      onResult(Math.round(data.current.temperature_2m));
    } catch {
      onResult(15);
    } finally {
      setFetchingWeather(false);
    }
  };

  return { splashWeather, setSplashWeather, fetchingWeather, fetchSplashWeather, fetchCourseWeather };
};
```

---

### `src/hooks/useCourseData.js`
```javascript
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { TEE_COLOR_ORDER } from '../lib/constants';

export const useCourseData = () => {
  const [courseRating, setCourseRating] = useState(null);
  const [allHolesData, setAllHolesData] = useState([]);
  const [dbHoleData, setDbHoleData] = useState(null);
  const [loadingHoleData, setLoadingHoleData] = useState(false);
  const [googleCourses, setGoogleCourses] = useState([]);
  const [nearbyCoursesLoading, setNearbyCoursesLoading] = useState(false);

  const fetchAvailableTees = async (courseName, loopName) => {
    try {
      const loopId = loopName.toLowerCase();
      const firstWord = courseName.toLowerCase().split(' ')[0];
      const { data } = await supabase
        .from('golf_holes')
        .select('distances')
        .ilike('course_id', '%' + firstWord + '%')
        .eq('loop_id', loopId)
        .eq('hole_number', 1)
        .single();
      if (data?.distances) {
        return Object.keys(data.distances)
          .filter(k => data.distances[k] > 0)
          .sort((a, b) => TEE_COLOR_ORDER.indexOf(a) - TEE_COLOR_ORDER.indexOf(b))
          .map(k => k.charAt(0).toUpperCase() + k.slice(1));
      }
      return null;
    } catch (err) {
      console.error('Error fetching tees:', err);
      return null;
    }
  };

  const fetchCourseRating = async (courseName, loopName, gender, teeColor, isCombo, comboId) => {
    try {
      const loopId = loopName.toLowerCase();
      const firstWord = courseName.toLowerCase().split(' ')[0];
      let data, error;
      if (isCombo && comboId) {
        const result = await supabase
          .from('course_ratings')
          .select('*')
          .eq('combo_id', comboId)
          .eq('gender', gender)
          .eq('tee_color', teeColor.toLowerCase())
          .single();
        data = result.data; error = result.error;
      } else {
        const result = await supabase
          .from('course_ratings')
          .select('*')
          .ilike('course_id', '%' + firstWord + '%')
          .eq('loop_id', loopId)
          .is('combo_id', null)
          .eq('gender', gender)
          .eq('tee_color', teeColor.toLowerCase())
          .single();
        data = result.data; error = result.error;
      }
      if (data) { setCourseRating(data); }
      else { console.log('No course rating found:', error?.message); setCourseRating(null); }
    } catch (err) {
      console.error('Error fetching course rating:', err);
      setCourseRating(null);
    }
  };

  const fetchAllHolesForLoop = async (courseName, loopName, isCombo, comboId) => {
    try {
      if (isCombo && comboId) {
        const { data } = await supabase
          .from('combo_stroke_index')
          .select('hole_number, stroke_index_men, stroke_index_ladies, source_loop')
          .eq('combo_id', comboId)
          .order('hole_number');
        if (data?.length > 0) {
          const enrichedData = await Promise.all(data.map(async (hole) => {
            const firstWord = courseName.toLowerCase().split(' ')[0];
            const { data: holeData } = await supabase
              .from('golf_holes')
              .select('par')
              .ilike('course_id', '%' + firstWord + '%')
              .eq('loop_id', hole.source_loop)
              .eq('hole_number', hole.hole_number <= 9 ? hole.hole_number : hole.hole_number - 9)
              .single();
            return { ...hole, par: holeData?.par || 4 };
          }));
          setAllHolesData(enrichedData);
        } else {
          setAllHolesData([]);
        }
      } else {
        const loopId = loopName.toLowerCase();
        const firstWord = courseName.toLowerCase().split(' ')[0];
        const { data } = await supabase
          .from('golf_holes')
          .select('hole_number, par, stroke_index_men, stroke_index_ladies')
          .ilike('course_id', '%' + firstWord + '%')
          .eq('loop_id', loopId)
          .order('hole_number');
        setAllHolesData(data?.length > 0 ? data : []);
      }
    } catch (err) {
      console.error('Error fetching all holes:', err);
      setAllHolesData([]);
    }
  };

  const fetchHoleFromDatabase = async (courseName, loopName, holeNumber) => {
    setLoadingHoleData(true);
    setDbHoleData(null);
    try {
      const loopId = loopName.toLowerCase();
      const courseId = courseName.toLowerCase().replace(/\s+/g, '-') + '-' + loopId;
      let { data, error } = await supabase
        .from('golf_holes').select('*')
        .eq('course_id', courseId).eq('loop_id', loopId).eq('hole_number', holeNumber).single();
      if (error || !data) {
        const firstWord = courseName.toLowerCase().split(' ')[0];
        const result = await supabase
          .from('golf_holes').select('*')
          .ilike('course_id', '%' + firstWord + '%').eq('loop_id', loopId).eq('hole_number', holeNumber).single();
        data = result.data; error = result.error;
      }
      if (error || !data) {
        const result = await supabase
          .from('golf_holes').select('*')
          .eq('loop_id', loopId).eq('hole_number', holeNumber).single();
        data = result.data; error = result.error;
      }
      if (data) { setDbHoleData(data); }
      else { console.log('No hole data found:', error?.message); setDbHoleData(null); }
    } catch (err) {
      console.error('Error fetching hole data:', err);
      setDbHoleData(null);
    } finally {
      setLoadingHoleData(false);
    }
  };

  const searchCoursesInDatabase = async (query) => {
    if (!query || query.length < 2) { setGoogleCourses([]); return; }
    try {
      const { data: courses, error } = await supabase
        .from('golf_courses').select('*')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%`).limit(20);
      if (error) throw error;
      if (courses) {
        setGoogleCourses(courses.map(c => ({
          id: c.id, name: c.name, city: c.city,
          loops: c.loops, teeColors: c.tee_colors,
          lat: parseFloat(c.latitude), lng: parseFloat(c.longitude), distance: '--'
        })));
      }
    } catch (error) {
      console.error('Error searching courses:', error);
    }
  };

  return {
    courseRating, allHolesData, dbHoleData, loadingHoleData,
    googleCourses, setGoogleCourses, nearbyCoursesLoading, setNearbyCoursesLoading,
    fetchAvailableTees, fetchCourseRating, fetchAllHolesForLoop,
    fetchHoleFromDatabase, searchCoursesInDatabase
  };
};
```

---

### `src/hooks/useRound.js`
```javascript
import { useState } from 'react';

const emptyRound = () => ({
  course: null, loop: null, teeColor: null,
  date: new Date().toISOString().split('T')[0],
  startTime: new Date().toTimeString().slice(0, 5),
  temperature: null, holes: []
});

export const useRound = () => {
  const [roundData, setRoundData] = useState(emptyRound());
  const [savedRounds, setSavedRounds] = useState([]);
  const [currentHole, setCurrentHole] = useState(1);
  const [currentHoleInfo, setCurrentHoleInfo] = useState(null);
  const [currentHoleShots, setCurrentHoleShots] = useState([]);
  const [remainingDistance, setRemainingDistance] = useState(null);
  const [selectedClub, setSelectedClub] = useState('');
  const [suggestedDistance, setSuggestedDistance] = useState(null);
  const [manualDistance, setManualDistance] = useState('');
  const [selectedLie, setSelectedLie] = useState('');
  const [showHoleOverview, setShowHoleOverview] = useState(false);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);

  const resetRound = () => {
    setRoundData(emptyRound());
    setCurrentHoleInfo(null); setCurrentHoleShots([]);
    setSelectedClub(''); setSuggestedDistance(null); setSelectedLie('');
    setPhotoExpanded(false); setShowStrategy(false);
  };

  const addShot = () => {
    if (selectedClub === 'Putter') {
      const puttsCount = manualDistance ? parseInt(manualDistance) : 1;
      setCurrentHoleShots(prev => [...prev, {
        shotNumber: prev.length + 1,
        club: selectedClub, distanceToGreen: remainingDistance,
        distancePlayed: 0, lie: selectedLie, putts: puttsCount
      }]);
    } else {
      const distancePlayed = manualDistance ? parseInt(manualDistance) : suggestedDistance;
      setCurrentHoleShots(prev => [...prev, {
        shotNumber: prev.length + 1,
        club: selectedClub, distanceToGreen: remainingDistance,
        distancePlayed, lie: selectedLie
      }]);
      setRemainingDistance(prev => Math.max(0, prev - distancePlayed));
    }
    setSelectedClub(''); setSuggestedDistance(null); setManualDistance(''); setSelectedLie('');
  };

  const undoLastShot = () => {
    if (currentHoleShots.length === 0) return;
    const lastShot = currentHoleShots[currentHoleShots.length - 1];
    setRemainingDistance(lastShot.distanceToGreen);
    setCurrentHoleShots(prev => prev.slice(0, -1));
    setSelectedClub(''); setSuggestedDistance(null); setManualDistance(''); setSelectedLie('');
  };

  const deleteShot = (shotNumber) => {
    const newShots = currentHoleShots
      .filter(s => s.shotNumber !== shotNumber)
      .map((s, i) => ({ ...s, shotNumber: i + 1 }));
    setCurrentHoleShots(newShots);
    if (newShots.length === 0) {
      setRemainingDistance(currentHoleInfo.totalDistance);
    } else {
      const totalPlayed = newShots.reduce((sum, s) => sum + s.distancePlayed, 0);
      setRemainingDistance(Math.max(0, currentHoleInfo.totalDistance - totalPlayed));
    }
  };

  const saveHole = (putts, score) => {
    const holeData = {
      hole: currentHole, shots: currentHoleShots, putts, score,
      totalShots: currentHoleShots.length + putts
    };
    const newHoles = [...roundData.holes, holeData];
    const updatedRound = { ...roundData, holes: newHoles };
    setRoundData(updatedRound);
    return updatedRound;
  };

  const finishRound = (updatedRound) => {
    setSavedRounds(prev => [updatedRound, ...prev]);
  };

  return {
    roundData, setRoundData, savedRounds, setSavedRounds,
    currentHole, setCurrentHole,
    currentHoleInfo, setCurrentHoleInfo,
    currentHoleShots, setCurrentHoleShots,
    remainingDistance, setRemainingDistance,
    selectedClub, setSelectedClub,
    suggestedDistance, setSuggestedDistance,
    manualDistance, setManualDistance,
    selectedLie, setSelectedLie,
    showHoleOverview, setShowHoleOverview,
    photoExpanded, setPhotoExpanded,
    showStrategy, setShowStrategy,
    resetRound, addShot, undoLastShot, deleteShot, saveHole, finishRound
  };
};
```

---

### `src/components/SplashScreen.jsx`
```jsx
import React from 'react';

export default function SplashScreen({ weather, settings }) {
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
    if (!weather) return '';
    const name = settings.name || 'golfer';
    if (weather.condition === 'rainy') {
      return settings.language === 'nl'
        ? `Het is altijd weer om te golfen, ${name}!`
        : `It's always a good day to golf, ${name}!`;
    }
    if (weather.temp < 10) {
      return settings.language === 'nl'
        ? `Wat ben je toch een bikkel, ${name}!`
        : `You're a tough one, ${name}!`;
    }
    return settings.language === 'nl'
      ? `Wat een topweer om een rondje te spelen, ${name}!`
      : `Perfect weather for a round, ${name}!`;
  };

  const weatherIcon = !weather ? '⛅' : weather.condition === 'rainy' ? '🌧️' : weather.condition === 'cloudy' ? '⛅' : '☀️';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-8">
      <div className="animate-slide-up">
        <div className="text-8xl mb-6">⛳</div>
        <div className="font-display text-7xl mb-2 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
          GOLF STATS
        </div>
        <div className="font-body text-emerald-200/60 text-lg mb-8">Track. Analyze. Improve.</div>
        {weather && (
          <div className="glass-card rounded-2xl px-8 py-4 inline-block">
            <div className="font-display text-4xl mb-1">{weatherIcon} {weather.temp}°C</div>
            <div className="font-body text-sm text-emerald-200/70">{getGreeting()}</div>
            <div className="font-body text-xs text-emerald-200/50 mt-1">{getWeatherMessage()}</div>
          </div>
        )}
        {!weather && (
          <div className="glass-card rounded-2xl px-8 py-4 inline-block">
            <div className="font-body text-emerald-200/60">Weer laden...</div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Let op:** SplashScreen.jsx component wordt momenteel NIET gebruikt in App.jsx — App.jsx heeft een eigen inline splash screen. Het component is beschikbaar maar nog niet geïntegreerd.

---

### `src/components/SettingsScreen.jsx`
```jsx
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
              Nederlands
            </button>
            <button onClick={() => setSettings({ ...settings, language: 'en' })}
              className={'rounded-xl py-4 font-body font-medium transition ' +
                (settings.language === 'en' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'bg-white/10 text-white hover:bg-white/15')}>
              English
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
        </div>
        <button onClick={onBag} className="w-full btn-secondary rounded-xl py-4 font-display text-xl tracking-wider">
          {tr('myBag').toUpperCase()}{settings.bag.length > 0 && ` (${settings.bag.length}/14)`}
        </button>
        <button onClick={onSave} className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
          {tr('save').toUpperCase()}
        </button>
      </div>
    </div>
  );
}
```

---

### `src/components/BagScreen.jsx`
```jsx
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
      if (bag.length >= 14) return;
      setSettings({ ...settings, bag: [...bag, club] });
    }
  };

  return (
    <div className="animate-slide-up min-h-screen pb-6">
      {showBagLimitWarning && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 animate-slide-up">
          <div className="glass-card rounded-3xl p-8 max-w-md border-2 border-red-400/50 text-center">
            <div className="text-6xl mb-4">warning</div>
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
            {tr('clearBag')}
          </button>
        )}
        <div>
          <label className="font-body text-xs text-emerald-200/70 mb-3 block uppercase tracking-wider">Selecteer je clubs</label>
          <div className="grid grid-cols-2 gap-3">
            {ALL_CLUBS.map((club) => {
              const isSelected = settings.bag.includes(club);
              return (
                <button key={club} onClick={() => toggleClub(club)}
                  className={'rounded-xl py-4 px-3 font-body font-medium transition border-2 ' +
                    (isSelected
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/50 transform scale-105'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/15')}>
                  {isSelected && 'check '}{club}
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
```

---

### `src/components/StatsScreen.jsx`
```jsx
import React from 'react';
import { ChevronLeft, BarChart3 } from 'lucide-react';
import { calculateStablefordForHole, getStrokeIndex } from '../lib/stableford';

export default function StatsScreen({ roundData, allHolesData, courseRating, settings, convertDistance, getUnitLabel, onNewRound, onHome }) {
  const completedHoles = roundData.holes.filter(h => h.score);
  const totalScore = completedHoles.reduce((sum, h) => sum + parseInt(h.score || 0), 0);
  const totalPutts = completedHoles.reduce((sum, h) => sum + parseInt(h.putts || 0), 0);

  let totalStableford = 0;
  let hasStableford = false;
  completedHoles.forEach(hole => {
    const holeData = allHolesData.find(h => h.hole_number === hole.hole);
    if (holeData && courseRating && settings.handicap) {
      const si = getStrokeIndex(allHolesData, hole.hole, settings.gender);
      const pts = calculateStablefordForHole(hole.score, holeData.par || 4, si, courseRating, settings.handicap);
      if (pts !== null) { totalStableford += pts; hasStableford = true; }
    }
  });

  return (
    <div className="animate-slide-up min-h-screen pb-6">
      <div className="p-6 flex items-center justify-between">
        <button onClick={onHome} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="font-display text-3xl">SCOREKAART</h1>
        <div className="w-10" />
      </div>
      <div className="px-6 space-y-6">
        <div className="glass-card rounded-3xl p-8 text-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400/30">
          <div className="font-body text-xs text-emerald-200/70 mb-2 uppercase tracking-wider">{roundData.course?.name}</div>
          <div className="font-display text-8xl text-white mb-2">{totalScore}</div>
          <div className="font-body text-sm text-emerald-200/60 mb-4">{roundData.loop?.name} • {roundData.teeColor} tee</div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div>
              <div className="font-display text-2xl text-emerald-300">{completedHoles.length}</div>
              <div className="font-body text-xs text-emerald-200/60">holes</div>
            </div>
            <div>
              <div className="font-display text-2xl text-emerald-300">{totalPutts}</div>
              <div className="font-body text-xs text-emerald-200/60">putts</div>
            </div>
            {hasStableford && (
              <div>
                <div className="font-display text-2xl text-yellow-300">{totalStableford}</div>
                <div className="font-body text-xs text-yellow-200/60">stableford</div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {roundData.holes.map((hole) => {
            const holeData = allHolesData.find(h => h.hole_number === hole.hole);
            const par = holeData?.par || 4;
            const scoreToPar = hole.score - par;
            const scoreColor = scoreToPar < 0 ? 'text-emerald-300' : scoreToPar === 0 ? 'text-white' : 'text-red-300';
            const si = holeData ? getStrokeIndex(allHolesData, hole.hole, settings.gender) : null;
            const stbPts = si ? calculateStablefordForHole(hole.score, par, si, courseRating, settings.handicap) : null;
            return (
              <div key={hole.hole} className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/30 rounded-full flex items-center justify-center">
                    <div className="font-display text-xl text-emerald-300">{hole.hole}</div>
                  </div>
                  <div>
                    <div className="font-body text-xs text-emerald-200/60">Par {par}{si ? ` • SI ${si}` : ''}</div>
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
                    <div className={`font-display text-4xl ${scoreColor}`}>{hole.score}</div>
                    <div className="font-body text-xs text-emerald-200/60">
                      {scoreToPar > 0 ? '+' + scoreToPar : scoreToPar < 0 ? scoreToPar : 'E'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onNewRound} className="w-full btn-primary rounded-xl py-4 font-display text-xl tracking-wider">
          NIEUWE RONDE
        </button>
      </div>
    </div>
  );
}
```

---

### `src/components/RoundHistory.jsx`
```jsx
import React from 'react';
import { ChevronLeft } from 'lucide-react';

export default function RoundHistory({ roundData, convertDistance, getUnitLabel, onBack }) {
  const Dist = ({ value }) => `${convertDistance(value)} ${getUnitLabel()}`;

  return (
    <div className="animate-slide-up min-h-screen pb-6">
      <div className="p-6 flex items-center justify-between">
        <button onClick={onBack} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="font-display text-2xl">{roundData.course?.name}</h1>
        <div className="w-10" />
      </div>
      <div className="px-6 space-y-6">
        <div className="glass-card rounded-2xl p-6 text-center bg-emerald-500/10 border-emerald-400/30">
          <div className="font-body text-xs text-emerald-200/70 mb-2">{roundData.loop?.name}</div>
          <div className="font-display text-6xl text-white mb-2">
            {roundData.holes.reduce((sum, h) => sum + (h.score || 0), 0)}
          </div>
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
                      <div className="font-display text-emerald-300">{Dist({ value: shot.distancePlayed })}</div>
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
  );
}
```

---

### `src/LoginScreen.jsx`
_(166 regels — email/wachtwoord login form met Supabase Auth, approval check, emerald/teal design)_

### `src/AdminDashboard.jsx`
_(338 regels — gebruikers lijst, approve/block toggle, delete met RPC, stap-voor-stap help voor nieuwe gebruiker aanmaken)_

### `src/App.jsx`
_(937 regels — zie de volledige code hierboven verspreid over de secties. Bevat: splash screen, home screen, tracking screen, alle screens routing, effects, round flow logic)_

---

## Conventies

- **Commit messages** in het Engels
- **Auto-bump versie** via GitHub Actions (.github/workflows/auto-version.yml)
- **Nederlandse UI** als default (met en/nl vertaling support)
- **Design**: Donker emerald/teal thema, glass-morphism cards, Bebas Neue voor headings, Inter voor body
- **Tailwind**: Via PostCSS build (niet CDN), geconfigureerd in tailwind.config.js
- **Supabase queries**: Zoek banen op eerste woord van naam (`ilike '%' + firstWord + '%'`), loop_id is lowercase

---

## Werkinstructies

1. **GPS feature**: `golf_holes.latitude/longitude` = altijd midden van de green, nooit de tee
2. **Stableford**: Extra slagen logica verschilt voor 9-hole vs 18-hole (zie stableford.js)
3. **18-hole combo's**: Gebruik `combo_stroke_index` tabel, `source_loop` voor juiste hole lookup
4. **Component refactor**: Wijzig nooit functionaliteit bij opsplitsen, alleen structuur
5. **Settings worden niet persistent opgeslagen** in DB — alleen in React state (gaat verloren bij page refresh)
6. **Rondes worden niet persistent opgeslagen** in DB — alleen in React state via `savedRounds`
