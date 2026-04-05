import React, { useState, useRef } from 'react';
import { ChevronLeft, Edit2, Check, X, Thermometer, Clock, Flag, Map } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
}


// ── HoleMap: teken GPS trail per hole ─────────────────────────────
// Werkt met echte GPS coördinaten OF berekend vanuit tee+richting+afstand+positie
function HoleMap({ hole }) {
  const [holeDb, setHoleDb] = React.useState(null);
  const shots = (hole.shots || []).filter(s => s.club !== 'Putter');

  React.useEffect(() => {
    // Haal tee/green GPS op als niet aanwezig
    const teeLat = hole.teeLat || hole.tee_latitude || dbData.tee_latitude;
    const greenLat = hole.greenLat || hole.latitude || dbData.latitude;
    if (!teeLat || !greenLat) {
      // Zoek in Supabase
      const fetchHole = async () => {
        try {
          const { supabase } = await import('../lib/supabase');
          const courseName = hole.courseName;
          const loopId = hole.loopId;
          if (!courseName || !loopId) return;
          const courseId = courseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + loopId;
          const { data } = await supabase.from('golf_holes')
            .select('tee_latitude,tee_longitude,latitude,longitude,green_front_lat,green_front_lng,green_back_lat,green_back_lng')
            .eq('course_id', courseId)
            .eq('hole_number', hole.hole)
            .single();
          if (data) setHoleDb(data);
        } catch {}
      };
      fetchHole();
    }
  }, [hole]);

  const dbData = holeDb || {};

  // Bereken punt op basis van startpunt, richting, afstand en zijkant
  const calcPoint = (startLat, startLng, bearingDeg, distanceM, side) => {
    const R = 6371000;
    const bearing = (bearingDeg * Math.PI) / 180;
    // Offset loodrecht: links = -15m, midden = 0, rechts = +15m
    const sideOffset = side === 'links' ? -15 : side === 'rechts' ? 15 : 0;
    const perpBearing = bearing + Math.PI / 2;

    const lat1 = (startLat * Math.PI) / 180;
    const lng1 = (startLng * Math.PI) / 180;

    // Voorwaarts
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceM / R) +
      Math.cos(lat1) * Math.sin(distanceM / R) * Math.cos(bearing));
    const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(distanceM / R) * Math.cos(lat1),
      Math.cos(distanceM / R) - Math.sin(lat1) * Math.sin(lat2));

    // Zijwaarts
    const lat3 = Math.asin(Math.sin(lat2) * Math.cos(Math.abs(sideOffset) / R) +
      Math.cos(lat2) * Math.sin(Math.abs(sideOffset) / R) * Math.cos(sideOffset < 0 ? perpBearing + Math.PI : perpBearing));
    const lng3 = lng2 + Math.atan2(
      Math.sin(sideOffset < 0 ? perpBearing + Math.PI : perpBearing) * Math.sin(Math.abs(sideOffset) / R) * Math.cos(lat2),
      Math.cos(Math.abs(sideOffset) / R) - Math.sin(lat2) * Math.sin(lat3));

    return { lat: (lat3 * 180) / Math.PI, lng: (lng3 * 180) / Math.PI };
  };

  // Bereken richting van tee naar green
  const bearing = (lat1, lng1, lat2, lng2) => {
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const rlat1 = (lat1 * Math.PI) / 180;
    const rlat2 = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(rlat2);
    const x = Math.cos(rlat1) * Math.sin(rlat2) - Math.sin(rlat1) * Math.cos(rlat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  // Bouw punten op
  const teeLat = hole.teeLat || hole.tee_latitude;
  const teeLng = hole.teeLng || hole.tee_longitude || dbData.tee_longitude;
  const greenLat = hole.greenLat || hole.latitude;
  const greenLng = hole.greenLng || hole.longitude || dbData.longitude;

  let coords = [];

  // Probeer echte GPS coördinaten eerst
  if (shots.some(s => s.gpsLat)) {
    coords = shots.filter(s => s.gpsLat).map(s => ({
      lat: s.gpsLat, lng: s.gpsLng, shot: s, real: true
    }));
  } else if (teeLat && teeLng && greenLat && greenLng) {
    // Bereken vanuit tee + richting + afstand + positie
    const dir = bearing(teeLat, teeLng, greenLat, greenLng);
    let cumDist = 0;
    let curLat = teeLat, curLng = teeLng;

    coords = [{ lat: teeLat, lng: teeLng, shot: { club: 'Tee' }, real: false }];

    shots.forEach(s => {
      const dist = s.distancePlayed || 0;
      if (dist > 0) {
        cumDist += dist;
        const pt = calcPoint(curLat, curLng, dir, dist, s.position);
        curLat = pt.lat; curLng = pt.lng;
        coords.push({ lat: pt.lat, lng: pt.lng, shot: s, real: false });
      }
    });

    // Voeg green toe
    coords.push({ lat: greenLat, lng: greenLng, shot: { club: 'Green' }, real: false, isGreen: true });
  }

  if (coords.length < 2) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center font-body text-sm text-white/40 px-8">
        Geen GPS data. Voeg tee/green GPS coördinaten toe aan de database voor deze hole.
      </div>
    </div>
  );

  // SVG rendering
  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const padLat = (maxLat - minLat) * 0.25 || 0.0002;
  const padLng = (maxLng - minLng) * 0.25 || 0.0002;

  const W = 300, H = 460;
  const toX = (lng) => 20 + ((lng - (minLng - padLng)) / ((maxLng + padLng) - (minLng - padLng))) * (W - 40);
  const toY = (lat) => H - 20 - ((lat - (minLat - padLat)) / ((maxLat + padLat) - (minLat - padLat))) * (H - 40);

  const pts = coords.map(c => ({ x: toX(c.lng), y: toY(c.lat), ...c }));

  return (
    <div className="w-full flex justify-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs rounded-2xl border border-white/10"
        style={{ background: 'linear-gradient(180deg, rgba(0,30,15,0.95) 0%, rgba(0,50,25,0.95) 100%)' }}>

        {/* Fairway achtergrond lijn */}
        <polyline
          points={pts.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />

        {/* Blauwe route lijn */}
        {pts.map((p, i) => i < pts.length - 1 ? (
          <line key={i} x1={p.x} y1={p.y} x2={pts[i+1].x} y2={pts[i+1].y}
            stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"
            strokeDasharray={pts[i+1].isGreen ? "4,3" : "none"} />
        ) : null)}

        {/* Green cirkel */}
        {pts[pts.length-1] && (
          <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y}
            r="14" fill="rgba(16,185,129,0.3)" stroke="#10b981" strokeWidth="2" />
        )}

        {/* Vlag op green */}
        {pts[pts.length-1] && (
          <g>
            <line x1={pts[pts.length-1].x} y1={pts[pts.length-1].y-14}
              x2={pts[pts.length-1].x} y2={pts[pts.length-1].y-28}
              stroke="white" strokeWidth="1.5" />
            <polygon points={`${pts[pts.length-1].x},${pts[pts.length-1].y-28} ${pts[pts.length-1].x+10},${pts[pts.length-1].y-23} ${pts[pts.length-1].x},${pts[pts.length-1].y-18}`}
              fill="#ef4444" />
          </g>
        )}

        {/* Slag punten (niet tee en green) */}
        {pts.filter((p,i) => i > 0 && !p.isGreen).map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="11"
              fill={p.shot.position === 'midden' ? '#3b82f6' : p.shot.position ? '#f59e0b' : '#3b82f6'}
              stroke="white" strokeWidth="2" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{i + 1}</text>
            {p.shot.distancePlayed > 0 && (
              <text x={p.x + 15} y={p.y - 3} fill="white" fontSize="9" opacity="0.8">{p.shot.distancePlayed}m</text>
            )}
            {p.shot.position && p.shot.position !== 'midden' && (
              <text x={p.x + 15} y={p.y + 9} fill="#f59e0b" fontSize="8" opacity="0.9">{p.shot.position}</text>
            )}
          </g>
        ))}

        {/* Tee punt */}
        {pts[0] && (
          <g>
            <circle cx={pts[0].x} cy={pts[0].y} r="8" fill="#10b981" stroke="white" strokeWidth="2" />
            <text x={pts[0].x} y={pts[0].y + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">T</text>
          </g>
        )}

        {/* Legenda */}
        <rect x="8" y={H-45} width="120" height="38" rx="6" fill="rgba(0,0,0,0.4)" />
        <circle cx="20" cy={H-30} r="5" fill="#10b981" />
        <text x="29" y={H-26} fill="white" fontSize="8" opacity="0.7">Tee / Green</text>
        <circle cx="20" cy={H-16} r="5" fill="#3b82f6" />
        <text x="29" y={H-12} fill="white" fontSize="8" opacity="0.7">Slag (midden)</text>
        <circle cx="78" cy={H-16} r="5" fill="#f59e0b" />
        <text x="87" y={H-12} fill="white" fontSize="8" opacity="0.7">L/R</text>

        {/* Geen GPS label */}
        {!coords[1]?.real && (
          <text x={W/2} y="15" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8">
            Geschatte posities
          </text>
        )}
      </svg>
    </div>
  );
}

