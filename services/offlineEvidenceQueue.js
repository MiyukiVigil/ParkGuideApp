import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MonitorEvidenceService from "./monitorEvidenceService";
import * as MonitorService from "./monitorService";
import {ensureDirectoryAsync, encryptFileToUri, decryptFileToUri, deleteSecureFileKey, deleteLocalFile, listDirectoryAsync} from "../utils/secureLocalFileStorage";

const QUEUE_INDEX_KEY = "parkguide.offlineEvidenceQueue.index.v2";
const QUEUE_ITEM_KEY_PREFIX = "parkguide.offlineEvidenceQueue.item.v2.";
const EVIDENCE_DIR = `${FileSystem.documentDirectory || ""}monitor-evidence-secure/`;
const ESP32_FRAME_DIR = `${FileSystem.documentDirectory || ""}monitor-esp32-frames-secure/`;
const TEMP_UPLOAD_DIR = `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ""}monitor-upload-temp/`;
const MAX_QUEUED_ESP32_FRAMES = 60;

const isSecureQueueSupported = () => Platform.OS !== "web";

const assertSecureQueueSupported = () => {
  if (!isSecureQueueSupported()) {
    throw new Error("Offline evidence queue is disabled on web because secure local storage is not available.");
  }
};

const getQueueItemKey = (id) => `${QUEUE_ITEM_KEY_PREFIX}${id}`;

