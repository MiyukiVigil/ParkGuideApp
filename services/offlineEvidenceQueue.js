import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import * as MonitorEvidenceService from "./monitorEvidenceService";
import * as MonitorService from "./monitorService";

const QUEUE_STORAGE_KEY = "parkguide.offlineEvidenceQueue.v1";
const EVIDENCE_DIR = `${FileSystem.documentDirectory || ""}monitor-evidence/`;
const ESP32_FRAME_DIR = `${FileSystem.documentDirectory || ""}monitor-esp32-frames/`;
const MAX_QUEUED_ESP32_FRAMES = 60;

const readQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = async (items) => {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
};

const ensureEvidenceDir = async () => {
  if (!FileSystem.documentDirectory) return;
  const info = await FileSystem.getInfoAsync(EVIDENCE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(EVIDENCE_DIR, { intermediates: true });
  }
};

const ensureEsp32FrameDir = async () => {
  if (!FileSystem.documentDirectory) return;
  const info = await FileSystem.getInfoAsync(ESP32_FRAME_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ESP32_FRAME_DIR, { intermediates: true });
  }
};

const getExtension = (name = "", uri = "") => {
  const match = String(name || uri).match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  return match ? `.${match[1]}` : ".mp4";
};

export const getQueuedEvidence = readQueue;

export const getQueuedEvidenceCount = async () => {
  const queue = await readQueue();
  return queue.length;
};

export const queueEvidenceClip = async ({
  uri,
  name,
  type = "video/mp4",
  sourceMode = "phone-offline",
  cameraSource = "offline-phone-camera",
  guideName = "Tour guide",
  location = "Offline field monitoring",
  clipDuration = "",
  clipIntervalMinutes = 5,
}) => {
  if (!uri) {
    throw new Error("Missing clip URI for offline queue.");
  }

  await ensureEvidenceDir();
  const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const extension = getExtension(name, uri);
  const storedName = name || `${id}${extension}`;
  let storedUri = uri;

  if (FileSystem.documentDirectory) {
    storedUri = `${EVIDENCE_DIR}${id}${extension}`;
    await FileSystem.copyAsync({ from: uri, to: storedUri });
  }

  const item = {
    id,
    uri: storedUri,
    name: storedName,
    type,
    sourceMode,
    cameraSource,
    guideName,
    location,
    clipDuration,
    clipIntervalMinutes,
    createdAt: new Date().toISOString(),
  };

  const queue = await readQueue();
  await writeQueue([item, ...queue]);
  return item;
};

export const queueEsp32FrameClip = async ({
  frames = [],
  baseUrl = "",
  cameraSource = "",
  location = "ESP32-CAM monitoring",
  fps = 1,
  clipIntervalMinutes = 5,
}) => {
  if (!frames.length) {
    throw new Error("Missing ESP32 frames for offline queue.");
  }

  await ensureEsp32FrameDir();
  const id = `esp32-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const frameUris = [];
  const sourceFrames =
    frames.length > MAX_QUEUED_ESP32_FRAMES
      ? frames.filter((_, index) => index % Math.ceil(frames.length / MAX_QUEUED_ESP32_FRAMES) === 0).slice(0, MAX_QUEUED_ESP32_FRAMES)
      : frames;

  if (FileSystem.documentDirectory) {
    const itemDir = `${ESP32_FRAME_DIR}${id}/`;
    await FileSystem.makeDirectoryAsync(itemDir, { intermediates: true });
    for (let index = 0; index < sourceFrames.length; index += 1) {
      const targetUri = `${itemDir}frame-${String(index + 1).padStart(3, "0")}.jpg`;
      await FileSystem.copyAsync({ from: sourceFrames[index], to: targetUri });
      frameUris.push(targetUri);
    }
  } else {
    frameUris.push(...sourceFrames);
  }

  const item = {
    id,
    kind: "esp32-firebase-frames",
    frames: frameUris,
    baseUrl,
    cameraSource: cameraSource || baseUrl || "RE-CAM-01",
    location,
    fps,
    clipIntervalMinutes,
    createdAt: new Date().toISOString(),
  };

  const queue = await readQueue();
  await writeQueue([item, ...queue]);
  return item;
};

export const removeQueuedEvidence = async (id, { deleteFile = true } = {}) => {
  const queue = await readQueue();
  const target = queue.find((item) => item.id === id);
  await writeQueue(queue.filter((item) => item.id !== id));

  if (deleteFile && target?.kind === "esp32-firebase-frames") {
    for (const frameUri of target.frames || []) {
      if (frameUri?.startsWith(FileSystem.documentDirectory || "file://")) {
        try {
          await FileSystem.deleteAsync(frameUri, { idempotent: true });
        } catch {
          // The queue entry is already gone; stale frame files should not block sync.
        }
      }
    }
  } else if (deleteFile && target?.uri?.startsWith(FileSystem.documentDirectory || "file://")) {
    try {
      await FileSystem.deleteAsync(target.uri, { idempotent: true });
    } catch {
      // The queue entry is already gone; a stale local file should not block sync.
    }
  }
};

const uploadQueuedItem = async (item) => {
  if (item.kind === "esp32-firebase-frames") {
    return MonitorService.uploadEsp32FramesViaFirebase({
      frames: item.frames || [],
      baseUrl: item.baseUrl,
      cameraSource: item.cameraSource,
      location: item.location,
      fps: item.fps,
      clipIntervalMinutes: item.clipIntervalMinutes,
    });
  }

  return MonitorEvidenceService.uploadMonitorEvidence(item);
};

export const uploadQueuedEvidence = async ({ limit = 3 } = {}) => {
  const queue = await readQueue();
  const uploaded = [];
  const failed = [];

  for (const item of queue.slice().reverse()) {
    if (uploaded.length >= limit) break;

    try {
      await uploadQueuedItem(item);
      await removeQueuedEvidence(item.id);
      uploaded.push(item);
    } catch (error) {
      failed.push({ item, error });
      break;
    }
  }

  return {
    uploaded,
    failed,
    remaining: await getQueuedEvidenceCount(),
  };
};
