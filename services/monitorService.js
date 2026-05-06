import api from "../utils/api";

const MONITOR_API_ENABLED = process.env.EXPO_PUBLIC_MONITOR_API_ENABLED !== "false";
let warnedMonitorApiDisabled = false;
let warnedStatusEndpoint = false;
let warnedStartEndpoint = false;
let warnedStopEndpoint = false;

export const DEFAULT_MONITOR_STATUS = {
  isLive: false,
  state: "offline",
  source: "esp32",
  streamUrl: null,
  sessionId: null,
  alertCount: 0,
  lastSeenAt: null,
  message: "Camera module is not connected.",
};

const normalizeMonitorStatus = (data = {}) => {
  const rawState = String(data.state || data.status || "").toLowerCase();
  const isLive =
    data.isLive === true ||
    data.is_live === true ||
    rawState === "live" ||
    rawState === "online" ||
    rawState === "streaming";
  let state = "offline";
  if (isLive) {
    state = "live";
  } else if (rawState === "checking" || rawState === "connecting") {
    state = "checking";
  } else if (rawState === "error") {
    state = "error";
  }
  return {
    isLive,
    state,
    source: data.source || data.camera_source || "esp32-cam",
    streamUrl: data.streamUrl || data.stream_url || null,
    sessionId: data.sessionId || data.session_id || null,
    alertCount: Number(data.alertCount || data.alert_count || 0),
    lastSeenAt: data.lastSeenAt || data.last_seen_at || null,
    message: data.message || (isLive ? "Camera module is live." : "Camera module is not connected."),
  };
};

const logOnce = (type, message, err) => {
  if (!__DEV__) return;
  const status = err?.response?.status;
  const suffix = status ? ` Status: ${status}` : "";
  if (type === "disabled" && !warnedMonitorApiDisabled) {
    warnedMonitorApiDisabled = true;
    console.log(message);
  }
  if (type === "status" && !warnedStatusEndpoint) {
    warnedStatusEndpoint = true;
    console.log(`${message}${suffix}`);
  }
  if (type === "start" && !warnedStartEndpoint) {
    warnedStartEndpoint = true;
    console.log(`${message}${suffix}`);
  }
  if (type === "stop" && !warnedStopEndpoint) {
    warnedStopEndpoint = true;
    console.log(`${message}${suffix}`);
  }
};

export const getMonitorStatus = async () => {
  if (!MONITOR_API_ENABLED) {
    logOnce(
      "disabled",
      "[monitor] backend polling disabled by EXPO_PUBLIC_MONITOR_API_ENABLED=false. Using offline ESP32 status."
    );
    return DEFAULT_MONITOR_STATUS;
  }
  try {
    const response = await api.get("/monitor/status/");
    return normalizeMonitorStatus(response.data);
  } catch (err) {
    logOnce(
      "status",
      "[monitor] status endpoint unavailable. Falling back to offline placeholder.",
      err
    );
    return DEFAULT_MONITOR_STATUS;
  }
};
export const startMonitorSession = async () => {
  if (!MONITOR_API_ENABLED) {
    return {
      localOnly: true,
      sessionActive: true,
    };
  }
  try {
    const response = await api.post("/monitor/session/start/");
    return response.data;
  } catch (err) {
    logOnce(
      "start",
      "[monitor] start session endpoint unavailable. Using local preview only.",
      err
    );
    return {
      localOnly: true,
      sessionActive: true,
    };
  }
};
export const stopMonitorSession = async () => {
  if (!MONITOR_API_ENABLED) {
    return {
      localOnly: true,
      sessionActive: false,
    };
  }
  try {
    const response = await api.post("/monitor/session/stop/");
    return response.data;
  } catch (err) {
    logOnce(
      "stop",
      "[monitor] stop session endpoint unavailable. Stopping local preview only.",
      err
    );
    return {
      localOnly: true,
      sessionActive: false,
    };
  }
};
