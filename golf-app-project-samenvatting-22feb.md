# Golf Stats App - Complete Project Samenvatting (22 feb 2026)

## Project Overview

**Golf Stats App** - PWA voor het tracken van golfronden met live GPS, hole-foto's, Stableford scoring en AI-analyse.

### Technische Stack
- **Frontend**: React (App.jsx) + Tailwind CSS CDN
- **Backend**: Supabase (PostgreSQL + Edge Functions + Storage)
- **Hosting**: Vercel (golf-stats-app-peach.vercel.app)
- **Domein**: golfstats.nl (DNS pending via TransIP)
- **GitHub**: Golf-stats-app repo

### Supabase Details
- **Project ID**: owocwwrzyspbpapmtckp
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93b2N3d3J6eXNwYnBhcG10Y2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjg4MzksImV4cCI6MjA4NjkwNDgzOX0.gt7sFERmogirDSqq0o6yxI3KG0ukhitkujBe4uynaPo

### Vercel
- **URL**: golf-stats-app-peach.vercel.app
- **DNS**: TransIP A record → 216.198.79.1, CNAME www → vercel DNS

---

## Database Schema

### Tabellen

**golf_courses**
- `id` (uuid, PK)
- `name` (text)
- `latitude` (numeric)
- `longitude` (numeric)
- `loops` (jsonb) - Array van lussen met id, name, holes[], isFull
- `tee_colors` (jsonb)
- `city` (text)

**golf_holes**
- `id` (uuid, PK)
- `course_id` (text) - Bijv. "haarlemmermeersche-cruquius"
- `loop_id` (text) - Bijv. "cruquius"
- `hole_number` (integer)
- `par` (integer)
- `stroke_index_men` (integer)
- `stroke_index_ladies` (integer)
- `distances` (jsonb) - {"wit": 384, "geel": 369, "blauw": 338, "rood": 338}
- `photo_url` (text)
- `hole_strategy` (text)
- `strategy_is_ai_generated` (boolean)
- `hazards` (jsonb)
- `latitude` (double precision) - **NIEUW: midden van de green**
- `longitude` (double precision) - **NIEUW: midden van de green**

**course_ratings**
- `id` (uuid, PK)
- `course_id` (text)
- `loop_id` (text)
- `combo_id` (text, nullable) - Voor 18-holes combinaties
- `gender` (text) - "man" of "vrouw"
- `tee_color` (text)
- `course_rating` (numeric)
- `slope_rating` (integer)
- `par` (integer)
- `holes` (integer) - 9 of 18

**combo_stroke_index**
- `combo_id` (text)
- `hole_number` (integer)
- `stroke_index_men` (integer)
- `stroke_index_ladies` (integer)
- `source_loop` (text)

### RLS Policies
- `golf_courses`: leesbaar voor `anon` EN `authenticated`
- Overige tabellen: check of RLS correct staat

---

## Banen in Database

### 1. Haarlemmermeersche Golf Club (VOLLEDIG)
- **Lussen**: Cruquius, Leeghwater, Lynden (elk 9 holes)
- **Combo's**: 6 stuks (cruquius-leeghwater, cruquius-lynden, etc.)
- **Tee-kleuren**: Wit, Geel, Oranje, Blauw, Rood, Zwart
- **CR/Slope**: Volledig ingevuld voor 9-hole en 18-hole combos
- **GPS Coördinaten (midden green)**: ✅ Cruquius holes 1-9

#### Cruquius GPS Coördinaten (midden green):
| Hole | Latitude | Longitude |
|------|----------|-----------|
| 1 | 52.33687738471238 | 4.657382728377972 |
| 2 | 52.33838195950194 | 4.654843725581544 |
| 3 | 52.33868988432179 | 4.650461074977808 |
| 4 | 52.33579374730557 | 4.6558708096161405 |
| 5 | 52.33817147801686 | 4.651775232240094 |
| 6 | 52.33925115945819 | 4.649191573561674 |
| 7 | 52.33925895490574 | 4.654862863747138 |
| 8 | 52.33967990650536 | 4.65280231626077 |
| 9 | 52.339750064715716 | 4.654767172687399 |

#### TODO GPS:
- ❌ Leeghwater holes 1-9 (coördinaten nog invoeren)
- ❌ Lynden holes 1-9 (coördinaten nog invoeren)

