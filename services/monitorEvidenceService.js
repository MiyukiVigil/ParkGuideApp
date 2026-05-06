import api from "../utils/api";

export const uploadMonitorEvidence = async ({
  uri,
  name,
  type,
  sourceMode = "esp32",
  cameraSource = "RE-CAM-01",
  guideName = "",
  location = "Field monitoring preview",
  clipDuration = "",
  clipIntervalMinutes = 5,
}) => {
  const fileUri = String(uri || "").trim();
  if (!fileUri) {
    throw new Error("Missing evidence file URI.");
  }

  console.log('[MonitorEvidenceService] Uploading evidence:', { fileUri, name, sourceMode });

  try {
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: name || `monitor-${Date.now()}.mp4`,
      type: type || "video/mp4",
    });
    formData.append("source_mode", sourceMode);
    formData.append("camera_source", cameraSource);
    formData.append("guide_name", guideName);
    formData.append("location", location);
    formData.append("clip_duration", clipDuration);
    formData.append("clip_interval_minutes", String(clipIntervalMinutes));

    console.log('[MonitorEvidenceService] FormData prepared, sending POST to /monitor/evidence/');
    const response = await api.post("/monitor/evidence/", formData);
    console.log('[MonitorEvidenceService] Upload successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('[MonitorEvidenceService] Upload failed:', error);
    throw error;
  }
};
