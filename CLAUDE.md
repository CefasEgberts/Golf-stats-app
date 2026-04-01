# Golf Stats App

## Project
PWA voor het tracken van golfronden met live GPS, hole-foto's, Stableford scoring en AI-analyse.

## Tech Stack
- **Frontend**: React 18 + Tailwind CSS (CDN) + Lucide icons
- **Backend**: Supabase (PostgreSQL + Edge Functions + Storage)
- **Build**: Vite 4
- **Hosting**: Vercel (golf-stats-app-peach.vercel.app)
- **Domein**: golfstats.nl (DNS pending via TransIP)
- **Versie**: v2.56

## Supabase
- Project ID: `owocwwrzyspbpapmtckp`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93b2N3d3J6eXNwYnBhcG10Y2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjg4MzksImV4cCI6MjA4NjkwNDgzOX0.gt7sFERmogirDSqq0o6yxI3KG0ukhitkujBe4uynaPo`

## Projectstructuur
```
src/
├── App.jsx                    # 606 regels — state, hooks, effects, routing, iOS wake lock
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
│   ├── useGpsTracking.js       # GPS live tracking hook + 5-point green distances + vibration reminder (257 regels)
│   ├── useCourseData.js       # Database queries + has_hole_data (170 regels)
│   └── useRound.js            # Ronde state management (110 regels)
├── components/
│   ├── SplashScreen.jsx       # Splash screen (60 regels)
│   ├── HomeScreen.jsx         # Baan zoeken, lus/tee selectie, start ronde (254 regels)
│   ├── TrackingScreen.jsx     # Shot tracking, club selectie, hole afronden, GPS status, Voice Caddy (928 regels)
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
| tee_latitude / tee_longitude | double precision | **Tee-positie** |

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
- **GPS tee-coords**: ✅ Cruquius holes 1-9 | ❌ Leeghwater | ❌ Lynden

### 2. Spaarnwoude — SQL NOG NIET UITGEVOERD
- **Lussen**: C (par 37), D (par 36), E (par 35)
- **Combo's**: C-D, C-E, D-C, D-E, E-C, E-D
- **Tee-kleuren**: Wit, Geel, Blauw, Rood
- **SQL**: Volledige 5-stappen SQL staat in `golf-app-project-samenvatting-22feb.md`

## Edge Function
- `analyze-hole-photo.ts` — GEDEPLOYED, model: `claude-haiku-4-5-20251001`
- Retourneert: par, distances, hazards, hole_strategy, strategy_is_ai_generated, crop

## Huidige Features (v2.56)
1. Splash screen met weer + begroeting + versienummer
2. Baan selectie via GPS nabijheid of zoeken
3. Lus selectie (9-hole of 18-hole combo dropdown)
4. Tee-kleur selectie (dynamisch uit database)
5. Shot tracking per hole (club, afstand, lie)
6. Putter registratie (aantal putts)
7. Hole Info overlay (foto, strategie, positie-pijl, green vlag)
8. Stableford scoring (baan HCP berekening, SI-gebaseerde punten)
9. Score overzicht per hole + totaal
10. Instellingen (naam, handicap, geslacht, eenheden, taal, bag, showScore)
11. Club bag management (max 14 clubs + afstand per club via `settings.clubDistances`)
12. Default bag voor cefas@golfstats.nl
13. Ronde historie (bekijken + verwijderen)
14. Login + admin dashboard
15. **GPS live tracking** (afstand tot green, geslagen afstand, knipperend rood punt op hole-foto)
16. **5-point green GPS distances** (front/back/left/right/center, collapsible)
17. **Penalty strokes** (strafslag knop per hole)
18. **Wind info** (Beaufort schaal, windrichting relatief t.o.v. green, speeladvies)
19. **Collapsible finish hole** sectie
20. **Running Stableford totaal** tijdens ronde
21. **Auto-scroll** naar finish hole sectie + naar start knop na club selectie
22. **Score zichtbaarheid toggle** (toon/verberg score per hole in instellingen)
23. **Scorekaarten** knop op homescreen
24. **GPS/Handmatig/Test modus** keuze bij start ronde
25. **GPS accuracy verbetering** (dubbele poging bij lage nauwkeurigheid)
26. **Tee-coördinaten** in database (Cruquius holes 1-9)
27. **GPS START per slag** + automatische afstandsmeting
28. **Hole overlay** toont "Terug naar invoer" als er al slagen zijn
29. **Bewerkbare GPS afstand** (select-all on focus, voorkomt GPS overschrijving)
30. **Hole overlay pijl** verborgen als GPS niet actief
31. **AI Caddy** (clubadvies met tekst + spraak via Claude API, wind- en hazard-aware)
32. **Club afstanden** per club in BagScreen (`settings.clubDistances`)
33. **Settings persistence** (localStorage — alle instellingen blijven bewaard)
34. **.gitignore** voor .env beveiliging
35. **Vibration reminder** bij 90% clubafstand (eenmalige trilling + backup na 5 min)
36. **Sim mode vrij invoerveld** met simulate knop (vervangt vaste knoppen)
37. **Fix dubbele afstandsaftrek** in GPS/sim mode (`addShot` gpsActive param)
38. **Slimme course key lookup** (`getCourseKey()` filtert generieke woorden als "Golf", "Club", "Country" etc. voor correcte database lookups bij banen als Golf & Countryclub Liemeer)
39. **Loop ID fix** (pass `loop.id` i.p.v. `loop.name` naar database queries, voorkomt mismatch bij namen als "Nieuwveenlus (9 holes)")
40. **Baanboekje icoon** (📖 bij banen met hole-data, via `has_hole_data` veld)
41. **Voice Caddy** (spraakgestuurde caddy: club selectie, lie, afstand via spraakherkenning + TTS, exacte clubnaam matching, opties zichtbaar per stap, geen confirm_here stap, slag1=tee automatisch)
42. **Platform detectie** (iOS/Android, wake lock handling per platform)
43. **iOS schermbeveiliging tip** (eerste keer tip + post-ronde reminder om auto-lock terug aan te zetten)
44. **Voice caddy afstand** alleen in test/sim modus (GPS modus bepaalt afstand automatisch)

## TODO's

### Hoge prioriteit
- [ ] Spaarnwoude SQL uitvoeren (5 stappen in samenvatting-bestand)
- [ ] Fix hole_strategy en hazards data in golf_holes voor Cruquius (bijv. hole 3: bunkers staan als rechts, moet links zijn). AI Caddy advies hangt af van correcte data.
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
- Nederlandse UI (met en/nl vertaling support)
- Tailwind via CDN, geen build stap voor CSS
- `golf_holes.latitude`/`longitude` = altijd **midden van de green**, nooit de tee
- Supabase anon key mag in frontend; nooit server-side secrets in frontend code

## Versie & Deploy Workflow (BELANGRIJK)
- **GitHub Actions auto-bump is UITGESCHAKELD** (sinds v2.45)
- **Bij ELKE commit**: versie +1 ophogen in DRIE bestanden:
  1. `src/App.jsx` → `const appVersion = \`\${commitHash} vX.XX\`;`
  2. `version.txt` → `X.XX`
  3. `CLAUDE.md` → versienummer in Tech Stack + Features header
- **Versienummering**: bij .99 → volgende hele nummer + .01 (2.99 → 3.01)
- **Altijd automatisch committen en pushen** — nooit vragen, gewoon doen
- **Na elke push**: deploy checken via WebFetch naar live URL
- **Na deploy check**: versienummer tonen zodat gebruiker kan vergelijken
- **Doel**: lokaal = GitHub = Vercel = app ALTIJD gelijk