### 2. Spaarnwoude (SQL MOET NOG UITGEVOERD WORDEN)
- **Lussen**: C (par 37), D (par 36), E (par 35)
- **Combo's**: C-D, C-E, D-C, D-E, E-C, E-D
- **Tee-kleuren**: Wit, Geel, Blauw, Rood (geen Oranje of Zwart)

#### Spaarnwoude SQL (5 stappen - NOG NIET UITGEVOERD):

**Stap 1: Baan aanmaken**
```sql
INSERT INTO golf_courses (name, latitude, longitude, loops) VALUES (
  'Spaarnwoude',
  52.4167,
  4.6833,
  '[
    {"id":"c","name":"C","holes":[1,2,3,4,5,6,7,8,9],"isFull":false},
    {"id":"d","name":"D","holes":[1,2,3,4,5,6,7,8,9],"isFull":false},
    {"id":"e","name":"E","holes":[1,2,3,4,5,6,7,8,9],"isFull":false},
    {"id":"c-d","name":"C + D","holes":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],"isFull":true},
    {"id":"c-e","name":"C + E","holes":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],"isFull":true},
    {"id":"d-c","name":"D + C","holes":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],"isFull":true},
    {"id":"d-e","name":"D + E","holes":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],"isFull":true},
    {"id":"e-c","name":"E + C","holes":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],"isFull":true},
    {"id":"e-d","name":"E + D","holes":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],"isFull":true}
  ]'::jsonb
);
```

**Stap 2: Holes data (E, C, D)**
```sql
-- LUS E (par 35)
INSERT INTO golf_holes (course_id, loop_id, hole_number, par, stroke_index_men, stroke_index_ladies, distances) VALUES
('spaarnwoude-e', 'e', 1, 4, 5, 5, '{"wit":384,"geel":369,"blauw":338,"rood":338}'),
('spaarnwoude-e', 'e', 2, 5, 7, 7, '{"wit":483,"geel":456,"blauw":445,"rood":439}'),
('spaarnwoude-e', 'e', 3, 3, 15, 15, '{"wit":145,"geel":145,"blauw":128,"rood":128}'),
('spaarnwoude-e', 'e', 4, 5, 11, 11, '{"wit":496,"geel":449,"blauw":396,"rood":383}'),
('spaarnwoude-e', 'e', 5, 4, 3, 3, '{"wit":364,"geel":351,"blauw":307,"rood":292}'),
('spaarnwoude-e', 'e', 6, 3, 13, 13, '{"wit":163,"geel":153,"blauw":135,"rood":131}'),
('spaarnwoude-e', 'e', 7, 4, 9, 9, '{"wit":321,"geel":313,"blauw":274,"rood":262}'),
('spaarnwoude-e', 'e', 8, 3, 17, 17, '{"wit":171,"geel":157,"blauw":139,"rood":139}'),
('spaarnwoude-e', 'e', 9, 4, 1, 1, '{"wit":375,"geel":366,"blauw":330,"rood":325}')
ON CONFLICT (course_id, loop_id, hole_number) DO UPDATE SET
  par = EXCLUDED.par, stroke_index_men = EXCLUDED.stroke_index_men,
  stroke_index_ladies = EXCLUDED.stroke_index_ladies, distances = EXCLUDED.distances;

-- LUS C (par 37)
INSERT INTO golf_holes (course_id, loop_id, hole_number, par, stroke_index_men, stroke_index_ladies, distances) VALUES
('spaarnwoude-c', 'c', 1, 4, 15, 15, '{"wit":305,"geel":289,"blauw":279,"rood":274}'),
('spaarnwoude-c', 'c', 2, 4, 5, 5, '{"wit":387,"geel":373,"blauw":342,"rood":329}'),
('spaarnwoude-c', 'c', 3, 4, 7, 7, '{"wit":356,"geel":348,"blauw":301,"rood":287}'),
('spaarnwoude-c', 'c', 4, 3, 13, 13, '{"wit":153,"geel":145,"blauw":140,"rood":127}'),
('spaarnwoude-c', 'c', 5, 5, 11, 11, '{"wit":478,"geel":471,"blauw":403,"rood":391}'),
('spaarnwoude-c', 'c', 6, 4, 3, 3, '{"wit":387,"geel":379,"blauw":326,"rood":315}'),
('spaarnwoude-c', 'c', 7, 5, 17, 17, '{"wit":462,"geel":455,"blauw":388,"rood":375}'),
('spaarnwoude-c', 'c', 8, 4, 1, 1, '{"wit":335,"geel":325,"blauw":283,"rood":268}'),
('spaarnwoude-c', 'c', 9, 4, 9, 9, '{"wit":298,"geel":295,"blauw":263,"rood":263}')
ON CONFLICT (course_id, loop_id, hole_number) DO UPDATE SET
  par = EXCLUDED.par, stroke_index_men = EXCLUDED.stroke_index_men,
  stroke_index_ladies = EXCLUDED.stroke_index_ladies, distances = EXCLUDED.distances;

-- LUS D (par 36)
INSERT INTO golf_holes (course_id, loop_id, hole_number, par, stroke_index_men, stroke_index_ladies, distances) VALUES
('spaarnwoude-d', 'd', 1, 4, 4, 4, '{"wit":307,"geel":298,"blauw":284,"rood":271}'),
('spaarnwoude-d', 'd', 2, 4, 12, 12, '{"wit":348,"geel":342,"blauw":300,"rood":283}'),
('spaarnwoude-d', 'd', 3, 4, 18, 18, '{"wit":130,"geel":121,"blauw":116,"rood":104}'),
('spaarnwoude-d', 'd', 4, 5, 14, 14, '{"wit":470,"geel":459,"blauw":405,"rood":392}'),
('spaarnwoude-d', 'd', 5, 3, 10, 10, '{"wit":182,"geel":174,"blauw":161,"rood":146}'),
('spaarnwoude-d', 'd', 6, 4, 2, 2, '{"wit":354,"geel":342,"blauw":298,"rood":285}'),
('spaarnwoude-d', 'd', 7, 4, 6, 6, '{"wit":415,"geel":410,"blauw":345,"rood":328}'),
('spaarnwoude-d', 'd', 8, 4, 8, 8, '{"wit":368,"geel":326,"blauw":310,"rood":293}'),
('spaarnwoude-d', 'd', 9, 5, 16, 16, '{"wit":452,"geel":440,"blauw":382,"rood":367}')
ON CONFLICT (course_id, loop_id, hole_number) DO UPDATE SET
  par = EXCLUDED.par, stroke_index_men = EXCLUDED.stroke_index_men,
  stroke_index_ladies = EXCLUDED.stroke_index_ladies, distances = EXCLUDED.distances;
```

