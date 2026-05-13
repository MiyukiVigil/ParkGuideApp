import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

import * as AlertService from '../services/alertService';
import * as MonitorEvidenceService from '../services/monitorEvidenceService';
import * as MonitorService from '../services/monitorService';
import * as OfflineEvidenceQueue from '../services/offlineEvidenceQueue';

const MonitoringContext = createContext(null);

const DEFAULT_CLIP_DURATION_SECONDS = 12;
const DEFAULT_CLIP_INTERVAL_MINUTES = 5;
const FIRST_CAPTURE_DELAY_MS = 2000;
const RECORDER_READY_TIMEOUT_MS = 6000;
const RECORDING_SETTLE_TIMEOUT_MS = 8000;
const CAMERA_RELEASE_DELAY_MS = 1800;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, timeoutMs, message, onTimeout) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      onTimeout?.();
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
};

export function MonitoringProvider({ children }) {
  const recorderRef = useRef(null);
  const captureTimerRef = useRef(null);
  const captureTaskRef = useRef(null);
  const captureInFlightRef = useRef(false);
  const recorderReadyRef = useRef(false);
  const recordingRef = useRef(false);
  const monitoringActiveRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const monitorSessionRef = useRef(null);
  const syncInFlightRef = useRef(false);
  const currentConfigRef = useRef({
    clipDurationSeconds: DEFAULT_CLIP_DURATION_SECONDS,
    clipIntervalMinutes: DEFAULT_CLIP_INTERVAL_MINUTES,
    sourceMode: 'phone',
    cameraSource: 'phone-camera',
  });

  const [permission, requestPermission] = useCameraPermissions();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [recorderMountKey, setRecorderMountKey] = useState(0);
  const [recorderVisible, setRecorderVisible] = useState(false);
  const [captureState, setCaptureState] = useState('idle');
  const [captureError, setCaptureError] = useState(null);
  const [alertCount, setAlertCount] = useState(0);
  const [monitorStatus, setMonitorStatus] = useState(MonitorService.DEFAULT_MONITOR_STATUS);
  const [currentConfig, setCurrentConfig] = useState(currentConfigRef.current);
  const [queuedEvidenceCount, setQueuedEvidenceCount] = useState(0);

  const refreshAlerts = useCallback(async () => {
    try {
      const alerts = await AlertService.fetchAlerts();
      setAlertCount(Array.isArray(alerts) ? alerts.length : 0);
    } catch {
      setAlertCount(0);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await MonitorService.getMonitorStatus();
      setMonitorStatus(status);
    } catch {
      setMonitorStatus(MonitorService.DEFAULT_MONITOR_STATUS);
    }
  }, []);

  const refreshQueuedEvidence = useCallback(async () => {
    const count = await OfflineEvidenceQueue.getQueuedEvidenceCount();
    setQueuedEvidenceCount(count);
    return count;
  }, []);

  const syncQueuedEvidence = useCallback(async () => {
    if (syncInFlightRef.current) {
      return {
        uploaded: [],
        failed: [],
        remaining: queuedEvidenceCount,
        skipped: true,
      };
    }

    syncInFlightRef.current = true;
    setCaptureState('syncing');
    setCaptureError(null);
    try {
      const result = await OfflineEvidenceQueue.uploadQueuedEvidence({ limit: 2 });
      await refreshQueuedEvidence();
      await refreshStatus();
      await refreshAlerts();
      setCaptureState(result.failed.length ? 'queued' : 'idle');
      return result;
    } catch (error) {
      setCaptureError(error?.message || 'Unable to sync queued evidence.');
      setCaptureState('queued');
      await refreshQueuedEvidence();
      throw error;
    } finally {
      syncInFlightRef.current = false;
    }
  }, [queuedEvidenceCount, refreshAlerts, refreshQueuedEvidence, refreshStatus]);

  const clearCaptureTimer = useCallback(() => {
    if (captureTimerRef.current) {
      clearTimeout(captureTimerRef.current);
      captureTimerRef.current = null;
    }
  }, []);

  const setRecorderReady = useCallback((ready) => {
    recorderReadyRef.current = ready;
  }, []);

  const unmountRecorder = useCallback(() => {
    recorderRef.current = null;
    recorderReadyRef.current = false;
    setRecorderVisible(false);
  }, []);

  const mountRecorder = useCallback(async () => {
    unmountRecorder();
    await wait(CAMERA_RELEASE_DELAY_MS);
    setRecorderMountKey((key) => key + 1);
    setRecorderVisible(true);

    const startedAt = Date.now();
    while (monitoringActiveRef.current && (!recorderRef.current || !recorderReadyRef.current)) {
      if (Date.now() - startedAt > RECORDER_READY_TIMEOUT_MS) {
        throw new Error('Video recorder did not become ready.');
      }
      await wait(100);
    }
  }, [unmountRecorder]);

  const stopNativeRecording = useCallback((reason) => {
    if (!recordingRef.current) return;
    console.log('[Monitor] Stopping native recording:', reason);
    try {
      recorderRef.current?.stopRecording?.();
    } catch (error) {
      console.error('[Monitor] stopRecording failed:', error);
    }
  }, []);

  const finishMonitoringStop = useCallback(async () => {
    clearCaptureTimer();
    monitoringActiveRef.current = false;
    stopRequestedRef.current = false;
    recordingRef.current = false;
    unmountRecorder();
    setIsMonitoring(false);
    setCaptureState('idle');

    try {
      await MonitorService.stopMonitorSession();
    } finally {
      monitorSessionRef.current = null;
      await refreshStatus();
      await refreshAlerts();
    }
  }, [clearCaptureTimer, refreshAlerts, refreshStatus, unmountRecorder]);

  const uploadClip = useCallback(async (clip, clipDurationSeconds) => {
    if (!clip?.uri) {
      throw new Error('Recording finished without a video URI.');
    }

    setCaptureState('uploading');
    setCaptureError(null);
    const config = currentConfigRef.current;
    const evidence = {
      uri: clip.uri,
      name: `monitor-${Date.now()}.mp4`,
      type: 'video/mp4',
      sourceMode: config.sourceMode,
      cameraSource: config.cameraSource,
      guideName: 'Tour guide',
      location: config.location || 'Field monitoring preview',
      clipDuration: `${clipDurationSeconds}s`,
      clipIntervalMinutes: config.clipIntervalMinutes,
    };

    let result;
    try {
      result = await MonitorEvidenceService.uploadMonitorEvidence(evidence);
    } catch (error) {
      console.log('[Monitor] Upload failed; queueing clip locally:', error?.message || error);
      await OfflineEvidenceQueue.queueEvidenceClip({
        ...evidence,
        sourceMode: 'phone-offline',
        cameraSource: config.cameraSource || 'offline-phone-camera',
        location: config.location || 'Offline field monitoring',
      });
      await refreshQueuedEvidence();
      setCaptureState('queued');
      return { queued: true };
    }

    console.log('[Monitor] Upload result:', {
      alert: Boolean(result?.alert),
      deleted: result?.deleted_after_processing,
    });

    if (result?.alert) await refreshAlerts();
    await refreshStatus();
  }, [refreshAlerts, refreshQueuedEvidence, refreshStatus]);

  const scheduleNextCapture = useCallback((delayMs) => {
    clearCaptureTimer();
    if (!monitoringActiveRef.current || stopRequestedRef.current) return;

    captureTimerRef.current = setTimeout(() => {
      captureTimerRef.current = null;
      captureTaskRef.current?.();
    }, Math.max(0, delayMs));
  }, [clearCaptureTimer]);

  const captureAndUploadClip = useCallback(async () => {
    if (!monitoringActiveRef.current || captureInFlightRef.current || Platform.OS === 'web') return;

    captureInFlightRef.current = true;
    setCaptureState('recording');
    setCaptureError(null);

    const config = currentConfigRef.current;
    const clipDurationSeconds = Math.max(
      5,
      Number(config.clipDurationSeconds) || DEFAULT_CLIP_DURATION_SECONDS
    );
    const clipDurationMs = clipDurationSeconds * 1000;

    try {
      console.log('[Monitor] Recording clip:', {
        duration: clipDurationSeconds,
        interval: config.clipIntervalMinutes,
      });

      await mountRecorder();
      if (!monitoringActiveRef.current) return;

      recordingRef.current = true;
      const recordPromise = recorderRef.current.recordAsync({
        maxDuration: clipDurationSeconds,
      });
      recordPromise.catch(() => {
        // Native may reject after timeout cleanup; prevent unhandled rejection noise.
      });

      const clip = await withTimeout(
        recordPromise,
        clipDurationMs + RECORDING_SETTLE_TIMEOUT_MS,
        'Recording did not finish after the requested clip duration.',
        () => stopNativeRecording('timeout')
      );

      recordingRef.current = false;
      console.log('[Monitor] Recording completed:', { uri: clip?.uri });
      unmountRecorder();

      const uploadResult = await uploadClip(clip, clipDurationSeconds);
      setCaptureState(uploadResult?.queued ? 'queued' : 'idle');

      if (stopRequestedRef.current) {
        await finishMonitoringStop();
        return;
      }

      const intervalMs = Math.max(
        1,
        Number(config.clipIntervalMinutes) || DEFAULT_CLIP_INTERVAL_MINUTES
      ) * 60 * 1000;
      scheduleNextCapture(intervalMs);
    } catch (error) {
      recordingRef.current = false;
      unmountRecorder();

      if (stopRequestedRef.current) {
        console.log('[Monitor] Recording stopped without usable clip:', error?.message);
        await finishMonitoringStop();
        return;
      }

      console.error('[Monitor] Capture error:', error);
      setCaptureError(error?.message || 'Unable to record monitoring clip.');
      setCaptureState('error');
      // Do not immediately retry after native recording failure. Android may need release time.
    } finally {
      captureInFlightRef.current = false;
    }
  }, [
    finishMonitoringStop,
    mountRecorder,
    scheduleNextCapture,
    stopNativeRecording,
    unmountRecorder,
    uploadClip,
  ]);

  captureTaskRef.current = captureAndUploadClip;

  useEffect(() => {
    refreshStatus();
    refreshAlerts();
    refreshQueuedEvidence();
  }, [refreshAlerts, refreshQueuedEvidence, refreshStatus]);

  useEffect(() => {
    if (queuedEvidenceCount < 1 || isMonitoring) return;

    syncQueuedEvidence().catch((error) => {
      console.log('[Monitor] Queued evidence sync waiting:', error?.message || error);
    });
  }, [isMonitoring, queuedEvidenceCount, syncQueuedEvidence]);

  useEffect(() => {
    if (queuedEvidenceCount < 1 || isMonitoring) return undefined;

    const interval = setInterval(() => {
      syncQueuedEvidence().catch((error) => {
        console.log('[Monitor] Queued evidence periodic sync waiting:', error?.message || error);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [isMonitoring, queuedEvidenceCount, syncQueuedEvidence]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || queuedEvidenceCount < 1 || isMonitoring) return;
      syncQueuedEvidence().catch((error) => {
        console.log('[Monitor] Queued evidence sync on app resume waiting:', error?.message || error);
      });
    });

    return () => subscription.remove();
  }, [isMonitoring, queuedEvidenceCount, syncQueuedEvidence]);

  useEffect(() => () => {
    clearCaptureTimer();
    unmountRecorder();
  }, [clearCaptureTimer, unmountRecorder]);

  const startMonitoring = useCallback(async (options = {}) => {
    const nextConfig = {
      clipDurationSeconds: Number(options.clipDurationSeconds) || DEFAULT_CLIP_DURATION_SECONDS,
      clipIntervalMinutes: Number(options.clipIntervalMinutes) || DEFAULT_CLIP_INTERVAL_MINUTES,
      sourceMode: options.sourceMode || 'phone',
      cameraSource: options.cameraSource || 'phone-camera',
      location: options.location || 'Field monitoring preview',
    };

    console.log('[Monitor] Starting monitoring:', nextConfig);
    clearCaptureTimer();
    unmountRecorder();
    setCurrentConfig(nextConfig);
    currentConfigRef.current = nextConfig;
    setCaptureError(null);
    setCaptureState('idle');

    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult?.granted) {
        throw new Error('Camera permission is required to start monitoring.');
      }
    }

    const session = await MonitorService.startMonitorSession({
      sourceMode: nextConfig.sourceMode,
      cameraSource: nextConfig.cameraSource,
      clipIntervalMinutes: nextConfig.clipIntervalMinutes,
    });

    monitorSessionRef.current = session;
    monitoringActiveRef.current = true;
    stopRequestedRef.current = false;
    setIsMonitoring(true);
    await refreshStatus();
    await refreshAlerts();
    await refreshQueuedEvidence();
    scheduleNextCapture(FIRST_CAPTURE_DELAY_MS);
    return session;
  }, [
    clearCaptureTimer,
    permission?.granted,
    refreshAlerts,
    refreshQueuedEvidence,
    refreshStatus,
    requestPermission,
    scheduleNextCapture,
    unmountRecorder,
  ]);

  const stopMonitoring = useCallback(async () => {
    console.log('[Monitor] Stop monitoring requested:', {
      inFlight: captureInFlightRef.current,
      recording: recordingRef.current,
    });

    stopRequestedRef.current = true;
    clearCaptureTimer();

    if (recordingRef.current) {
      stopNativeRecording('user stopped monitoring');
      return;
    }

    if (captureInFlightRef.current) {
      return;
    }

    await finishMonitoringStop();
  }, [clearCaptureTimer, finishMonitoringStop, stopNativeRecording]);

  const handleRecorderReady = useCallback(() => {
    console.log('[Monitor] Recorder ready');
    setRecorderReady(true);
  }, [setRecorderReady]);

  const handleRecorderUnmount = useCallback(() => {
    recorderRef.current = null;
    setRecorderReady(false);
  }, [setRecorderReady]);

  const handleRecorderMountError = useCallback((error) => {
    console.error('[Monitor] Recorder mount error:', error);
    setRecorderReady(false);
    setCaptureError(error?.message || 'Unable to initialize video recorder.');
    unmountRecorder();
  }, [setRecorderReady, unmountRecorder]);

  const value = useMemo(() => ({
    alertCount,
    captureError,
    captureState,
    cameraPermissionGranted: Boolean(permission?.granted),
    isMonitoring,
    monitorSession: monitorSessionRef.current,
    monitorStatus,
    queuedEvidenceCount,
    recorderMountKey,
    recorderRef,
    recorderVisible,
    handleRecorderMountError,
    handleRecorderReady,
    handleRecorderUnmount,
    startMonitoring,
    stopMonitoring,
    syncQueuedEvidence,
    refreshMonitorState: async () => {
      await refreshStatus();
      await refreshAlerts();
      await refreshQueuedEvidence();
    },
    clipDurationSeconds: currentConfig.clipDurationSeconds,
    clipIntervalMinutes: currentConfig.clipIntervalMinutes,
  }), [
    alertCount,
    captureError,
    captureState,
    currentConfig.clipDurationSeconds,
    currentConfig.clipIntervalMinutes,
    isMonitoring,
    monitorStatus,
    permission?.granted,
    queuedEvidenceCount,
    recorderMountKey,
    recorderVisible,
    handleRecorderMountError,
    handleRecorderReady,
    handleRecorderUnmount,
    refreshAlerts,
    refreshStatus,
    startMonitoring,
    stopMonitoring,
    syncQueuedEvidence,
  ]);

  return (
    <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
}