const readQueueIds = async () => {
  if (!isSecureQueueSupported()) return [];

  try {
    const raw = await SecureStore.getItemAsync(QUEUE_INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueueIds = async (ids) => {
  assertSecureQueueSupported();

  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  await SecureStore.setItemAsync(QUEUE_INDEX_KEY, JSON.stringify(uniqueIds));
};

const readQueue = async () => {
  if (!isSecureQueueSupported()) return [];

  const ids = await readQueueIds();
  const items = [];

  for (const id of ids) {
    try {
      const raw = await SecureStore.getItemAsync(getQueueItemKey(id));
      if (raw) {
        items.push(JSON.parse(raw));
      }
    } catch {
      // Skip corrupted entries.
    }
  }

  return items;
};

const appendQueueItem = async (item) => {
  assertSecureQueueSupported();

  await SecureStore.setItemAsync(getQueueItemKey(item.id), JSON.stringify(item));

  const ids = await readQueueIds();
  await writeQueueIds([item.id, ...ids.filter((id) => id !== item.id)]);
};

const removeQueueItemMetadata = async (id) => {
  if (!isSecureQueueSupported() || !id) return;
  const ids = await readQueueIds();
  await writeQueueIds(ids.filter((storedId) => storedId !== id));
  await SecureStore.deleteItemAsync(getQueueItemKey(id));
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
  assertSecureQueueSupported();
  if (!uri) {
    throw new Error("Missing clip URI for offline queue.");
  }
  await ensureDirectoryAsync(EVIDENCE_DIR);
  const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const extension = getExtension(name, uri);
  const storedName = name || `${id}${extension}`;
  const encryptedUri = `${EVIDENCE_DIR}${id}${extension}.enc`;
  const keyId = `evidence-${id}`;
  await encryptFileToUri({
    sourceUri: uri,
    encryptedUri,
    keyId,
    deleteSource: true,
  });
  const item = {
    id,
    encryptedUri,
    keyId,
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
  await appendQueueItem(item);
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
  assertSecureQueueSupported();
  if (!frames.length) {
    throw new Error("Missing ESP32 frames for offline queue.");
  }
  await ensureDirectoryAsync(ESP32_FRAME_DIR);
  const id = `esp32-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const encryptedFrameDir = `${ESP32_FRAME_DIR}${id}/`;
  const keyId = `esp32-frames-${id}`;
  await ensureDirectoryAsync(encryptedFrameDir);
  const sourceFrames =
    frames.length > MAX_QUEUED_ESP32_FRAMES
      ? frames
          .filter((_, index) => index % Math.ceil(frames.length / MAX_QUEUED_ESP32_FRAMES) === 0)
          .slice(0, MAX_QUEUED_ESP32_FRAMES)
      : frames;
  const selectedFrameSet = new Set(sourceFrames);
  for (let index = 0; index < sourceFrames.length; index += 1) {
    const encryptedUri = `${encryptedFrameDir}frame-${String(index + 1).padStart(3, "0")}.jpg.enc`;
    await encryptFileToUri({
      sourceUri: sourceFrames[index],
      encryptedUri,
      keyId,
      deleteSource: true,
    });
  }
  const skippedFrames = frames.filter((uri) => !selectedFrameSet.has(uri));
  await Promise.all(
    skippedFrames.map((uri) => deleteLocalFile(uri))
  );
  const item = {
    id,
    kind: "esp32-firebase-frames",
    encryptedFrameDir,
    keyId,
    frameCount: sourceFrames.length,
    baseUrl,
    cameraSource: cameraSource || baseUrl || "RE-CAM-01",
    location,
    fps,
    clipIntervalMinutes,
    createdAt: new Date().toISOString(),
  };
  await appendQueueItem(item);
  return item;
};

export const removeQueuedEvidence = async (id, { deleteFile = true } = {}) => {
  const queue = await readQueue();
  const target = queue.find((item) => item.id === id);

  await removeQueueItemMetadata(id);

  if (!target || !deleteFile) return;

  if (target.kind === "esp32-firebase-frames") {
    await deleteLocalFile(target.encryptedFrameDir);
  } else {
    await deleteLocalFile(target.encryptedUri);
  }

  await deleteSecureFileKey(target.keyId);
};

const decryptQueuedVideoToTempFile = async (item) => {
  await ensureDirectoryAsync(TEMP_UPLOAD_DIR);

  const extension = getExtension(item.name, item.encryptedUri);
  const tempUri = `${TEMP_UPLOAD_DIR}${item.id}${extension}`;

  await decryptFileToUri({
    encryptedUri: item.encryptedUri,
    outputUri: tempUri,
    keyId: item.keyId,
  });

  return tempUri;
};

const decryptQueuedFramesToTempFiles = async (item) => {
  await ensureDirectoryAsync(TEMP_UPLOAD_DIR);

  const tempDir = `${TEMP_UPLOAD_DIR}${item.id}/`;
  await ensureDirectoryAsync(tempDir);

  const encryptedNames = (await listDirectoryAsync(item.encryptedFrameDir))
    .filter((name) => name.endsWith(".enc"))
    .sort();

  const frameUris = [];

  for (const encryptedName of encryptedNames) {
    const encryptedUri = `${item.encryptedFrameDir}${encryptedName}`;
    const outputName = encryptedName.replace(/\.enc$/i, "");
    const outputUri = `${tempDir}${outputName}`;

    await decryptFileToUri({
      encryptedUri,
      outputUri,
      keyId: item.keyId,
    });

    frameUris.push(outputUri);
  }

  return { tempDir, frameUris };
};

const uploadQueuedItem = async (item) => {
  if (item.kind === "esp32-firebase-frames") {
    const { tempDir, frameUris } = await decryptQueuedFramesToTempFiles(item);

    try {
      return await MonitorService.uploadEsp32FramesViaFirebase({
        frames: frameUris,
        baseUrl: item.baseUrl,
        cameraSource: item.cameraSource,
        location: item.location,
        fps: item.fps,
        clipIntervalMinutes: item.clipIntervalMinutes,
      });
    } finally {
      await deleteLocalFile(tempDir);
    }
  }

  const tempUri = await decryptQueuedVideoToTempFile(item);

  try {
    return await MonitorEvidenceService.uploadMonitorEvidence({
      ...item,
      uri: tempUri,
    });
  } finally {
    await deleteLocalFile(tempUri);
  }
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