export default function RoundHistory({ roundData, convertDistance, getUnitLabel, onBack, onSaveRound, holeGpsData = [] }) {
  const [holes, setHoles] = useState(() => JSON.parse(JSON.stringify(roundData.holes || [])));
  const [editingHole, setEditingHole] = useState(null);
  const [editScore, setEditScore] = useState(0);
  const [editPutts, setEditPutts] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [listView, setListView] = useState(false);
  const [mapHole, setMapHole] = useState(null);

  const [originalPutts, setOriginalPutts] = React.useState(0);
  const [shotPositions, setShotPositions] = React.useState({});

  const openEdit = (hole) => {
    setEditingHole(hole.hole);
    const nonPuttShots = (hole.shots || []).filter(s => s.club !== 'Putter' && s.club !== 'Strafslag').length;
    const penalties = (hole.shots || []).filter(s => s.club === 'Strafslag').reduce((sum, s) => sum + (s.penaltyStrokes || 0), 0);
    setEditPutts(hole.putts || 0);
    setEditScore(nonPuttShots + (hole.putts || 0) + penalties);
    setOriginalPutts(hole.putts || 0);
    // Laad bestaande posities
    const pos = {};
    (hole.shots || []).forEach(s => { if (s.position) pos[s.shotNumber] = s.position; });
    setShotPositions(pos);
  };

  const holesRef = React.useRef(holes);
  React.useEffect(() => { holesRef.current = holes; }, [holes]);

  const confirmEdit = () => {
    const updated = holesRef.current.map(h => {
      if (Number(h.hole) !== Number(editingHole)) return h;
      // Score = niet-putt slagen + putts
      const nonPuttShots = (h.shots || []).filter(s => s.club !== 'Putter' && s.club !== 'Strafslag').length;
      const penalties = (h.shots || []).filter(s => s.club === 'Strafslag').reduce((sum, s) => sum + (s.penaltyStrokes || 0), 0);
      const newScore = nonPuttShots + editPutts + penalties;
      const par = h.par;
      const si = h.stroke_index_men || h.si || null;
      const hcp = h.handicapSnapshot || holesRef.current.find(x => x.handicapSnapshot)?.handicapSnapshot || null;
      let stablefordPts = h.stablefordPts ?? null;
      if (par && hcp) {
        const playingHcp = h.playingHcp ?? Math.round(hcp / 2);
        const extra = si && si <= playingHcp ? 1 : 0;
        const net = newScore - par - extra;
        stablefordPts = Math.max(0, 2 - net);
      }
      // Update shot posities
      const updatedShots = (h.shots || []).map(s => ({
        ...s,
        ...(shotPositions[s.shotNumber] ? { position: shotPositions[s.shotNumber] } : {})
      }));
      return { ...h, score: newScore, putts: editPutts, stablefordPts, shots: updatedShots };
    });
    holesRef.current = updated;
    setHoles([...updated]);
    setEditingHole(null);
    setHasChanges(true);
  };

  const handleSaveRound = async () => {
    const updatedRound = { ...roundData, holes: holesRef.current };
    if (onSaveRound) await onSaveRound(updatedRound);
    // Forceer scherm refresh door kort terug te gaan en opnieuw te laden
    setHasChanges(false);
    setSaveSuccess(true);
  };

  const totalScore = holes.reduce((s, h) => s + (h.score || 0), 0);
  const totalPutts = holes.reduce((s, h) => s + (h.putts || 0), 0);
  const totalStableford = holes.reduce((s, h) => s + (h.stablefordPts || 0), 0);
  const handicap = holes.find(h => h.handicapSnapshot)?.handicapSnapshot ?? null;

  // Lijstweergave scherm
  if (listView) {
    return (
      <div className="min-h-screen pb-6">
        <div className="p-6 flex items-center justify-between">
          <button onClick={() => setListView(false)} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
          <h1 className="font-display text-2xl">SCOREKAART</h1>
          <div className="w-10" />
        </div>
        <div className="px-6 space-y-3">
          {/* Baan info */}
          <div className="glass-card rounded-xl p-4 bg-emerald-500/10 border border-emerald-400/20">
            <div className="font-body text-xs text-emerald-200/60 mb-1">{roundData.loop?.name || roundData.loop} · {roundData.teeColor} · {formatDate(roundData.date)}</div>
            {handicap && <div className="font-body text-xs text-emerald-200/40">HCP: {handicap}</div>}
          </div>

          {/* Scorekaart tabel */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="grid grid-cols-6 bg-white/5 px-4 py-2">
              <div className="font-body text-xs text-emerald-200/50">Hole</div>
              <div className="font-body text-xs text-emerald-200/50 text-center">Par</div>
              <div className="font-body text-xs text-emerald-200/50 text-center">SI</div>
              <div className="font-body text-xs text-emerald-200/50 text-center">Mee</div>
              <div className="font-body text-xs text-emerald-200/50 text-center">Slagen</div>
              <div className="font-body text-xs text-yellow-300/60 text-right">Punten</div>
            </div>
            {holes.map((hole) => {
              const mee = hole.playingHcp != null && hole.stroke_index_men ? (hole.stroke_index_men <= hole.playingHcp ? 1 : 0) : '-';
              return (
              <div key={hole.hole} className="grid grid-cols-6 px-4 py-3 border-t border-white/5">
                <div className="font-display text-sm text-emerald-300">{hole.hole}</div>
                <div className="font-body text-sm text-white/60 text-center">{hole.par || '-'}</div>
                <div className="font-body text-sm text-white/40 text-center">{hole.stroke_index_men || '-'}</div>
                <div className={`font-body text-sm text-center ${mee === 1 ? 'text-emerald-300' : 'text-white/30'}`}>{mee}</div>
                <div className="font-display text-sm text-white text-center">
                  {hole.score}
                  {hole.par && <span className="font-body text-xs text-white/40 ml-1">
                    ({hole.score - hole.par === 0 ? '0' : hole.score - hole.par > 0 ? `+${hole.score - hole.par}` : hole.score - hole.par})
                  </span>}
                </div>
                <div className="font-display text-sm text-yellow-300 text-right">{hole.stablefordPts ?? '-'}</div>
              </div>
              );
            })}
            <div className="grid grid-cols-6 px-4 py-3 border-t border-white/20 bg-white/5">
              <div className="font-display text-sm text-emerald-300">Tot</div>
              <div className="font-body text-sm text-white/60 text-center">{holes.reduce((s, h) => s + (h.par || 0), 0)}</div>
              <div className="text-center text-white/30">-</div>
              <div className="font-body text-sm text-emerald-300 text-center">{holes.filter(h => h.playingHcp != null && h.stroke_index_men && h.stroke_index_men <= h.playingHcp).length}</div>
              <div className="font-display text-sm text-white text-center">{totalScore}</div>
              <div className="font-display text-sm text-yellow-300 text-right">{totalStableford}</div>
            </div>
          </div>

          {/* Totalen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card rounded-xl p-3 text-center">
              <div className="font-display text-2xl text-white">{totalScore}</div>
              <div className="font-body text-xs text-emerald-200/50">Slagen</div>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <div className="font-display text-2xl text-white">{totalPutts}</div>
              <div className="font-body text-xs text-emerald-200/50">Putts</div>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <div className="font-display text-2xl text-yellow-300">{totalStableford}</div>
              <div className="font-body text-xs text-emerald-200/50">Punten</div>
            </div>
          </div>

          <button onClick={() => setListView(false)}
            className="w-full glass-card rounded-xl py-3 font-body text-sm text-emerald-300 hover:bg-white/10 transition border border-emerald-400/20 flex items-center justify-center gap-2">
            📋 Hole info
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">

      {/* Kaart Modal */}
      {mapHole && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={() => setMapHole(null)}>
          <div className="p-4 flex items-center justify-between">
            <div className="font-display text-xl text-emerald-300">Hole {mapHole.hole} — GPS Trail</div>
            <button onClick={() => setMapHole(null)}><X className="w-6 h-6 text-white/50" /></button>
          </div>
          <div className="flex-1 px-4 pb-4" onClick={e => e.stopPropagation()}>
            <HoleMap hole={{
                ...mapHole,
                courseName: roundData.course?.name,
                loopId: roundData.loop?.id || roundData.loop,
                ...(holeGpsData.find(h => h.hole_number === mapHole.hole) || {})
              }} />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingHole !== null && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
          <div className="glass-card rounded-3xl p-6 max-w-sm w-full border border-emerald-400/30">
            <div className="flex items-center justify-between mb-6">
              <div className="font-display text-2xl text-emerald-300">Hole {editingHole} aanpassen</div>
              <button onClick={() => setEditingHole(null)}><X className="w-5 h-5 text-white/50" /></button>
            </div>
            <div className="space-y-6">
              <div>
                <div className="font-body text-xs text-emerald-200/70 uppercase tracking-wider mb-1">Score (automatisch berekend)</div>
                <div className="text-center py-3">
                  <div className="font-display text-5xl text-white/50">{editScore}</div>
                  <div className="font-body text-xs text-emerald-200/40 mt-1">slagen buiten green + putts</div>
                </div>
              </div>
              <div>
                <div className="font-body text-xs text-emerald-200/70 uppercase tracking-wider mb-3">Putts</div>
                <div className="flex items-center gap-4 justify-center">
                  <button onClick={() => { const np = Math.max(0, editPutts - 1); setEditScore(s => s - editPutts + np); setEditPutts(np); }}
                    className="w-14 h-14 rounded-xl bg-white/10 font-display text-3xl text-white hover:bg-white/20 active:bg-white/30 transition">−</button>
                  <div className="font-display text-6xl text-white w-20 text-center">{editPutts}</div>
                  <button onClick={() => { const np = editPutts + 1; setEditScore(s => s - editPutts + np); setEditPutts(np); }}
                    className="w-14 h-14 rounded-xl bg-white/10 font-display text-3xl text-white hover:bg-white/20 active:bg-white/30 transition">+</button>
                </div>
              </div>
            </div>
            {/* Positie per slag */}
            {holesRef.current.find(h => Number(h.hole) === Number(editingHole))?.shots
              ?.filter(s => s.club !== 'Putter' && s.club !== 'Strafslag')
              .map(shot => (
              <div key={shot.shotNumber} className="mt-2">
                <div className="font-body text-xs text-emerald-200/70 mb-2">
                  Slag {shot.shotNumber}: {shot.club} — positie
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['links', 'midden', 'rechts'].map(pos => (
                    <button key={pos} onClick={() => setShotPositions(p => ({ ...p, [shot.shotNumber]: p[shot.shotNumber] === pos ? null : pos }))}
                      className={'rounded-xl py-2 font-body text-sm transition border ' +
                        (shotPositions[shot.shotNumber] === pos
                          ? 'bg-blue-500 border-blue-400 text-white'
                          : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/15')}>
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={confirmEdit}
              className="w-full mt-6 btn-primary rounded-xl py-4 font-display text-xl tracking-wider flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Opslaan
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <button onClick={onBack} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="font-display text-2xl">{roundData.course?.name}</h1>
        <div className="flex items-center gap-2">
          {saveSuccess ? (
            <div className="bg-emerald-600 rounded-xl px-3 py-2 font-body text-xs text-white flex items-center gap-1">
              <Check className="w-3 h-3" /> Opgeslagen!
            </div>
          ) : hasChanges ? (
            <button onClick={handleSaveRound}
              className="bg-emerald-500 rounded-xl px-3 py-2 font-body text-xs text-white flex items-center gap-1">
              <Check className="w-3 h-3" /> Opslaan
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-6 space-y-4">
        {/* Ronde info */}
        <div className="glass-card rounded-2xl p-5 bg-emerald-500/10 border border-emerald-400/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display text-4xl text-white">{totalScore}</div>
              <div className="font-body text-xs text-emerald-200/60">Totaal slagen</div>
            </div>
            {totalStableford > 0 && (
              <div className="text-right">
                <div className="font-display text-4xl text-yellow-300">{totalStableford}</div>
                <div className="font-body text-xs text-yellow-200/50">Stableford punten</div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Flag className="w-3 h-3 text-emerald-400" />
              <span className="font-body text-xs text-emerald-200/70">{roundData.loop?.name || roundData.loop || 'Onbekend'}</span>
            </div>
            {roundData.teeColor && (
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${roundData.teeColor === 'geel' ? 'bg-yellow-400' : roundData.teeColor === 'wit' ? 'bg-white' : roundData.teeColor === 'rood' ? 'bg-red-400' : roundData.teeColor === 'blauw' ? 'bg-blue-400' : 'bg-gray-400'}`} />
                <span className="font-body text-xs text-emerald-200/70 capitalize">{roundData.teeColor}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span className="font-body text-xs text-emerald-200/70">{formatDate(roundData.date)}{roundData.startTime ? ` · ${roundData.startTime}` : ''}</span>
            </div>
            {roundData.temperature && (
              <div className="flex items-center gap-2">
                <Thermometer className="w-3 h-3 text-emerald-400" />
                <span className="font-body text-xs text-emerald-200/70">{roundData.temperature}°C</span>
              </div>
            )}
            {handicap !== null && (
              <div className="flex items-center gap-2 col-span-2">
                <span className="font-body text-xs text-emerald-200/50">HCP op dat moment: {handicap}</span>
              </div>
            )}
          </div>
        </div>

        {/* Totalen */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="font-display text-2xl text-white">{totalScore}</div>
            <div className="font-body text-xs text-emerald-200/50">Slagen</div>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="font-display text-2xl text-white">{totalPutts}</div>
            <div className="font-body text-xs text-emerald-200/50">Putts</div>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <div className="font-display text-2xl text-yellow-300">{totalStableford || '-'}</div>
            <div className="font-body text-xs text-emerald-200/50">Punten</div>
          </div>
        </div>

        {/* Lijstweergave knop */}
        <button onClick={() => setListView(true)}
          className="w-full glass-card rounded-xl py-3 font-body text-sm text-emerald-300 hover:bg-white/10 transition border border-emerald-400/20 flex items-center justify-center gap-2">
          📋 Lijstweergave
        </button>

        {/* Holes */}
        <div className="space-y-2">
          {holes.map((hole) => {
            const scoreToPar = hole.score && hole.par ? hole.score - hole.par : null;
            return (
              <div key={`${hole.hole}-${hole.score}-${hole.putts}`} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-display text-xl text-emerald-300">Hole {hole.hole}</div>
                    <span className="font-body text-xs text-white/40">
                      {[
                        hole.par ? `Par ${hole.par}` : null,
                        hole.stroke_index_men ? `SI ${hole.stroke_index_men}` : null,
                        hole.playingHcp != null && hole.stroke_index_men ? `${hole.stroke_index_men <= hole.playingHcp ? '1 slag mee' : '0 slagen mee'}` : null,
                        `Aantal slagen: ${hole.score}`
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hole.stablefordPts != null && (
                      <div className="font-display text-lg text-yellow-300">{hole.stablefordPts} PT</div>
                    )}
                    {(hole.shots?.some(s => s.gpsLat) || hole.shots?.some(s => s.distancePlayed > 0) || holeGpsData.some(h => h.hole_number === hole.hole && h.tee_latitude)) && (
                      <button onClick={() => setMapHole(hole)}
                        className="p-2 rounded-lg hover:bg-white/10 transition">
                        <Map className="w-4 h-4 text-blue-400/60" />
                      </button>
                    )}
                    <button onClick={() => openEdit(hole)}
                      className="p-2 rounded-lg hover:bg-white/10 transition">
                      <Edit2 className="w-4 h-4 text-emerald-400/60" />
                    </button>
                  </div>
                </div>
                {hole.shots && hole.shots.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {hole.shots.filter(s => s.club !== 'Putter').map((shot) => (
                      <div key={shot.shotNumber} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-emerald-300">{shot.shotNumber}.</span>
                          <span className="font-body text-white">{shot.club}</span>
                          {shot.lie && shot.lie !== 'tee' && (
                            <span className="font-body text-white/40">{shot.lie}</span>
                          )}
                          {shot.position && (
                            <span className="font-body text-white/30">({shot.position})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {shot.distancePlayed > 0 && (
                            <span className="font-body text-emerald-300">{convertDistance(shot.distancePlayed)}{getUnitLabel()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {hole.putts > 0 && (
                      <div className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-emerald-300">{hole.shots.filter(s => s.club !== 'Putter').length + 1}.</span>
                          <span className="font-body text-white">Putter</span>
                          <span className="font-body text-white/40">green</span>
                        </div>
                        <span className="font-body text-emerald-200/50">{hole.putts} putt{hole.putts !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
