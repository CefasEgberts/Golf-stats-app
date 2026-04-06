import React, { useState, useRef } from 'react';
import { ChevronLeft, Edit2, Check, X, Thermometer, Clock, Flag, Map } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
}


// ── PhotoMap: toon tap-punten op hole foto ──────────────────────
function PhotoMap({ hole }) {
  const [photoUrl, setPhotoUrl] = React.useState(hole.photo_url || null);
  const shots = (hole.shots || []).filter(s => s.club !== 'Putter' && s.tapPoint);

  React.useEffect(() => {
    if (photoUrl) return;
    const fetch = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        const loopId = hole.loopId;
        if (!loopId) return;
        const { data } = await supabase.from('golf_holes')
          .select('photo_url')
          .eq('loop_id', loopId)
          .eq('hole_number', hole.hole)
          .single();
        if (data?.photo_url) setPhotoUrl(data.photo_url);
      } catch {}
    };
    fetch();
  }, [hole]);

  if (!photoUrl) return (
    <div className="flex items-center justify-center h-48">
      <div className="text-center font-body text-sm text-white/40 px-8">Geen hole foto beschikbaar.</div>
    </div>
  );

  // Tee tap uit eerste shot
  const teeTap = (hole.shots || []).find(s => s.teeTapPoint)?.teeTapPoint || null;

  if (shots.length === 0 && !teeTap) return (
    <div className="relative w-full">
      <img src={photoUrl} alt="Hole" className="w-full rounded-2xl border border-white/10" />
      <div className="absolute bottom-3 left-0 right-0 text-center">
        <span className="bg-black/60 text-white/50 text-xs px-3 py-1 rounded-full">Geen tap-punten opgeslagen</span>
      </div>
    </div>
  );

  const clubAbbr = (club) => {
    const map = { 'Driver': 'D', 'Pitching wedge': 'PW', 'Gap wedge': 'GW', 'Sand wedge': 'SW', 'Lob wedge': 'LW', 'Approach wedge': 'AW' };
    if (map[club]) return map[club];
    const m = club.match(/\d+/);
    return m ? m[0] : club.substring(0, 2).toUpperCase();
  };

  // Bouw alle punten op: tee + slagpunten
  const allPoints = [];
  if (teeTap) allPoints.push({ x: teeTap.x, y: teeTap.y, label: 'T', color: '#10b981', isTee: true });
  shots.forEach((shot, i) => {
    allPoints.push({
      x: shot.tapPoint.x, y: shot.tapPoint.y,
      label: String(shot.shotNumber || i + 1),
      color: shot.position && shot.position !== 'midden' ? '#f59e0b' : '#3b82f6',
      club: clubAbbr(shot.club),
      distance: shot.distancePlayed
    });
  });

  return (
    <div className="relative w-full">
      <img src={photoUrl} alt="Hole" className="w-full rounded-2xl border border-emerald-400/20" style={{ display: 'block' }} />
      {/* SVG overlay exact over de foto — blauwe lijn met witte rand voor zichtbaarheid */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Witte achtergrondlijn voor contrast */}
        {allPoints.map((pt, i) => i > 0 ? (
          <line key={`line-bg-${i}`}
            x1={allPoints[i-1].x} y1={allPoints[i-1].y}
            x2={pt.x} y2={pt.y}
            stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        ) : null)}
        {/* Blauwe lijn */}
        {allPoints.map((pt, i) => i > 0 ? (
          <line key={`line-${i}`}
            x1={allPoints[i-1].x} y1={allPoints[i-1].y}
            x2={pt.x} y2={pt.y}
            stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />
        ) : null)}
      </svg>
      {/* Punten als absolute divs */}
      {allPoints.map((pt, i) => (
        <div key={i} style={{
          position: 'absolute', left: pt.x + '%', top: pt.y + '%',
          transform: 'translate(-50%, -50%)', pointerEvents: 'none'
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: pt.color, border: '2px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.6)', fontSize: 10, fontWeight: 'bold', color: 'white'
          }}>{pt.label}</div>
          {!pt.isTee && pt.club && (
            <div style={{
              position: 'absolute', left: 16, top: -18, whiteSpace: 'nowrap',
              background: 'rgba(0,0,0,0.75)', borderRadius: 4,
              padding: '2px 6px', fontSize: 9, color: 'white', lineHeight: '1.4'
            }}>
              <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{pt.club}</span>
              {pt.distance ? <span style={{ color: 'white' }}> {pt.distance}m</span> : ''}
            </div>
          )}
        </div>
      ))}
      <div className="absolute bottom-3 left-3">
        <div className="bg-black/50 text-white/60 text-xs px-2 py-1 rounded">📍 tap-posities</div>
      </div>
    </div>
  );
}

