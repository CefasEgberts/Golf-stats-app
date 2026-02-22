# CLAUDE.md — Golf Stats PWA

> Projectgeheugen voor Claude. Lees dit bestand bij elke nieuwe sessie zodat je direct op de hoogte bent van de volledige context.

---

## 🗺️ Project Overview

**Golf Stats App** — PWA voor het tracken van golfronden met live GPS, hole-foto's, Stableford scoring en AI-analyse.

| | |
|---|---|
| **Live URL** | golf-stats-app-peach.vercel.app |
| **Domein** | golfstats.nl (DNS pending via TransIP) |
| **GitHub** | Golf-stats-app repo |
| **Versie** | v1.38 |

---

## 🛠️ Technische Stack

| Laag | Technologie |
|---|---|
| Frontend | React (App.jsx) + Tailwind CSS CDN |
| Database | Supabase (PostgreSQL + Edge Functions + Storage) |
| Hosting | Vercel |

**Supabase:**
- Project ID: `owocwwrzyspbpapmtckp`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93b2N3d3J6eXNwYnBhcG10Y2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjg4MzksImV4cCI6MjA4NjkwNDgzOX0.gt7sFERmogirDSqq0o6yxI3KG0ukhitkujBe4uynaPo`

**Vercel DNS:**
- A record → 216.198.79.1
- CNAME www → Vercel DNS

---

## 📦 Huidige Features (v1.38)

1. Splash screen met weer + begroeting
2. Baanselectie via GPS nabijheid of zoeken
3. Lusselectie (9-hole of 18-hole combo dropdown)
4. Tee-kleur selectie (dynamisch uit database)
5. Shot tracking per hole (club, afstand, lie)
6. Putter registratie (aantal putts)
7. Hole Info overlay (foto, strategie, positie-pijl, green vlag)
8. Stableford scoring (baan HCP berekening, SI-gebaseerde punten)
9. Score overzicht per hole + totaal
10. Instellingen (naam, handicap, geslacht, eenheden, taal, bag)
11. Club bag management (max 14 clubs)
12. Default bag voor cefas@golfstats.nl
13. Ronde historie (bekijken + verwijderen)

---

## 🗃️ Database Schema

### Tabel: `golf_courses`
| Kolom | Type | Beschrijving |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `latitude` | numeric | |
| `longitude` | numeric | |
| `loops` | jsonb | Array van lussen met id, name, holes[], isFull |
| `tee_colors` | jsonb | |
| `city` | text | |

### Tabel: `golf_holes`
| Kolom | Type | Beschrijving |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | text | Bijv. "haarlemmermeersche-cruquius" |
| `loop_id` | text | Bijv. "cruquius" |
| `hole_number` | integer | |
| `par` | integer | |
| `stroke_index_men` | integer | |
| `stroke_index_ladies` | integer | |
| `distances` | jsonb | `{"wit": 384, "geel": 369, "blauw": 338, "rood": 338}` |
| `photo_url` | text | |
| `hole_strategy` | text | |
| `strategy_is_ai_generated` | boolean | |
| `hazards` | jsonb | |
| `latitude` | double precision | **Midden van de green** |
| `longitude` | double precision | **Midden van de green** |

### Tabel: `course_ratings`
| Kolom | Type | Beschrijving |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | text | |
| `loop_id` | text | |
| `combo_id` | text nullable | Voor 18-holes combinaties |
| `gender` | text | "man" of "vrouw" |
| `tee_color` | text | |
| `course_rating` | numeric | |
| `slope_rating` | integer | |
| `par` | integer | |
| `holes` | integer | 9 of 18 |

### Tabel: `combo_stroke_index`
| Kolom | Type |
|---|---|
| `combo_id` | text |
| `hole_number` | integer |
| `stroke_index_men` | integer |
| `stroke_index_ladies` | integer |
| `source_loop` | text |

### RLS Policies
- `golf_courses`: leesbaar voor `anon` én `authenticated`
- Overige tabellen: controleer of RLS correct staat

---

## ⛳ Banen in Database

### 1. Haarlemmermeersche Golf Club ✅ VOLLEDIG
- **Lussen:** Cruquius, Leeghwater, Lynden (elk 9 holes)
- **Combo's:** 6 stuks (cruquius-leeghwater, cruquius-lynden, leeghwater-cruquius, etc.)
- **Tee-kleuren:** Wit, Geel, Oranje, Blauw, Rood, Zwart
- **CR/Slope:** Volledig ingevuld voor 9-hole en 18-hole combo's

#### GPS Coördinaten (midden green) — Cruquius ✅
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

- ❌ Leeghwater holes 1–9 (GPS coördinaten nog invoeren)
- ❌ Lynden holes 1–9 (GPS coördinaten nog invoeren)

### 2. Spaarnwoude ❌ SQL MOET NOG UITGEVOERD WORDEN
- **Lussen:** C (par 37), D (par 36), E (par 35)
- **Combo's:** C-D, C-E, D-C, D-E, E-C, E-D
- **Tee-kleuren:** Wit, Geel, Blauw, Rood

> De volledige SQL (5 stappen) staat in het bronbestand `golf-app-project-samenvatting-22feb.md`.

---

## 🔌 Edge Function

**`analyze-hole-photo.ts`** — Status: GEDEPLOYED
- Model: `claude-haiku-4-5-20251001`
- Retourneert: `par`, `distances`, `hazards`, `hole_strategy`, `strategy_is_ai_generated`, `crop{x,y,width,height}`

---

## 🏗️ REFACTOR: App.jsx opsplitsen (PRIORITEIT)

De huidige `App.jsx` heeft 1000+ regels en moet opgesplitst worden in de volgende structuur:

```
src/
├── App.jsx                    # Hoofdcomponent, routing, top-level state
├── lib/
│   ├── supabase.js            # Supabase client initialisatie
│   ├── gps.js                 # GPS functies + Haversine formule
│   ├── constants.js           # Clubs, steden, tee-kleuren
│   ├── translations.js        # nl/en vertalingen
│   └── stableford.js          # Handicap + Stableford berekeningen
├── hooks/
│   ├── useWeather.js          # Weer ophalen
│   ├── useGpsTracking.js      # GPS tracking hook
│   ├── useCourseData.js       # Database queries
│   └── useRound.js            # Ronde state management
├── components/
│   ├── SplashScreen.jsx
│   ├── HomeScreen.jsx
│   ├── TrackingScreen.jsx
│   ├── HoleOverlay.jsx        # Bevat GPS dot + afstandsweergave
│   ├── StatsScreen.jsx
│   ├── SettingsScreen.jsx
│   ├── BagScreen.jsx
│   └── RoundHistory.jsx
└── styles.css                 # Gedeelde CSS (incl. GPS animaties)
```

**Aanpak:** Extraheer één component tegelijk, begin met de meest standalone (SplashScreen, BagScreen, SettingsScreen) voordat je de complexere (TrackingScreen, HoleOverlay) aanpakt.

---

## 📡 NIEUWE FEATURE: GPS Live Tracking (PRIORITEIT)

### Wat het doet
- **Start knop** in hole overlay → registreert tee-positie via GPS
- **Rood knipperend punt** op hole-foto dat live positie toont
- **Resterende afstand tot green** automatisch berekend (GPS → green coords in DB)
- **Geslagen afstand** automatisch berekend (afstand van vorige positie naar huidige)

### Technische implementatie

```javascript
// hooks/useGpsTracking.js
const [gpsTracking, setGpsTracking] = useState(false);
const [gpsPosition, setGpsPosition] = useState(null);   // { lat, lng }
const [teePosition, setTeePosition] = useState(null);
const [lastShotPosition, setLastShotPosition] = useState(null);

