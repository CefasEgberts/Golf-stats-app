import { useState } from 'react';

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
    roundData, setRoundData, savedRounds,
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
