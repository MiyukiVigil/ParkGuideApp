import api from "../utils/api";

const ALERTS_API_ENABLED = process.env.EXPO_PUBLIC_ALERTS_API_ENABLED === "true";

let warnedAlertsApiDisabled = false;
let warnedAlertsEndpoint = false;

export const LOCAL_ALERTS = [
  {
    id: "alert-local-001",
    title: "Protected plant disturbance detected",
    summary: "Possible prohibited plant handling detected from returned camera footage.",
    severity: "High",
    status: "Pending review",
    detectedActivity: "Protected plant disturbance",
    confidence: "84%",
    cameraId: "CAM-LOCAL-01",
    guideName: "test user",
    location: "Field monitoring preview",
    capturedAt: "Just now",
    receivedAt: "Just now",
    videoUrl: null,
    videoFilename: "protected-plant-disturbance-preview.mp4",
    videoDuration: "00:18",
    evidenceStatus: "Placeholder video not attached",
    recommendedAction: "Review the returned footage and confirm whether the detected action violates park regulations.",
    details:
      "The camera module is expected to send back short video footage every few minutes instead of livestreaming directly to the server. This placeholder alert represents a future AI-generated violation record. When the backend is connected, this card should display the actual returned video clip, detection result, guide/session details, confidence score, and review status.",
  },
  {
    id: "alert-local-002",
    title: "Person detected near restricted object",
    summary: "A person was detected near a monitored object in the returned footage.",
    severity: "Medium",
    status: "Pending review",
    detectedActivity: "Person near restricted object",
    confidence: "91%",
    cameraId: "CAM-LOCAL-01",
    guideName: "test user",
    location: "Field monitoring preview",
    capturedAt: "Just now",
    receivedAt: "Just now",
    videoUrl: null,
    videoFilename: "person-near-restricted-object-preview.mp4",
    videoDuration: "00:21",
    evidenceStatus: "Placeholder video not attached",
    recommendedAction: "Check the footage and verify whether the detected activity requires intervention or documentation.",
    details:
      "This placeholder alert is used to test the frontend evidence-review flow before the real camera module and backend alert storage are completed. In the final implementation, each alert card should be linked to a specific uploaded video segment from the camera module.",
  },
];

export const getLocalAlerts = () => LOCAL_ALERTS;

const logOnce = (type, message, err) => {
  if (!__DEV__) return;
  const status = err?.response?.status;
  const suffix = status ? ` Status: ${status}` : "";
  if (type === "disabled" && !warnedAlertsApiDisabled) {
    warnedAlertsApiDisabled = true;
    console.log(message);
  }
  if (type === "alerts" && !warnedAlertsEndpoint) {
    warnedAlertsEndpoint = true;
    console.log(`${message}${suffix}`);
  }
};

const normalizeAlert = (item = {}) => ({
  id: String(item.id || item.alert_id || item.violation_id || Date.now()),
  title: item.title || item.detected_activity || item.detected_class || "Violation alert",
  summary: item.summary || item.description || "A possible violation was detected from returned camera footage.",
  severity: item.severity || "Unspecified",
  status: item.status || item.review_status || "Pending review",
  detectedActivity: item.detectedActivity || item.detected_activity || item.detected_class || "Unspecified detection",
  confidence: item.confidence || item.confidence_score || "N/A",
  cameraId: item.cameraId || item.camera_id || item.camera_source || "N/A",
  guideName: item.guideName || item.guide_name || item.guide || "N/A",
  location: item.location || "N/A",
  capturedAt: item.capturedAt || item.captured_at || item.time || "N/A",
  receivedAt: item.receivedAt || item.received_at || item.created_at || "N/A",
  videoUrl: item.videoUrl || item.video_url || item.evidence_video_url || null,
  videoFilename: item.videoFilename || item.video_filename || item.evidence_filename || "No video filename",
  videoDuration: item.videoDuration || item.video_duration || "N/A",
  evidenceStatus: item.evidenceStatus || item.evidence_status || "N/A",
  recommendedAction: item.recommendedAction || item.recommended_action || "Review the footage and confirm whether further action is required.",
  details: item.details || item.fullText || item.full_text || item.description || "No additional details provided.",
});

export const fetchAlerts = async () => {
  if (!ALERTS_API_ENABLED) {
    logOnce("disabled", "[alerts] backend alert polling disabled. Using local placeholder alerts until the alerts API is ready.");
    return LOCAL_ALERTS;
  }
  try {
    const response = await api.get("/monitor/alerts/");
    if (Array.isArray(response.data)) {
      return response.data.map(normalizeAlert);
    }
    if (Array.isArray(response.data?.results)) {
      return response.data.results.map(normalizeAlert);
    }
    return LOCAL_ALERTS;
  } catch (err) {
    logOnce("alerts", "[alerts] alerts endpoint unavailable. Falling back to local placeholder alerts.", err);
    return LOCAL_ALERTS;
  }
};