// Start tracking
navigator.geolocation.watchPosition(
  (pos) => setGpsPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
  (err) => console.error(err),
  { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
);
```

```javascript
// lib/gps.js — Haversine formule
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

### State flow
1. Speler opent hole overlay → GPS watchPosition start
2. Speler tikt "Start hole" → `teePosition = gpsPosition`
3. Na elke slag → `lastShotPosition = gpsPosition`
4. Afstand tot green = `haversineDistance(gpsPosition, hole.latitude, hole.longitude)`
5. Geslagen afstand = `haversineDistance(lastShotPosition, gpsPosition)`
6. Hole afronden → GPS stop + cleanup watchPosition

### CSS animatie voor GPS dot

```css
@keyframes gpsBlink {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px 4px rgba(239,68,68,0.7); }
  50%       { opacity: 0.4; box-shadow: 0 0 4px 2px rgba(239,68,68,0.3); }
}
.gps-dot { animation: gpsBlink 1.2s ease-in-out infinite; }
```

### Positionering dot op hole-foto
De rode dot wordt relatief gepositioneerd op de foto op basis van de verhouding tussen de huidige GPS-afstand tot de green en de totale afstand van tee naar green:

```javascript
const totalDist = haversineDistance(teePosition.lat, teePosition.lng, greenLat, greenLng);
const remainingDist = haversineDistance(gpsPosition.lat, gpsPosition.lng, greenLat, greenLng);
const progressRatio = 1 - (remainingDist / totalDist); // 0 = tee, 1 = green
// progressRatio gebruiken als top% positie op de foto (foto loopt van tee boven naar green onder)
```

---

## ✅ TODO Overzicht

### 🔴 Hoge prioriteit
- [ ] **Spaarnwoude SQL uitvoeren** (5 stappen, zie bronbestand)
- [ ] **GPS feature bouwen** (zie sectie hierboven)
- [ ] **App.jsx opsplitsen** in componenten (zie structuur hierboven)
- [ ] **App.jsx naar GitHub pushen** (online staat v1.31/v1.38, lokaal is verder)

### 🟡 Medium prioriteit
- [ ] **DNS fixen** golfstats.nl (TransIP A record + CNAME)
- [ ] **GPS coördinaten** Leeghwater holes 1–9 invoeren
- [ ] **GPS coördinaten** Lynden holes 1–9 invoeren
- [ ] **Hole foto's uploaden** (Haarlemmermeersche + Spaarnwoude)

### 🟢 Laag prioriteit
- [ ] Spaarnwoude omgekeerde combi CR/Slope checken
- [ ] 18-hole ronde met Stableford testen end-to-end

---

## 🎒 Club Data

**Beschikbare clubs in app:**
PW, GW, SW, AW, LW, Putter, Driver, Houten 3/5/7, Hybride 3/4, Ijzer 1–9

**Default bag cefas@golfstats.nl:**
Driver, Houten 3, Houten 5, Hybride 3, Ijzer 5, 6, 7, 8, 9, PW, AW, SW, Putter

---

## 🔧 Upload Tool

**`hole-upload-tool.html`** (v3):
- Baan dropdown (uit `golf_courses`)
- Lus dropdown (9-holes lussen van gekozen baan)
- Hole knoppen 1–9 met ✓ indicator
- AI-voorgestelde crop + handmatige schuifjes
- Visuele overlay + live preview
- Upsert + auto-advance naar volgende hole

---

## 📝 Werkinstructies voor Claude

1. **Lees altijd dit bestand** aan het begin van een nieuwe sessie.
2. **Component refactor:** Wijzig nooit de functionaliteit bij het opsplitsen — alleen structuur veranderen.
3. **GPS feature:** `golf_holes.latitude` en `golf_holes.longitude` zijn altijd het **midden van de green**, nooit de tee.
4. **Supabase queries:** Gebruik de anon key hierboven; schrijf nooit server-side secrets in frontend code.
5. **Stableford berekening:** Zit momenteel inline in App.jsx; extraheer naar `lib/stableford.js` bij refactor.
6. **Tailwind:** Wordt geladen via CDN, geen build stap nodig voor CSS.
7. **Na elke feature:** Herinner de gebruiker om App.jsx naar GitHub te pushen (is momenteel achtergebleven).
8. **Volgorde refactor:** SplashScreen → BagScreen → SettingsScreen → RoundHistory → StatsScreen → HomeScreen → HoleOverlay → TrackingScreen → App.jsx opruimen.
