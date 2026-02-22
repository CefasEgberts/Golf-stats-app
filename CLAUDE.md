# Golf Stats App

## Project
PWA voor het tracken van golfronden met live GPS, hole-foto's, Stableford scoring en AI-analyse.

## Tech Stack
- **Frontend**: React + Tailwind CSS, Vite build
- **Backend**: Supabase (PostgreSQL + Edge Functions + Storage)
- **Hosting**: Vercel (golf-stats-app-peach.vercel.app)
- **Domein**: golfstats.nl (DNS pending via TransIP)
- **Versie**: v1.40

## Projectstructuur
```
src/
├── App.jsx                    # Hoofdcomponent, routing + tracking screen
├── main.jsx                   # Entry point
├── LoginScreen.jsx            # Login
├── AdminDashboard.jsx         # Admin
├── lib/
│   ├── supabase.js            # Supabase client
│   ├── gps.js                 # GPS functies + haversine
│   ├── constants.js           # Clubs, steden, tee kleuren
│   ├── translations.js        # nl/en vertalingen
│   └── stableford.js          # Handicap + Stableford berekeningen
├── hooks/
│   ├── useWeather.js          # Weer ophalen
│   ├── useCourseData.js       # Database queries
│   └── useRound.js            # Ronde state management
├── components/
│   ├── SplashScreen.jsx
│   ├── StatsScreen.jsx
│   ├── SettingsScreen.jsx
│   ├── BagScreen.jsx
│   └── RoundHistory.jsx
```

## Supabase Database
- **golf_courses** - Banen met loops (9-hole lussen + 18-hole combo's)
- **golf_holes** - Holes met par, SI, distances, foto, strategie, GPS coords (midden green)
- **course_ratings** - CR/Slope per tee-kleur/geslacht/9h/18h
- **combo_stroke_index** - SI hernummering voor 18-holes combo's

## Banen in Database
1. **Haarlemmermeersche** - Volledig (Cruquius/Leeghwater/Lynden + 6 combo's)
2. **Spaarnwoude** - SQL nog niet uitgevoerd (C/D/E lussen + 6 combo's)

## Edge Function
- `analyze-hole-photo.ts` - AI-analyse van hole foto's (claude-haiku-4-5-20251001)

## Wat gedaan op 22 feb 2026
1. **App.jsx refactor voltooid** - Opgesplitst in components/, hooks/ en lib/ mappenstructuur
2. **App icon toegevoegd** - golf-icon-512.svg voor PWA
3. **Project samenvatting** geschreven (golf-app-project-samenvatting-22feb.md)
4. **Versie naar v1.40** gebracht
5. **Claude Code setup** - Migratie van chat-gebaseerd werken naar CLI

## Huidige Status
De app is functioneel met de volgende features:
- Splash screen met weer + begroeting
- Baan selectie (GPS nabijheid of zoeken)
- Lus + tee-kleur selectie
- Shot tracking per hole (club, afstand, lie)
- Putter registratie
- Hole Info overlay (foto, strategie, positie-pijl)
- Stableford scoring met baan HCP berekening
- Score overzicht per hole + totaal
- Instellingen (naam, handicap, geslacht, eenheden, taal, bag)
- Club bag management (max 14 clubs)
- Ronde historie

## TODO's

### Hoge prioriteit
- [ ] Spaarnwoude SQL uitvoeren (5 stappen in samenvatting-bestand)
- [ ] GPS live tracking feature bouwen (rode knipperende dot, afstand tot green)
- [ ] App.jsx naar GitHub pushen (online staat achter op lokaal)

### Medium prioriteit
- [ ] DNS fixen golfstats.nl (TransIP A record + CNAME)
- [ ] GPS coordinaten Leeghwater holes 1-9
- [ ] GPS coordinaten Lynden holes 1-9
- [ ] Hole foto's uploaden (Haarlemmermeersche + Spaarnwoude)

### Laag prioriteit
- [ ] Spaarnwoude omgekeerde combi CR/Slope checken
- [ ] Testen 18-hole ronde met Stableford

## Conventies
- Commit messages in het Engels
- Auto-bump versie via GitHub Actions (.github/workflows/auto-version.yml)
- Nederlandse UI (met en/nl vertaling support)