// ── HoleMap: schematisch kaartje van gespeelde hole ──────────────
function HoleMap({ hole }) {
  const shots = (hole.shots || []).filter(s => s.club !== 'Putter');

  const W = 280, H = 480;
  const TEE_X = W / 2, TEE_Y = H - 40;
  const GREEN_X = W / 2, GREEN_Y = 50;

  // Club afkorting
  const clubAbbr = (club) => {
    if (!club) return '?';
    const map = {
      'Driver': 'D', 'Fairway hout 3': '3H', 'Fairway hout 5': '5H',
      'Hybride 3': 'H3', 'Hybride 4': 'H4', 'Hybride 5': 'H5',
      'Ijzer 3': '3', 'Ijzer 4': '4', 'Ijzer 5': '5', 'Ijzer 6': '6',
      'Ijzer 7': '7', 'Ijzer 8': '8', 'Ijzer 9': '9',
      'Pitching wedge': 'PW', 'Gap wedge': 'GW', 'Sand wedge': 'SW',
      'Lob wedge': 'LW', 'Approach wedge': 'AW',
    };
    if (map[club]) return map[club];
    // Fallback: eerste 2 letters
    return club.substring(0, 2).toUpperCase();
  };

  // Bouw het pad op — elke slag heeft een richting en afstand
  // Richting: midden = recht, links = schuin links, rechts = schuin rechts
  // We tekenen in SVG-coordinaten: x groter = rechts, y kleiner = omhoog
  const STEP_SCALE = 1.1; // pixels per meter — past automatisch
  
  // Bereken totale verticale ruimte beschikbaar
  const availableH = TEE_Y - GREEN_Y - 20;
  const totalDist = shots.reduce((s, sh) => s + (sh.distancePlayed || 80), 0);
  const scale = totalDist > 0 ? Math.min(availableH / totalDist, 1.5) : 1;

  let points = [{ x: TEE_X, y: TEE_Y }];
  let cx = TEE_X, cy = TEE_Y;

  shots.forEach((shot) => {
    const onGreen = shot.lie === 'green';
    if (onGreen) {
      // Slag eindigt op green: teken lijn naar green positie (met kleine L/R offset)
      const offset = shot.position === 'links' ? -18 : shot.position === 'rechts' ? 18 : 0;
      cx = GREEN_X + offset;
      cy = GREEN_Y;
    } else {
      const dist = (shot.distancePlayed || 80) * scale;
      const angle = shot.position === 'links' ? -25 : shot.position === 'rechts' ? 25 : 0;
      const rad = (angle * Math.PI) / 180;
      cx += Math.sin(rad) * dist;
      cy += -Math.cos(rad) * dist;
    }
    points.push({ x: cx, y: cy, shot, onGreen });
  });

  // Laatste punt dat NIET op green is = startpunt gestippelde lijn
  const lastNonGreen = [...points].reverse().find(p => !p.onGreen) || points[points.length - 1];
  const lastPt = lastNonGreen;

  return (
    <div className="w-full flex justify-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs rounded-2xl"
        style={{ background: 'none' }}>

        {/* Groen veld achtergrond */}
        <defs>
          <linearGradient id="fairwayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="100%" stopColor="#14532d" />
          </linearGradient>
          <radialGradient id="greenGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#15803d" />
          </radialGradient>
        </defs>

        {/* Achtergrond */}
        <rect x="0" y="0" width={W} height={H} rx="16" fill="url(#fairwayGrad)" />

        {/* Fairway strook */}
        <rect x={W/2 - 45} y="30" width="90" height={H - 60} rx="45"
          fill="rgba(22,163,74,0.35)" />

        {/* Green bovenaan */}
        <ellipse cx={GREEN_X} cy={GREEN_Y} rx="38" ry="22"
          fill="url(#greenGrad)" stroke="#4ade80" strokeWidth="1.5" opacity="0.9" />
        <text x={GREEN_X} y={GREEN_Y + 4} textAnchor="middle"
          fill="white" fontSize="9" fontWeight="bold" opacity="0.8">GREEN</text>

        {/* Vlag op green */}
        <line x1={GREEN_X} y1={GREEN_Y - 22} x2={GREEN_X} y2={GREEN_Y - 42}
          stroke="white" strokeWidth="1.5" opacity="0.8" />
        <polygon points={`${GREEN_X},${GREEN_Y-42} ${GREEN_X+12},${GREEN_Y-36} ${GREEN_X},${GREEN_Y-30}`}
          fill="#ef4444" />

        {/* Gestippelde lijn naar green — alleen als laatste slag niet op green landde */}
        {!points[points.length - 1]?.onGreen && (
          <line x1={lastPt.x} y1={lastPt.y} x2={GREEN_X} y2={GREEN_Y + 22}
            stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="5,4" />
        )}

        {/* Slaglijnen */}
        {points.map((pt, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const shot = pt.shot;
          const midX = (prev.x + pt.x) / 2;
          const midY = (prev.y + pt.y) / 2;
          const abbr = clubAbbr(shot?.club);
          const dist = shot?.distancePlayed;
          return (
            <g key={i}>
              {/* Lijn */}
              <line x1={prev.x} y1={prev.y} x2={pt.x} y2={pt.y}
                stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
              {/* Label naast lijn */}
              <g transform={`translate(${midX + (prev.x < pt.x ? 10 : prev.x > pt.x ? -10 : 10)}, ${midY})`}>
                <rect x="-1" y="-10" width={dist ? 44 : 22} height="14" rx="3"
                  fill="rgba(0,0,0,0.55)" />
                <text x="2" y="1" fill="#60a5fa" fontSize="9" fontWeight="bold">{abbr}</text>
                {dist && <text x="16" y="1" fill="white" fontSize="9" opacity="0.9">{dist}m</text>}
              </g>
            </g>
          );
        })}

        {/* Slag eindpunten (niet tee) */}
        {points.map((pt, i) => {
          if (i === 0) return null;
          const shot = pt.shot;
          const isLast = i === points.length - 1;
          return (
            <g key={`dot-${i}`}>
              <circle cx={pt.x} cy={pt.y} r="9"
                fill={shot?.position && shot.position !== 'midden' ? '#f59e0b' : '#3b82f6'}
                stroke="white" strokeWidth="1.5" />
              <text x={pt.x} y={pt.y + 4} textAnchor="middle"
                fill="white" fontSize="9" fontWeight="bold">{i}</text>
            </g>
          );
        })}

        {/* Tee onderaan midden */}
        <circle cx={TEE_X} cy={TEE_Y} r="12" fill="#10b981" stroke="white" strokeWidth="2" />
        <text x={TEE_X} y={TEE_Y + 5} textAnchor="middle"
          fill="white" fontSize="11" fontWeight="bold">T</text>

        {/* Putts label als er putts zijn */}
        {hole.putts > 0 && (
          <g>
            <rect x={GREEN_X - 28} y={GREEN_Y + 26} width="56" height="14" rx="4"
              fill="rgba(0,0,0,0.5)" />
            <text x={GREEN_X} y={GREEN_Y + 36} textAnchor="middle"
              fill="#a7f3d0" fontSize="8">{hole.putts} putt{hole.putts !== 1 ? 's' : ''}</text>
          </g>
        )}

        {/* Hole nummer + par */}
        <rect x="8" y="8" width="70" height="26" rx="6" fill="rgba(0,0,0,0.45)" />
        <text x="16" y="24" fill="white" fontSize="11" fontWeight="bold">
          Hole {hole.hole}
        </text>
        {hole.par && (
          <text x="57" y="24" fill="#86efac" fontSize="9">p{hole.par}</text>
        )}

        {/* Score rechtsboven */}
        {hole.score && (
          <g>
            <rect x={W - 50} y="8" width="42" height="26" rx="6" fill="rgba(0,0,0,0.45)" />
            <text x={W - 29} y="24" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
              {hole.score} sl.
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}


// ── MapTabView: twee tabs in de kaart modal ──────────────────────
function MapTabView({ hole, hasTapPoints }) {
  const [tab, setTab] = React.useState(hasTapPoints ? 'foto' : 'kaart');

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Tab knoppen */}
      <div className="flex gap-2 px-4 pb-3 flex-shrink-0">
        <button
          onClick={() => setTab('kaart')}
          className={"flex-1 py-2 rounded-xl font-body text-sm font-medium transition border " +
            (tab === 'kaart' ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300' : 'bg-white/5 border-white/10 text-white/50')}>
          🗺 Slagkaartje
        </button>
        <button
          onClick={() => setTab('foto')}
          className={"flex-1 py-2 rounded-xl font-body text-sm font-medium transition border " +
            (tab === 'foto' ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300' : 'bg-white/5 border-white/10 text-white/50')}>
          📍 Op de foto
        </button>
      </div>
      {/* Tab inhoud */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {tab === 'kaart' && <HoleMap hole={hole} />}
        {tab === 'foto' && <PhotoMap hole={hole} />}
      </div>
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

      {/* Kaart Modal — twee tabs: schematisch kaartje + hole foto met tap-punten */}
      {mapHole && (() => {
        const holeWithData = {
          ...mapHole,
          courseName: roundData.course?.name,
          loopId: roundData.loop?.id || roundData.loop,
          ...(holeGpsData.find(h => h.hole_number === mapHole.hole) || {})
        };
        const hasTapPoints = (mapHole.shots || []).some(s => s.tapPoint);
        return (
          <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
            <div className="p-4 flex items-center justify-between flex-shrink-0">
              <div className="font-display text-xl text-emerald-300">Hole {mapHole.hole}</div>
              <button onClick={() => setMapHole(null)}><X className="w-6 h-6 text-white/50" /></button>
            </div>
            {/* Tabs */}
            <MapTabView hole={holeWithData} hasTapPoints={hasTapPoints} />
          </div>
        );
      })()}

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
                  Slag {shot.shotNumber}: {shot.club} - positie
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
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <div className="font-display text-xl text-emerald-300">Hole {hole.hole}</div>
                      {hole.stablefordPts != null && (
                        <div className="font-display text-lg text-yellow-300">{hole.stablefordPts} PT</div>
                      )}
                    </div>
                    <span className="font-body text-xs text-white/40">
                      {[
                        hole.par ? `Par ${hole.par}` : null,
                        hole.stroke_index_men ? `SI ${hole.stroke_index_men}` : null,
                        hole.playingHcp != null && hole.stroke_index_men ? `${hole.stroke_index_men <= hole.playingHcp ? '1 slag mee' : '0 slagen mee'}` : null,
                      ].filter(Boolean).join(' · ')}
                    </span>
                    <span className="font-body text-xs text-white/40">Aantal slagen: {hole.score}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(hole.shots?.filter(s => s.club !== 'Putter').length > 0) && (
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
