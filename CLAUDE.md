# Golf Stats App

## Project
PWA voor het tracken van golfronden met live GPS, hole-foto's, Stableford scoring en AI-analyse.

## Tech Stack
- **Frontend**: React 18 + Tailwind CSS (CDN) + Lucide icons
- **Backend**: Supabase (PostgreSQL + Edge Functions + Storage)
- **Build**: Vite 4
- **Hosting**: Vercel (golf-stats-app-peach.vercel.app)
- **Domein**: golfstats.nl (DNS pending via TransIP)
- **Versie**: v1.70

## Supabase
- Project ID: `owocwwrzyspbpapmtckp`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93b2N3d3J6eXNwYnBhcG10Y2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjg4MzksImV4cCI6MjA4NjkwNDgzOX0.gt7sFERmogirDSqq0o6yxI3KG0ukhitkujBe4uynaPo`

## Projectstructuur
```
src/
├── App.jsx                    # 453 regels — state, hooks, effects, routing
├── main.jsx                   # Entry point (115 regels)
├── LoginScreen.jsx            # Login (166 regels)
├── AdminDashboard.jsx         # Admin dashboard (338 regels)
├── lib/
│   ├── supabase.js            # Supabase client init (6 regels)
│   ├── gps.js                 # GPS functies + haversine + watchPosition (48 regels)
│   ├── constants.js           # Clubs, steden, tee kleuren (51 regels)
│   ├── translations.js        # nl/en vertalingen (183 regels)
│   └── stableford.js          # Handicap + Stableford berekeningen (50 regels)
├── hooks/
│   ├── useWeather.js          # Weer ophalen (57 regels)
│   ├── useGpsTracking.js       # GPS live tracking hook + 5-point green distances (157 regels)
│   ├── useCourseData.js       # Database queries (169 regels)
│   └── useRound.js            # Ronde state management (110 regels)
├── components/
│   ├── SplashScreen.jsx       # Splash screen (60 regels)
│   ├── HomeScreen.jsx         # Baan zoeken, lus/tee selectie, start ronde (259 regels)
│   ├── TrackingScreen.jsx     # Shot tracking, club selectie, hole afronden, GPS status (258 regels)
│   ├── HoleOverlay.jsx        # Hole info modal met foto, GPS dot, strategie (102 regels)
│   ├── AllStatsScreen.jsx     # Statistieken overzicht (45 regels)
│   ├── ClubAnalysis.jsx       # Club analyse placeholder (20 regels)
│   ├── StatsScreen.jsx        # Scorekaart na ronde (109 regels)
│   ├── SettingsScreen.jsx     # Instellingen (118 regels)
│   ├── BagScreen.jsx          # Club bag management (83 regels)
│   └── RoundHistory.jsx       # Ronde historie (54 regels)
```

### Refactor status
Componentextractie is **volledig afgerond**. Alle schermen zijn geëxtraheerd uit App.jsx.
App.jsx bevat nu alleen nog: state, hooks, effects, business logic en component routing.

## Database Schema

### golf_courses
| Kolom | Type | Beschrijving |
|---|---|---|
| id | uuid PK | |
| name | text | |
| latitude / longitude | numeric | |
| loops | jsonb | Array van lussen met id, name, holes[], isFull |
| tee_colors | jsonb | |
| city | text | |

### golf_holes
| Kolom | Type | Beschrijving |
|---|---|---|
| id | uuid PK | |
| course_id | text | Bijv. "haarlemmermeersche-cruquius" |
| loop_id | text | Bijv. "cruquius" |
| hole_number | integer | |
| par | integer | |
| stroke_index_men / stroke_index_ladies | integer | |
| distances | jsonb | `{"wit": 384, "geel": 369, "blauw": 338, "rood": 338}` |
| photo_url | text | |
| hole_strategy | text | |
| strategy_is_ai_generated | boolean | |
| hazards | jsonb | |
| latitude / longitude | double precision | **Midden van de green** |

### course_ratings
| Kolom | Type | Beschrijving |
|---|---|---|
| id | uuid PK | |
| course_id | text | |
| loop_id | text | |
| combo_id | text nullable | Voor 18-holes combinaties |
| gender | text | "man" of "vrouw" |
| tee_color | text | |
| course_rating | numeric | |
| slope_rating | integer | |
| par | integer | |
| holes | integer | 9 of 18 |

### combo_stroke_index
| Kolom | Type |
|---|---|
| combo_id | text |
| hole_number | integer |
| stroke_index_men / stroke_index_ladies | integer |
| source_loop | text |

### RLS Policies
- `golf_courses`: leesbaar voor `anon` en `authenticated`
- Overige tabellen: controleer of RLS correct staat

## Banen in Database

### 1. Haarlemmermeersche Golf Club — VOLLEDIG
- **Lussen**: Cruquius, Leeghwater, Lynden (elk 9 holes)
- **Combo's**: 6 stuks (cruquius-leeghwater, cruquius-lynden, leeghwater-cruquius, etc.)
- **Tee-kleuren**: Wit, Geel, Oranje, Blauw, Rood, Zwart
- **CR/Slope**: Volledig ingevuld voor 9-hole en 18-hole combo's
- **GPS green-coords**: ✅ Cruquius holes 1-9 | ❌ Leeghwater | ❌ Lynden

### 2. Spaarnwoude — SQL NOG NIET UITGEVOERD
- **Lussen**: C (par 37), D (par 36), E (par 35)
- **Combo's**: C-D, C-E, D-C, D-E, E-C, E-D
- **Tee-kleuren**: Wit, Geel, Blauw, Rood
- **SQL**: Volledige 5-stappen SQL staat in `golf-app-project-samenvatting-22feb.md`

## Edge Function
- `analyze-hole-photo.ts` — GEDEPLOYED, model: `claude-haiku-4-5-20251001`
- Retourneert: par, distances, hazards, hole_strategy, strategy_is_ai_generated, crop

## Huidige Features (v1.48)
1. Splash screen met weer + begroeting
2. Baan selectie via GPS nabijheid of zoeken
3. Lus selectie (9-hole of 18-hole combo dropdown)
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
14. Login + admin dashboard
15. **GPS live tracking** (afstand tot green, geslagen afstand, knipperend rood punt op hole-foto)
16. **5-point green GPS distances** (front/back/left/right/center afstanden tot green)

## TODO's

### Hoge prioriteit
- [ ] Spaarnwoude SQL uitvoeren (5 stappen in samenvatting-bestand)
- [x] GPS live tracking feature bouwen (rode knipperende dot, afstand tot green) ✅ v1.44
- [x] 5-point green GPS distances (front/back/left/right/center) ✅ v1.48

### Medium prioriteit
- [ ] DNS fixen golfstats.nl (TransIP A record + CNAME)
- [ ] GPS coordinaten Leeghwater holes 1-9 invoeren
- [ ] GPS coordinaten Lynden holes 1-9 invoeren
- [ ] Hole foto's uploaden (Haarlemmermeersche + Spaarnwoude)

### Laag prioriteit
- [ ] Spaarnwoude omgekeerde combi CR/Slope checken
- [ ] Testen 18-hole ronde met Stableford end-to-end

## Conventies
- Commit messages in het Engels
- Auto-bump versie via GitHub Actions (.github/workflows/auto-version.yml)
- Nederlandse UI (met en/nl vertaling support)
- Tailwind via CDN, geen build stap voor CSS
- `golf_holes.latitude`/`longitude` = altijd **midden van de green**, nooit de tee
- Supabase anon key mag in frontend; nooit server-side secrets in frontend code
