import React, { createContext, useContext, useMemo } from "react";

import * as MonitorService from "../services/monitorService";

const MonitoringContext = createContext(null);

export function MonitoringProvider({ children }) {
  const value = useMemo(
    () => ({
      recorderRef: { current: null },
      recorderVisible: false,
      recorderMountKey: 0,
      captureError: null,
      captureState: "idle",
      isMonitoring: false,
      alertCount: 0,
      monitorStatus: MonitorService.DEFAULT_MONITOR_STATUS,
      queuedEvidenceCount: 0,
      currentConfig: {
        clipDurationSeconds: 12,
        clipIntervalMinutes: 5,
        sourceMode: "web",
        cameraSource: "web-unavailable",
      },
      requestPermission: async () => ({ status: "denied" }),
      setRecorderRef: () => {},
      handleRecorderReady: () => {},
      handleRecordingFinished: () => {},
      handleRecordingError: () => {},
      refreshMonitorState: async () => {},
      startMonitoring: async () => {
        throw new Error("Phone camera monitoring is only available on Android or iOS.");
      },
      stopMonitoring: async () => {},
      syncQueuedEvidence: async () => ({
        uploaded: [],
        failed: [],
        remaining: 0,
        skipped: true,
      }),
    }),
    []
  );

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>;
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error("useMonitoring must be used within a MonitoringProvider");
  }
  return context;
}
