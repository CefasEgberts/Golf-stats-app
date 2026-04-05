import { useState, useCallback } from 'react';

const emptyRound = () => ({
  course: null,
  loop: null,
  teeColor: null,
  date: new Date().toISOString().split('T')[0],
  startTime: new Date().toTimeString().slice(0, 5),
  temperature: null,
  holes: []
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

  // Laad rondes van Supabase voor deze gebruiker
  const loadRounds = useCallback(async (userId) => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (!error && data) {
        // Haal ook course details op
        const courseNames = [...new Set(data.map(r => r.course_name).filter(Boolean))];
        let courseDetails = {};
        if (courseNames.length > 0) {
          const { data: courses } = await supabase.from('golf_courses').select('*').in('name', courseNames);
          if (courses) courses.forEach(c => { courseDetails[c.name] = c; });
        }

        setSavedRounds(data.map(r => {
          const cd = courseDetails[r.course_name] || {};
          return {
            id: r.id,
            course: {
              name: r.course_name,
              address: cd.address || null, postal_code: cd.postal_code || null,
              city: cd.city || null, phone: cd.phone || null,
              email: cd.email || null, website: cd.website || null,
              description: cd.description || null, extra_info: cd.extra_info || null
            },
            loop: r.loop_id,
            teeColor: r.tee_color,
            date: r.date,
            startTime: r.start_time,
            temperature: r.temperature,
            holes: r.holes || [],
            totalScore: r.total_score
          };
        }));
        console.log('Loaded', data.length, 'rounds');
      }
    } catch (e) {
      console.error('Fout bij laden rondes:', e);
    }
  }, []);

  const resetRound = () => {
    setRoundData(emptyRound());
    setCurrentHoleInfo(null);
    setCurrentHoleShots([]);
    setSelectedClub('');
    setSuggestedDistance(null);
    setSelectedLie('');
    setPhotoExpanded(false);
    setShowStrategy(false);
  };

  const addShot = (gpsActive = false, position = null) => {
    if (selectedClub === 'Putter') {
      const puttsCount = manualDistance ? parseInt(manualDistance) : 1;
      setCurrentHoleShots(prev => [...prev, {
        shotNumber: prev.length + 1,
        club: selectedClub, distanceToGreen: remainingDistance,
        distancePlayed: 0, lie: selectedLie, putts: puttsCount,
        ...(position && { position })
      }]);
    } else {
      const distancePlayed = manualDistance ? parseInt(manualDistance) : suggestedDistance;
      setCurrentHoleShots(prev => [...prev, {
        shotNumber: prev.length + 1,
        club: selectedClub, distanceToGreen: remainingDistance,
        distancePlayed, lie: selectedLie,
        ...(position && { position })
      }]);
      if (!gpsActive) {
        setRemainingDistance(prev => Math.max(0, prev - distancePlayed));
      }
    }
    setSelectedClub(''); setSuggestedDistance(null); setManualDistance(''); setSelectedLie('');
  };

  const addPenalty = (penaltyStrokes) => {
    setCurrentHoleShots(prev => [...prev, {
      shotNumber: prev.length + 1,
      club: 'Strafslag', distanceToGreen: remainingDistance,
      distancePlayed: 0, lie: 'penalty', penaltyStrokes
    }]);
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

  const saveHole = (putts, score, stablefordPts = null, handicapSnapshot = null, si = null, par = null, playingHcp = null) => {
    const holeData = {
      hole: currentHole, shots: currentHoleShots, putts, score,
      totalShots: currentHoleShots.length + putts,
      stablefordPts, handicapSnapshot,
      stroke_index_men: si, par, playingHcp
    };
    const newHoles = [...roundData.holes, holeData];
    const updatedRound = { ...roundData, holes: newHoles };
    setRoundData(updatedRound);
    return updatedRound;
  };

  // Sla ronde op in Supabase
  const finishRound = useCallback(async (updatedRound, userId) => {
    try {
      const { supabase } = await import('../lib/supabase');
      const totalScore = updatedRound.holes.reduce((s, h) => s + (h.score || 0), 0);
      const { data, error } = await supabase.from('rounds').insert({
        user_id: userId,
        course_name: updatedRound.course?.name || null,
        loop_id: updatedRound.loop?.id || null,
        tee_color: updatedRound.teeColor || null,
        date: updatedRound.date,
        start_time: updatedRound.startTime,
        temperature: updatedRound.temperature,
        holes: updatedRound.holes,
        total_score: totalScore
      }).select().single();

      if (!error && data) {
        const savedRound = {
          id: data.id,
          course: { name: data.course_name },
          loop: data.loop_id,
          teeColor: data.tee_color,
          date: data.date,
          startTime: data.start_time,
          temperature: data.temperature,
          holes: data.holes || [],
          totalScore: data.total_score
        };
        setSavedRounds(prev => [savedRound, ...prev]);
      } else {
        console.error('Fout bij opslaan ronde:', error);
      }
    } catch (e) {
      console.error('Fout bij opslaan ronde:', e);
    }
  }, []);

  // Verwijder ronde uit Supabase
  const deleteRound = useCallback(async (roundId) => {
    try {
      const { supabase } = await import('../lib/supabase');
      await supabase.from('rounds').delete().eq('id', roundId);
      setSavedRounds(prev => prev.filter(r => r.id !== roundId));
    } catch (e) {
      console.error('Fout bij verwijderen ronde:', e);
    }
  }, []);

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
    resetRound, addShot, addPenalty, undoLastShot, deleteShot, saveHole, finishRound, deleteRound, loadRounds
  };
};
