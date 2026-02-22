/**
 * Calculate the playing handicap (baanhandicap).
 * Formula: (HCP Index * Slope / 113) + (CR - Par)
 */
export const calculatePlayingHandicap = (hcpIndex, courseRating) => {
  if (!courseRating || hcpIndex == null) return null;
  const slope = courseRating.slope_rating;
  const cr = parseFloat(courseRating.course_rating);
  const par = courseRating.par;
  return Math.round((hcpIndex * slope / 113) + (cr - par));
};

/**
 * Calculate Stableford points for a single hole.
 */
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

  if (diff >= 3) return 5; // albatros of beter
  if (diff === 2) return 4; // eagle
  if (diff === 1) return 3; // birdie
  if (diff === 0) return 2; // par
  if (diff === -1) return 1; // bogey
  return 0;                  // dubbelbogey of slechter
};

/**
 * Get stroke index for a hole based on gender.
 */
export const getStrokeIndex = (allHolesData, holeNumber, gender) => {
  const holeData = allHolesData.find(h => h.hole_number === holeNumber);
  if (!holeData) return null;
  return gender === 'vrouw' ? holeData.stroke_index_ladies : holeData.stroke_index_men;
};
