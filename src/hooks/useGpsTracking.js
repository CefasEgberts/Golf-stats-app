import { useState, useEffect, useRef, useCallback } from 'react';
import { watchGpsPosition, clearGpsWatch, haversineMeters } from '../lib/gps';

export const useGpsTracking = (greenLat, greenLng) => {
  const [gpsTracking, setGpsTracking] = useState(false);
  const [gpsPosition, setGpsPosition] = useState(null);
  const [teePosition, setTeePosition] = useState(null);
  const [lastShotPosition, setLastShotPosition] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsDistanceToGreen, setGpsDistanceToGreen] = useState(null);
  const [gpsShotDistance, setGpsShotDistance] = useState(null);

  const watchIdRef = useRef(null);

  // Recalculate distances when position changes
  useEffect(() => {
    if (!gpsPosition) return;

    if (greenLat != null && greenLng != null) {
      const dist = haversineMeters(gpsPosition.lat, gpsPosition.lng, greenLat, greenLng);
      setGpsDistanceToGreen(Math.round(dist));
    }

    if (lastShotPosition) {
      const shotDist = haversineMeters(lastShotPosition.lat, lastShotPosition.lng, gpsPosition.lat, gpsPosition.lng);
      setGpsShotDistance(Math.round(shotDist));
    } else if (teePosition) {
      const shotDist = haversineMeters(teePosition.lat, teePosition.lng, gpsPosition.lat, gpsPosition.lng);
      setGpsShotDistance(Math.round(shotDist));
    }
  }, [gpsPosition, greenLat, greenLng, lastShotPosition, teePosition]);

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
    gpsError, gpsAccuracy, gpsDistanceToGreen, gpsShotDistance,
    startTracking, stopTracking, captureTeePosition, captureShot, resetForNewHole
  };
};