**Stap 3: CR/Slope 9-holes lussen**
```sql
INSERT INTO course_ratings (course_id, loop_id, gender, tee_color, course_rating, slope_rating, par, holes) VALUES
('spaarnwoude-e', 'e', 'man', 'wit', 36.3, 139, 35, 9),
('spaarnwoude-e', 'e', 'man', 'geel', 35.7, 130, 35, 9),
('spaarnwoude-e', 'e', 'man', 'blauw', 34.4, 120, 35, 9),
('spaarnwoude-e', 'e', 'man', 'rood', 34.2, 116, 35, 9),
('spaarnwoude-e', 'e', 'vrouw', 'geel', 38.9, 141, 35, 9),
('spaarnwoude-e', 'e', 'vrouw', 'blauw', 36.7, 132, 35, 9),
('spaarnwoude-e', 'e', 'vrouw', 'rood', 36.5, 134, 35, 9),
('spaarnwoude-c', 'c', 'man', 'wit', 36.5, 135, 37, 9),
('spaarnwoude-c', 'c', 'man', 'geel', 36.0, 133, 37, 9),
('spaarnwoude-c', 'c', 'man', 'blauw', 34.4, 123, 37, 9),
('spaarnwoude-c', 'c', 'man', 'rood', 33.9, 119, 37, 9),
('spaarnwoude-c', 'c', 'vrouw', 'geel', 39.2, 145, 37, 9),
('spaarnwoude-c', 'c', 'vrouw', 'blauw', 37.0, 132, 37, 9),
('spaarnwoude-c', 'c', 'vrouw', 'rood', 36.1, 128, 37, 9),
('spaarnwoude-d', 'd', 'man', 'wit', 36.1, 131, 36, 9),
('spaarnwoude-d', 'd', 'man', 'geel', 35.4, 130, 36, 9),
('spaarnwoude-d', 'd', 'man', 'blauw', 33.7, 123, 36, 9),
('spaarnwoude-d', 'd', 'man', 'rood', 33.2, 120, 36, 9),
('spaarnwoude-d', 'd', 'vrouw', 'geel', 38.7, 143, 36, 9),
('spaarnwoude-d', 'd', 'vrouw', 'blauw', 36.6, 130, 36, 9),
('spaarnwoude-d', 'd', 'vrouw', 'rood', 35.8, 120, 36, 9);
```

