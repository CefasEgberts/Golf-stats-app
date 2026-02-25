import { useState, useEffect, useRef, useCallback } from 'react';
import { watchGpsPosition, clearGpsWatch, haversineMeters } from '../lib/gps';

export const useGpsTracking = (greenLat, greenLng, greenPoints) => {
  const [gpsTracking, setGpsTracking] = useState(false);
  const [gpsPosition, setGpsPosition] = useState(null);
  const [teePosition, setTeePosition] = useState(null);
  const [lastShotPosition, setLastShotPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsDistanceToGreen, setGpsDistanceToGreen] = useState(null);
  const [gpsGreenDistances, setGpsGreenDistances] = useState(null);
  const [gpsShotDistance, setGpsShotDistance] = useState(null);

  const watchIdRef = useRef(null);

  // Recalculate distances when position changes
  useEffect(() => {
    if (!gpsPosition) return;

    if (greenLat != null && greenLng != null) {
      const dist = haversineMeters(gpsPosition.lat, gpsPosition.lng, greenLat, greenLng);
      setGpsDistanceToGreen(Math.round(dist));
    }

    // Calculate distances to all 5 green points
    if (greenPoints) {
      const distances = {};
      if (greenLat != null && greenLng != null) {
        distances.center = Math.round(haversineMeters(gpsPosition.lat, gpsPosition.lng, greenLat, greenLng));
      }
      if (greenPoints.frontLat != null && greenPoints.frontLng != null) {
        distances.front = Math.round(haversineMeters(gpsPosition.lat, gpsPosition.lng, greenPoints.frontLat, greenPoints.frontLng));
      }
      if (greenPoints.backLat != null && greenPoints.backLng != null) {
        distances.back = Math.round(haversineMeters(gpsPosition.lat, gpsPosition.lng, greenPoints.backLat, greenPoints.backLng));
      }
      if (greenPoints.leftLat != null && greenPoints.leftLng != null) {
        distances.left = Math.round(haversineMeters(gpsPosition.lat, gpsPosition.lng, greenPoints.leftLat, greenPoints.leftLng));
      }
      if (greenPoints.rightLat != null && greenPoints.rightLng != null) {
        distances.right = Math.round(haversineMeters(gpsPosition.lat, gpsPosition.lng, greenPoints.rightLat, greenPoints.rightLng));
      }
      setGpsGreenDistances(Object.keys(distances).length > 0 ? distances : null);
    }

    if (lastShotPosition) {
      const shotDist = haversineMeters(lastShotPosition.lat, lastShotPosition.lng, gpsPosition.lat, gpsPosition.lng);
      setGpsShotDistance(Math.round(shotDist));
    } else if (teePosition) {
      const shotDist = haversineMeters(teePosition.lat, teePosition.lng, gpsPosition.lat, gpsPosition.lng);
      setGpsShotDistance(Math.round(shotDist));
    }
  }, [gpsPosition, greenLat, greenLng, greenPoints, lastShotPosition, teePosition]);

  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('GPS niet beschikbaar');
      return;
    }
    setGpsError(null);
    setGpsTracking(true);

    watchIdRef.current = watchGpsPosition(
      (pos) => {
        setGpsPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsError(null);
      },
      (err) => {
        setGpsError(err.message);
      }
    );
  }, []);

  // Start tracking and automatically capture tee position on first GPS fix
  const startTrackingWithTeeCapture = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('GPS niet beschikbaar');
      return;
    }
    setGpsError(null);
    setGpsTracking(true);
    let teeCaptured = false;

    watchIdRef.current = watchGpsPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsPosition(newPos);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsError(null);
        // Capture tee on first accurate fix
        if (!teeCaptured) {
          teeCaptured = true;
          setTeePosition({ ...newPos });
          setLastShotPosition(null);
        }
      },
      (err) => {
        setGpsError(err.message);
      }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      clearGpsWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsTracking(false);
    setGpsPosition(null);
    setTeePosition(null);
    setLastShotPosition(null);
    setGpsError(null);
    setGpsAccuracy(null);
    setGpsDistanceToGreen(null);
    setGpsGreenDistances(null);
    setGpsShotDistance(null);
  }, []);

  const captureTeePosition = useCallback(() => {
    if (gpsPosition) {
      setTeePosition({ ...gpsPosition });
      setLastShotPosition(null);
    }
  }, [gpsPosition]);

  const captureShot = useCallback(() => {
    if (gpsPosition) {
      setLastShotPosition({ ...gpsPosition });
      setGpsShotDistance(null);
    }
  }, [gpsPosition]);

  const resetForNewHole = useCallback(() => {
    setTeePosition(null);
    setLastShotPosition(null);
    setGpsDistanceToGreen(null);
    setGpsGreenDistances(null);
    setGpsShotDistance(null);
  }, []);

  // ── Simulation mode ──────────────────────────────────────────────
  const [simMode, setSimMode] = useState(false);

  const startSimulation = useCallback((teeLat, teeLng) => {
    setSimMode(true);
    setGpsTracking(true);
    setGpsError(null);
    setGpsAccuracy(1);
    const teePos = { lat: teeLat, lng: teeLng };
    setGpsPosition(teePos);
    setTeePosition({ ...teePos });
    setLastShotPosition(null);
  }, []);

  // Simulate moving towards green by a given distance in meters
  const simulateShot = useCallback((distanceMeters) => {
    if (!gpsPosition || (greenLat == null || greenLng == null)) return;
    const totalDist = haversineMeters(gpsPosition.lat, gpsPosition.lng, greenLat, greenLng);
    if (totalDist < 1) return;
    const fraction = Math.min(distanceMeters / totalDist, 1);
    const newLat = gpsPosition.lat + (greenLat - gpsPosition.lat) * fraction;
    const newLng = gpsPosition.lng + (greenLng - gpsPosition.lng) * fraction;
    setLastShotPosition({ ...gpsPosition });
    setGpsPosition({ lat: newLat, lng: newLng });
  }, [gpsPosition, greenLat, greenLng]);

  const stopSimulation = useCallback(() => {
    setSimMode(false);
    setGpsTracking(false);
    setGpsPosition(null);
    setTeePosition(null);
    setLastShotPosition(null);
    setGpsError(null);
    setGpsAccuracy(null);
    setGpsDistanceToGreen(null);
    setGpsGreenDistances(null);
    setGpsShotDistance(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        clearGpsWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    gpsTracking, gpsPosition, teePosition, lastShotPosition,
    gpsError, gpsAccuracy, gpsDistanceToGreen, gpsGreenDistances, gpsShotDistance,
    startTracking, startTrackingWithTeeCapture, stopTracking, captureTeePosition, captureShot, resetForNewHole,
    simMode, startSimulation, simulateShot, stopSimulation
  };
};
