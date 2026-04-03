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

  // ── Simpele aanpak: shotStartRef = GPS bij START knop ──────────────
  // Afstand = haversine(shotStartRef, huidige GPS positie)
  // Reset bij Afstand akkoord (captureShot)
  const shotStartRef = useRef(null);

  // Vibration reminder
  const [expectedClubDistance, setExpectedClubDistance] = useState(null);
  const shotReminderFiredRef = useRef(false);
  const backupTimerRef = useRef(null);
  const stillTimerRef = useRef(null);

  const armShotReminder = useCallback((clubDistance) => {
    setExpectedClubDistance(clubDistance || null);
    shotReminderFiredRef.current = false;
    if (stillTimerRef.current) { clearTimeout(stillTimerRef.current); stillTimerRef.current = null; }
    if (backupTimerRef.current) { clearTimeout(backupTimerRef.current); }
    backupTimerRef.current = setTimeout(() => {
      if (shotReminderFiredRef.current) return;
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    }, 5 * 60 * 1000);
  }, []);

  const disarmShotReminder = useCallback(() => {
    setExpectedClubDistance(null);
    shotReminderFiredRef.current = true;
    if (stillTimerRef.current) { clearTimeout(stillTimerRef.current); stillTimerRef.current = null; }
    if (backupTimerRef.current) { clearTimeout(backupTimerRef.current); backupTimerRef.current = null; }
  }, []);

  // ── Hoofd GPS effect: bereken afstanden bij elke positie update ────
  useEffect(() => {
    if (!gpsPosition) return;

    // Afstand tot green
    if (greenLat != null && greenLng != null) {
      const dist = haversineMeters(gpsPosition.lat, gpsPosition.lng, greenLat, greenLng);
      setGpsDistanceToGreen(Math.round(dist));
    }

    // 5-point green distances
    if (greenPoints) {
      const distances = {};
      if (greenLat != null && greenLng != null)
        distances.center = Math.round(haversineMeters(gpsPosition.lat, gpsPosition.lng, greenLat, greenLng));
      if (greenPoints.frontLat != null && greenPoints.frontLng != null)
        distances.front = Math.round(haversineMeters(gpsPosition.lat, gpsPosition.lng, greenPoints.frontLat, greenPoints.frontLng));
      if (greenPoints.backLat != null && greenPoints.backLng != null)
        distances.back = Math.round(haversineMeters(gpsPosition.lat, gpsPosition.lng, greenPoints.backLat, greenPoints.backLng));
      if (greenPoints.leftLat != null && greenPoints.leftLng != null)
        distances.left = Math.round(haversineMeters(gpsPosition.lat, gpsPosition.lng, greenPoints.leftLat, greenPoints.leftLng));
      if (greenPoints.rightLat != null && greenPoints.rightLng != null)
        distances.right = Math.round(haversineMeters(gpsPosition.lat, gpsPosition.lng, greenPoints.rightLat, greenPoints.rightLng));
      setGpsGreenDistances(Object.keys(distances).length > 0 ? distances : null);
    }

    // ── Geslagen afstand: van shotStartRef tot huidige positie ────────
    if (shotStartRef.current) {
      const d = haversineMeters(
        shotStartRef.current.lat, shotStartRef.current.lng,
        gpsPosition.lat, gpsPosition.lng
      );
      setGpsShotDistance(Math.round(d));
    }
  }, [gpsPosition, greenLat, greenLng, greenPoints]);

  // Vibration bij 90% clubafstand
  useEffect(() => {
    if (!expectedClubDistance || !gpsPosition || gpsShotDistance == null) return;
    if (shotReminderFiredRef.current) return;
    if (gpsShotDistance >= expectedClubDistance * 0.90) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      shotReminderFiredRef.current = true;
      if (backupTimerRef.current) { clearTimeout(backupTimerRef.current); backupTimerRef.current = null; }
    }
  }, [gpsPosition, gpsShotDistance, expectedClubDistance]);

  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) { setGpsError('GPS niet beschikbaar'); return; }
    setGpsError(null);
    setGpsTracking(true);
    watchIdRef.current = watchGpsPosition(
      (pos) => { setGpsPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsAccuracy(Math.round(pos.coords.accuracy)); setGpsError(null); },
      (err) => { setGpsError(err.message); }
    );
  }, []);

  const startTrackingWithTeeCapture = useCallback(() => {
    if (!('geolocation' in navigator)) { setGpsError('GPS niet beschikbaar'); return; }
    setGpsError(null);
    setGpsTracking(true);
    setTeePosition(null);
    setLastShotPosition(null);
    shotStartRef.current = null;
    watchIdRef.current = watchGpsPosition(
      (pos) => { setGpsPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsAccuracy(Math.round(pos.coords.accuracy)); setGpsError(null); },
      (err) => { setGpsError(err.message); }
    );
  }, []);

  // START knop: sla huidige GPS op als beginpunt van deze slag
  const captureStartPosition = useCallback(() => {
    if (gpsPosition) {
      if (!teePosition) setTeePosition({ ...gpsPosition });
      shotStartRef.current = { ...gpsPosition };  // ← het enige dat telt
      setLastShotPosition({ ...gpsPosition });
      setGpsShotDistance(0);
    }
  }, [gpsPosition, teePosition]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) { clearGpsWatch(watchIdRef.current); watchIdRef.current = null; }
    shotStartRef.current = null;
    setGpsTracking(false); setGpsPosition(null); setTeePosition(null);
    setLastShotPosition(null); setGpsError(null); setGpsAccuracy(null);
    setGpsDistanceToGreen(null); setGpsGreenDistances(null); setGpsShotDistance(null);
  }, []);

  const captureTeePosition = useCallback(() => {
    if (gpsPosition) { setTeePosition({ ...gpsPosition }); setLastShotPosition(null); }
  }, [gpsPosition]);

  // Afstand akkoord: reset shotStartRef zodat teller stopt
  const captureShot = useCallback(() => {
    if (gpsPosition) {
      shotStartRef.current = null;  // ← stop de teller
      setLastShotPosition({ ...gpsPosition });
      setGpsShotDistance(null);
    }
  }, [gpsPosition]);

  const resetForNewHole = useCallback(() => {
    shotStartRef.current = null;
    setTeePosition(null); setLastShotPosition(null);
    setGpsDistanceToGreen(null); setGpsGreenDistances(null); setGpsShotDistance(null);
  }, []);

  // ── Simulation mode ──────────────────────────────────────────────
  const [simMode, setSimMode] = useState(false);

  const startSimulation = useCallback((teeLat, teeLng) => {
    setSimMode(true); setGpsTracking(true); setGpsError(null); setGpsAccuracy(1);
    const teePos = { lat: teeLat, lng: teeLng };
    setGpsPosition(teePos); setTeePosition({ ...teePos }); setLastShotPosition({ ...teePos });
    shotStartRef.current = { ...teePos };
  }, []);

  const simulateShot = useCallback((distanceMeters) => {
    if (!gpsPosition || greenLat == null || greenLng == null) return;
    const totalDist = haversineMeters(gpsPosition.lat, gpsPosition.lng, greenLat, greenLng);
    if (totalDist < 1) return;
    const fraction = Math.min(distanceMeters / totalDist, 1);
    const newLat = gpsPosition.lat + (greenLat - gpsPosition.lat) * fraction;
    const newLng = gpsPosition.lng + (greenLng - gpsPosition.lng) * fraction;
    setLastShotPosition({ ...gpsPosition });
    shotStartRef.current = { ...gpsPosition };
    setGpsPosition({ lat: newLat, lng: newLng });
  }, [gpsPosition, greenLat, greenLng]);

  const stopSimulation = useCallback(() => {
    setSimMode(false); setGpsTracking(false); setGpsPosition(null); setTeePosition(null);
    setLastShotPosition(null); setGpsError(null); setGpsAccuracy(null);
    setGpsDistanceToGreen(null); setGpsGreenDistances(null); setGpsShotDistance(null);
    shotStartRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) clearGpsWatch(watchIdRef.current);
      if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
      if (stillTimerRef.current) clearTimeout(stillTimerRef.current);
    };
  }, []);

  return {
    gpsTracking, gpsPosition, teePosition, lastShotPosition,
    gpsError, gpsAccuracy, gpsDistanceToGreen, gpsGreenDistances, gpsShotDistance,
    startTracking, startTrackingWithTeeCapture, stopTracking, captureTeePosition,
    captureStartPosition, captureShot, resetForNewHole,
    armShotReminder, disarmShotReminder,
    simMode, startSimulation, simulateShot, stopSimulation
  };
};