**Stap 4: CR/Slope 18-holes combinaties**
```sql
-- C+D (par 73)
INSERT INTO course_ratings (course_id, loop_id, combo_id, gender, tee_color, course_rating, slope_rating, par, holes) VALUES
('spaarnwoude-c', 'c', 'c-d', 'man', 'wit', 72.6, 133, 73, 18),
('spaarnwoude-c', 'c', 'c-d', 'man', 'geel', 71.4, 132, 73, 18),
('spaarnwoude-c', 'c', 'c-d', 'man', 'blauw', 68.1, 123, 73, 18),
('spaarnwoude-c', 'c', 'c-d', 'man', 'rood', 67.1, 120, 73, 18),
('spaarnwoude-c', 'c', 'c-d', 'vrouw', 'geel', 77.9, 144, 73, 18),
('spaarnwoude-c', 'c', 'c-d', 'vrouw', 'blauw', 73.6, 131, 73, 18),
('spaarnwoude-c', 'c', 'c-d', 'vrouw', 'rood', 71.9, 124, 73, 18),
-- E+C (par 72)
('spaarnwoude-e', 'e', 'e-c', 'man', 'wit', 72.6, 139, 72, 18),
('spaarnwoude-e', 'e', 'e-c', 'man', 'geel', 71.4, 130, 72, 18),
('spaarnwoude-e', 'e', 'e-c', 'man', 'blauw', 68.8, 120, 72, 18),
('spaarnwoude-e', 'e', 'e-c', 'man', 'rood', 68.3, 116, 72, 18),
('spaarnwoude-e', 'e', 'e-c', 'vrouw', 'geel', 77.7, 141, 72, 18),
('spaarnwoude-e', 'e', 'e-c', 'vrouw', 'blauw', 73.3, 132, 72, 18),
('spaarnwoude-e', 'e', 'e-c', 'vrouw', 'rood', 72.9, 134, 72, 18),
-- E+D (par 71)
('spaarnwoude-e', 'e', 'e-d', 'man', 'wit', 71.7, 135, 71, 18),
('spaarnwoude-e', 'e', 'e-d', 'man', 'geel', 70.3, 126, 71, 18),
('spaarnwoude-e', 'e', 'e-d', 'man', 'blauw', 67.6, 120, 71, 18),
('spaarnwoude-e', 'e', 'e-d', 'man', 'rood', 66.9, 116, 71, 18),
('spaarnwoude-e', 'e', 'e-d', 'vrouw', 'geel', 76.6, 139, 71, 18),
('spaarnwoude-e', 'e', 'e-d', 'vrouw', 'blauw', 72.5, 130, 71, 18),
('spaarnwoude-e', 'e', 'e-d', 'vrouw', 'rood', 71.5, 126, 71, 18),
-- D+C (par 73)
('spaarnwoude-d', 'd', 'd-c', 'man', 'wit', 72.6, 133, 73, 18),
('spaarnwoude-d', 'd', 'd-c', 'man', 'geel', 71.4, 132, 73, 18),
('spaarnwoude-d', 'd', 'd-c', 'man', 'blauw', 68.1, 123, 73, 18),
('spaarnwoude-d', 'd', 'd-c', 'man', 'rood', 67.1, 120, 73, 18),
('spaarnwoude-d', 'd', 'd-c', 'vrouw', 'geel', 77.9, 144, 73, 18),
('spaarnwoude-d', 'd', 'd-c', 'vrouw', 'blauw', 73.6, 131, 73, 18),
('spaarnwoude-d', 'd', 'd-c', 'vrouw', 'rood', 71.9, 124, 73, 18),
-- D+E (par 71)
('spaarnwoude-d', 'd', 'd-e', 'man', 'wit', 71.7, 135, 71, 18),
('spaarnwoude-d', 'd', 'd-e', 'man', 'geel', 70.3, 126, 71, 18),
('spaarnwoude-d', 'd', 'd-e', 'man', 'blauw', 67.6, 120, 71, 18),
('spaarnwoude-d', 'd', 'd-e', 'man', 'rood', 66.9, 116, 71, 18),
('spaarnwoude-d', 'd', 'd-e', 'vrouw', 'geel', 76.6, 139, 71, 18),
('spaarnwoude-d', 'd', 'd-e', 'vrouw', 'blauw', 72.5, 130, 71, 18),
('spaarnwoude-d', 'd', 'd-e', 'vrouw', 'rood', 71.5, 126, 71, 18),
-- C+E (par 72)
('spaarnwoude-c', 'c', 'c-e', 'man', 'wit', 72.6, 139, 72, 18),
('spaarnwoude-c', 'c', 'c-e', 'man', 'geel', 71.4, 130, 72, 18),
('spaarnwoude-c', 'c', 'c-e', 'man', 'blauw', 68.8, 120, 72, 18),
('spaarnwoude-c', 'c', 'c-e', 'man', 'rood', 68.3, 116, 72, 18),
('spaarnwoude-c', 'c', 'c-e', 'vrouw', 'geel', 77.7, 141, 72, 18),
('spaarnwoude-c', 'c', 'c-e', 'vrouw', 'blauw', 73.3, 132, 72, 18),
('spaarnwoude-c', 'c', 'c-e', 'vrouw', 'rood', 72.9, 134, 72, 18);
```

