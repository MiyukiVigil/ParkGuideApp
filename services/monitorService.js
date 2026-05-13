import api from "../utils/api";
import * as FileSystem from "expo-file-system/legacy";

const MONITOR_API_ENABLED = process.env.EXPO_PUBLIC_MONITOR_API_ENABLED !== "false";
const FIREBASE_FRAME_UPLOAD_CONCURRENCY = 4;
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
export const startMonitorSession = async (payload = {}) => {
  if (!MONITOR_API_ENABLED) {
    return {
      localOnly: true,
      sessionActive: true,
    };
  }
  try {
    const response = await api.post("/monitor/session/start/", payload);
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

export const recordEsp32Clip = async ({
  baseUrl = "",
  streamUrl = "",
  captureUrl = "",
  durationSeconds = 8,
  cameraSource = "",
  guideName = "RangerEye ESP32-CAM",
  location = "ESP32-CAM monitoring",
  clipIntervalMinutes = 5,
} = {}) => {
  if (!MONITOR_API_ENABLED) {
    throw new Error("Backend monitor API is disabled.");
  }

  const response = await api.post("/monitor/esp32/record/", {
    base_url: baseUrl,
    stream_url: streamUrl,
    capture_url: captureUrl,
    duration_seconds: durationSeconds,
    camera_source: cameraSource || baseUrl || streamUrl || "RE-CAM-01",
    guide_name: guideName,
    location,
    clip_interval_minutes: clipIntervalMinutes,
  });
  return response.data;
};

export const uploadEsp32Frames = async ({
  frames = [],
  baseUrl = "",
  cameraSource = "",
  location = "ESP32-CAM monitoring",
  fps = 1,
  clipIntervalMinutes = 5,
} = {}) => {
  if (!MONITOR_API_ENABLED) {
    throw new Error("Backend monitor API is disabled.");
  }
  if (!frames.length) {
    throw new Error("No ESP32 frames captured.");
  }

  const formData = new FormData();
  frames.forEach((uri, index) => {
    formData.append("frames", {
      uri,
      name: `esp32-frame-${String(index + 1).padStart(3, "0")}.jpg`,
      type: "image/jpeg",
    });
  });
  formData.append("base_url", baseUrl);
  formData.append("camera_source", cameraSource || baseUrl || "RE-CAM-01");
  formData.append("location", location);
  formData.append("fps", String(fps));
  formData.append("clip_interval_minutes", String(clipIntervalMinutes));

  const response = await api.post("/monitor/esp32/frames/", formData);
  return response.data;
};

export const uploadEsp32FramesViaFirebase = async ({
  frames = [],
  baseUrl = "",
  cameraSource = "",
  location = "ESP32-CAM monitoring",
  fps = 1,
  clipIntervalMinutes = 5,
} = {}) => {
  if (!MONITOR_API_ENABLED) {
    throw new Error("Backend monitor API is disabled.");
  }
  if (!frames.length) {
    throw new Error("No ESP32 frames captured.");
  }

  const sessionResponse = await api.post("/monitor/esp32/frame-upload-session/", {
    frame_count: frames.length,
  });
  const uploads = sessionResponse.data?.uploads || [];
  if (uploads.length !== frames.length) {
    throw new Error("Backend did not return enough Firebase upload URLs.");
  }

  const blobPaths = new Array(frames.length);
  let nextIndex = 0;
  const uploadNextFrame = async () => {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= frames.length) return;

    const upload = uploads[index];
    const result = await FileSystem.uploadAsync(upload.upload_url, frames[index], {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      mimeType: upload.content_type || "image/jpeg",
      headers: {
        "Content-Type": upload.content_type || "image/jpeg",
      },
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Firebase frame upload failed with status ${result.status}.`);
    }
    blobPaths[index] = upload.blob_path;
    await uploadNextFrame();
  };

  const workerCount = Math.min(FIREBASE_FRAME_UPLOAD_CONCURRENCY, frames.length);
  await Promise.all(Array.from({ length: workerCount }, uploadNextFrame));

  const processResponse = await api.post("/monitor/esp32/process-firebase-frames/", {
    blob_paths: blobPaths,
    base_url: baseUrl,
    camera_source: cameraSource || baseUrl || "RE-CAM-01",
    location,
    fps,
    clip_interval_minutes: clipIntervalMinutes,
  });
  return processResponse.data;
};

export const recordEsp32ViaStream = async ({
  baseUrl = "",
  streamUrl = "",
  durationSeconds = 15,
  cameraSource = "",
  guideName = "RangerEye ESP32-CAM",
  location = "ESP32-CAM monitoring",
  clipIntervalMinutes = 5,
} = {}) => {
  if (!MONITOR_API_ENABLED) {
    throw new Error("Backend monitor API is disabled.");
  }

  const response = await api.post("/monitor/esp32/record/", {
    base_url: baseUrl,
    stream_url: streamUrl,
    duration_seconds: durationSeconds,
    camera_source: cameraSource || baseUrl || streamUrl || "RE-CAM-01",
    guide_name: guideName,
    location,
    clip_interval_minutes: clipIntervalMinutes,
  });
  return response.data;
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeClip = (item = {}) => {
  const evidenceFile = item.evidence_file || item.evidenceFile || null;
  const alert = item.alert || null;
  return {
    id: String(item.id || Date.now()),
    status: item.status || "recorded",
    title: alert?.title || (item.status === "alert" ? "AI alert clip" : "Recorded footage"),
    summary: alert?.summary || item.details || "ESP32-CAM footage saved for review.",
    cameraSource: item.camera_source || "RE-CAM-01",
    location: item.location || "N/A",
    recordedAt: formatDateTime(item.recorded_at || item.recordedAt),
    videoUrl: item.video_url || item.videoUrl || evidenceFile?.download_url || null,
    videoFilename: item.video_filename || item.videoFilename || evidenceFile?.original_name || "No filename",
    videoDuration: item.video_duration || item.videoDuration || "N/A",
    hasAlert: Boolean(alert),
    alertId: alert?.id || null,
    raw: item,
  };
};

export const fetchMonitorClips = async () => {
  if (!MONITOR_API_ENABLED) return [];

  let nextUrl = "/monitor/clips/";
  const allClips = [];
  while (nextUrl) {
    const response = await api.get(nextUrl);
    if (Array.isArray(response.data)) {
      allClips.push(...response.data);
      break;
    }
    if (Array.isArray(response.data?.results)) {
      allClips.push(...response.data.results);
      nextUrl = response.data.next || null;
      continue;
    }
    break;
  }
  return allClips.map(normalizeClip);
};

export const deleteMonitorClip = async (clipId) => {
  if (!MONITOR_API_ENABLED) {
    throw new Error("Backend monitor API is disabled.");
  }
  if (!clipId) {
    throw new Error("Missing monitor clip id.");
  }

  await api.delete(`/monitor/clips/${clipId}/`);
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