**Stap 5: 18-holes combi SI tabel**
```sql
-- C+D
INSERT INTO combo_stroke_index (combo_id, hole_number, stroke_index_men, stroke_index_ladies, source_loop) VALUES
('c-d', 1, 15, 15, 'c'), ('c-d', 2, 5, 5, 'c'), ('c-d', 3, 7, 7, 'c'),
('c-d', 4, 13, 13, 'c'), ('c-d', 5, 11, 11, 'c'), ('c-d', 6, 3, 3, 'c'),
('c-d', 7, 17, 17, 'c'), ('c-d', 8, 1, 1, 'c'), ('c-d', 9, 9, 9, 'c'),
('c-d', 10, 4, 4, 'd'), ('c-d', 11, 12, 12, 'd'), ('c-d', 12, 18, 18, 'd'),
('c-d', 13, 14, 14, 'd'), ('c-d', 14, 10, 10, 'd'), ('c-d', 15, 2, 2, 'd'),
('c-d', 16, 6, 6, 'd'), ('c-d', 17, 8, 8, 'd'), ('c-d', 18, 16, 16, 'd');

-- E+C
INSERT INTO combo_stroke_index (combo_id, hole_number, stroke_index_men, stroke_index_ladies, source_loop) VALUES
('e-c', 1, 5, 5, 'e'), ('e-c', 2, 7, 7, 'e'), ('e-c', 3, 15, 15, 'e'),
('e-c', 4, 11, 11, 'e'), ('e-c', 5, 3, 3, 'e'), ('e-c', 6, 13, 13, 'e'),
('e-c', 7, 9, 9, 'e'), ('e-c', 8, 17, 17, 'e'), ('e-c', 9, 1, 1, 'e'),
('e-c', 10, 16, 16, 'c'), ('e-c', 11, 6, 6, 'c'), ('e-c', 12, 8, 8, 'c'),
('e-c', 13, 14, 14, 'c'), ('e-c', 14, 12, 12, 'c'), ('e-c', 15, 4, 4, 'c'),
('e-c', 16, 18, 18, 'c'), ('e-c', 17, 2, 2, 'c'), ('e-c', 18, 10, 10, 'c');

-- E+D
INSERT INTO combo_stroke_index (combo_id, hole_number, stroke_index_men, stroke_index_ladies, source_loop) VALUES
('e-d', 1, 5, 5, 'e'), ('e-d', 2, 3, 3, 'e'), ('e-d', 3, 17, 17, 'e'),
('e-d', 4, 11, 11, 'e'), ('e-d', 5, 7, 7, 'e'), ('e-d', 6, 15, 15, 'e'),
('e-d', 7, 9, 9, 'e'), ('e-d', 8, 13, 13, 'e'), ('e-d', 9, 1, 1, 'e'),
('e-d', 10, 4, 4, 'd'), ('e-d', 11, 12, 12, 'd'), ('e-d', 12, 18, 18, 'd'),
('e-d', 13, 10, 10, 'd'), ('e-d', 14, 14, 14, 'd'), ('e-d', 15, 6, 6, 'd'),
('e-d', 16, 2, 2, 'd'), ('e-d', 17, 8, 8, 'd'), ('e-d', 18, 16, 16, 'd');

-- D+C
INSERT INTO combo_stroke_index (combo_id, hole_number, stroke_index_men, stroke_index_ladies, source_loop) VALUES
('d-c', 1, 4, 4, 'd'), ('d-c', 2, 12, 12, 'd'), ('d-c', 3, 18, 18, 'd'),
('d-c', 4, 14, 14, 'd'), ('d-c', 5, 10, 10, 'd'), ('d-c', 6, 2, 2, 'd'),
('d-c', 7, 6, 6, 'd'), ('d-c', 8, 8, 8, 'd'), ('d-c', 9, 16, 16, 'd'),
('d-c', 10, 15, 15, 'c'), ('d-c', 11, 5, 5, 'c'), ('d-c', 12, 7, 7, 'c'),
('d-c', 13, 13, 13, 'c'), ('d-c', 14, 11, 11, 'c'), ('d-c', 15, 3, 3, 'c'),
('d-c', 16, 17, 17, 'c'), ('d-c', 17, 1, 1, 'c'), ('d-c', 18, 9, 9, 'c');

-- D+E
INSERT INTO combo_stroke_index (combo_id, hole_number, stroke_index_men, stroke_index_ladies, source_loop) VALUES
('d-e', 1, 4, 4, 'd'), ('d-e', 2, 12, 12, 'd'), ('d-e', 3, 18, 18, 'd'),
('d-e', 4, 14, 14, 'd'), ('d-e', 5, 10, 10, 'd'), ('d-e', 6, 2, 2, 'd'),
('d-e', 7, 6, 6, 'd'), ('d-e', 8, 8, 8, 'd'), ('d-e', 9, 16, 16, 'd'),
('d-e', 10, 5, 5, 'e'), ('d-e', 11, 7, 7, 'e'), ('d-e', 12, 15, 15, 'e'),
('d-e', 13, 11, 11, 'e'), ('d-e', 14, 3, 3, 'e'), ('d-e', 15, 13, 13, 'e'),
('d-e', 16, 9, 9, 'e'), ('d-e', 17, 17, 17, 'e'), ('d-e', 18, 1, 1, 'e');

-- C+E
INSERT INTO combo_stroke_index (combo_id, hole_number, stroke_index_men, stroke_index_ladies, source_loop) VALUES
('c-e', 1, 15, 15, 'c'), ('c-e', 2, 5, 5, 'c'), ('c-e', 3, 7, 7, 'c'),
('c-e', 4, 13, 13, 'c'), ('c-e', 5, 11, 11, 'c'), ('c-e', 6, 3, 3, 'c'),
('c-e', 7, 17, 17, 'c'), ('c-e', 8, 1, 1, 'c'), ('c-e', 9, 9, 9, 'c'),
('c-e', 10, 5, 5, 'e'), ('c-e', 11, 7, 7, 'e'), ('c-e', 12, 15, 15, 'e'),
('c-e', 13, 11, 11, 'e'), ('c-e', 14, 3, 3, 'e'), ('c-e', 15, 13, 13, 'e'),
('c-e', 16, 9, 9, 'e'), ('c-e', 17, 17, 17, 'e'), ('c-e', 18, 1, 1, 'e');
```

---

## Edge Function: analyze-hole-photo.ts

- **Status**: GEDEPLOYED
- **Model**: claude-haiku-4-5-20251001
- **Retourneert**: par, distances, hazards, hole_strategy, strategy_is_ai_generated, crop{x,y,width,height}

---

## Huidige App Features (v1.38)

### Bestaande Features
1. **Splash screen** met weer + begroeting
2. **Baan selectie** via GPS nabijheid of zoeken
3. **Lus selectie** (9-hole of 18-hole combo dropdown)
4. **Tee-kleur selectie** (dynamisch uit database)
5. **Shot tracking** per hole (club, afstand, lie)
6. **Putter registratie** (aantal putts)
7. **Hole Info overlay** (foto, strategie, positie-pijl, green vlag)
8. **Stableford scoring** (baan HCP berekening, SI-gebaseerde punten)
9. **Score overzicht** per hole + totaal
10. **Instellingen** (naam, handicap, geslacht, eenheden, taal, bag)
11. **Club bag management** (max 14 clubs)
12. **Default bag** voor cefas@golfstats.nl
13. **Ronde historie** (bekijken + verwijderen)

### Clubs in app
PW, GW, SW, AW, LW, Putter, Driver, Houten 3/5/7, Hybride 3/4, Ijzer 1-9

### Default bag cefas@golfstats.nl
Driver, Houten 3, Houten 5, Hybride 3, Ijzer 5-9, PW, AW, SW, Putter

---

## Volgende Feature: GPS Live Tracking

### Omschrijving
- **Start knop** in hole overlay → registreert tee-positie via GPS
- **Rood knipperend punt** op hole-foto dat live positie toont
- **Resterende afstand tot green** (GPS-gebaseerd, vervangt handmatige schatting)
- **Geslagen afstand** automatisch berekend (afstand van vorige positie naar huidige)
- Database `latitude`/`longitude` in golf_holes = **midden van de green**

### Technisch plan
- `navigator.geolocation.watchPosition()` met `enableHighAccuracy: true`
- Haversine formule voor afstandsberekening
- State: gpsTracking, gpsPosition, teePosition, lastShotPosition, greenPosition
- Bij elke shot: lastShotPosition updaten naar huidige positie
- Hole overlay: rode knipperende dot gepositioneerd op foto o.b.v. afstand-ratio
- GPS stop bij hole afronden

### CSS Animaties
```css
@keyframes gpsBlink {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px 4px rgba(239,68,68,0.7); }
  50% { opacity: 0.4; box-shadow: 0 0 4px 2px rgba(239,68,68,0.3); }
}
.gps-dot { animation: gpsBlink 1.2s ease-in-out infinite; }
```

---

## Geplande Refactor: Component Opsplitsing

De huidige App.jsx (1000+ regels) moet opgesplitst worden in:

```
src/
├── App.jsx                    # Hoofdcomponent, routing
├── lib/
│   ├── supabase.js           # Supabase client
│   ├── gps.js                # GPS functies + haversine
│   ├── constants.js          # Clubs, steden, tee kleuren
│   ├── translations.js       # nl/en vertalingen
│   └── stableford.js         # Handicap + Stableford berekeningen
├── hooks/
│   ├── useWeather.js         # Weer ophalen
│   ├── useGpsTracking.js     # GPS tracking hook
│   ├── useCourseData.js      # Database queries
│   └── useRound.js           # Ronde state management
├── components/
│   ├── SplashScreen.jsx
│   ├── HomeScreen.jsx
│   ├── TrackingScreen.jsx
│   ├── HoleOverlay.jsx
│   ├── StatsScreen.jsx
│   ├── SettingsScreen.jsx
│   ├── BagScreen.jsx
│   └── RoundHistory.jsx
└── styles.css                # Shared CSS
```

---

## Upload Tool

**hole-upload-tool.html** (v3):
- Baan dropdown (uit `golf_courses`)
- Lus dropdown (9-holes lussen van gekozen baan)
- Hole knoppen 1-9 met ✓ indicator
- AI-voorgestelde crop + handmatige schuifjes
- Visuele overlay + live preview
- Upsert + auto-advance

---

## Alle TODO's

### Hoge prioriteit
1. ❌ **Spaarnwoude SQL uitvoeren** (5 stappen hierboven)
2. ❌ **GPS feature bouwen** (beschrijving hierboven)
3. ❌ **App.jsx opsplitsen** in componenten
4. ❌ **App.jsx naar GitHub pushen** (online staat v1.31/v1.38)

### Medium prioriteit
5. ❌ **DNS fixen** golfstats.nl (TransIP A record + CNAME)
6. ❌ **GPS coördinaten** Leeghwater holes 1-9
7. ❌ **GPS coördinaten** Lynden holes 1-9
8. ❌ **Hole foto's uploaden** (Haarlemmermeersche + Spaarnwoude)

### Laag prioriteit
9. ❌ **Spaarnwoude omgekeerde combi CR/Slope** checken
10. ❌ **Testen** 18-hole ronde met Stableford

---

## Overweging: Claude Code

Migratie van chat-gebaseerd werken naar Claude Code (CLI) wordt overwogen voor:
- Direct in codebase werken (geen kopiëren/plakken)
- Automatisch committen naar Git
- Bestanden direct wijzigen
- Snellere iteratie

**Let op**: De conversatie-stijl blijft hetzelfde — je praat nog steeds gewoon met Claude, maar dan in je terminal i.p.v. in de browser.
