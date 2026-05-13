import AsyncStorage from "@react-native-async-storage/async-storage";

import CONFIG from "../constants/config";

const ESP32_BASE_URL_KEY = "parkguide.esp32CameraBaseUrl.v1";
const DEFAULT_TIMEOUT_MS = 9000;
const DISCOVERY_TIMEOUT_MS = 1500;
const DISCOVERY_BATCH_SIZE = 18;

export const normalizeEsp32BaseUrl = (value) => {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
};

export const getSavedEsp32BaseUrl = async () => {
  const saved = await AsyncStorage.getItem(ESP32_BASE_URL_KEY);
  return normalizeEsp32BaseUrl(saved);
};

export const saveEsp32BaseUrl = async (value) => {
  const normalized = normalizeEsp32BaseUrl(value);
  if (!normalized) {
    await AsyncStorage.removeItem(ESP32_BASE_URL_KEY);
    return "";
  }
  await AsyncStorage.setItem(ESP32_BASE_URL_KEY, normalized);
  return normalized;
};

const requestEsp32 = async (baseUrl, path, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  const normalized = normalizeEsp32BaseUrl(baseUrl);
  if (!normalized) {
    throw new Error("Enter the ESP32-CAM IP address first.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${normalized}${path}`, {
      method: "GET",
      signal: controller.signal,
    });
    const text = await response.text();
    let data = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // ESP32 control endpoints may return plain text on older sketches.
    }

    if (!response.ok) {
      throw new Error(`ESP32 request failed: ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("ESP32-CAM did not respond. Check that your phone is on the same WiFi/hotspot.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const isPrivateIpv4 = (host) => {
  const parts = String(host || "").split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
};

const getHostFromUrl = (value) => {
  try {
    return new URL(normalizeEsp32BaseUrl(value)).hostname;
  } catch {
    return "";
  }
};

const getSubnetCandidates = async () => {
  const saved = await getSavedEsp32BaseUrl();
  const hosts = [
    getHostFromUrl(saved),
    getHostFromUrl(CONFIG.API_BASE_URL),
  ].filter(isPrivateIpv4);

  const prefixes = [...new Set(hosts.map((host) => host.split(".").slice(0, 3).join(".")))];
  return prefixes.flatMap((prefix) => Array.from({ length: 254 }, (_, index) => `http://${prefix}.${index + 1}`));
};

const looksLikeParkGuideCamera = (status) => {
  const haystack = [
    status?.device,
    status?.mdns,
    status?.streamUrl,
    status?.pageUrl,
  ].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes("parkguide") || haystack.includes("esp32-cam") || haystack.includes("ranger");
};

const findFirst = async (items, worker, batchSize = DISCOVERY_BATCH_SIZE) => {
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const results = await Promise.all(batch.map(worker));
    const found = results.find(Boolean);
    if (found) return found;
  }
  return null;
};

const getStreamUrlForBaseUrl = (baseUrl) => {
  const normalized = normalizeEsp32BaseUrl(baseUrl);
  try {
    const parsed = new URL(normalized);
    parsed.port = "81";
    parsed.pathname = "/stream";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return `${normalized}:81/stream`;
  }
};

export const getEsp32Status = async (baseUrl) => {
  const data = await requestEsp32(baseUrl, "/status");
  return {
    ...data,
    pageUrl: data?.pageUrl || normalizeEsp32BaseUrl(baseUrl),
    streamUrl: data?.streamUrl || getStreamUrlForBaseUrl(baseUrl),
  };
};

export const discoverEsp32Camera = async () => {
  const saved = await getSavedEsp32BaseUrl();
  const directCandidates = [
    saved,
    "http://parkguide-cam.local",
  ].filter(Boolean);

  const directMatch = await findFirst(directCandidates, async (candidate) => {
    try {
      const status = await getEsp32Status(candidate);
      if (!looksLikeParkGuideCamera(status)) return null;
      const baseUrl = await saveEsp32BaseUrl(status.pageUrl || candidate);
      return { baseUrl, status };
    } catch {
      return null;
    }
  }, 2);

  if (directMatch) return directMatch;

  const subnetCandidates = await getSubnetCandidates();
  const subnetMatch = await findFirst(subnetCandidates, async (candidate) => {
    try {
      const status = await requestEsp32(candidate, "/status", { timeoutMs: DISCOVERY_TIMEOUT_MS });
      if (!looksLikeParkGuideCamera(status)) return null;
      const baseUrl = await saveEsp32BaseUrl(status.pageUrl || candidate);
      return {
        baseUrl,
        status: {
          ...status,
          pageUrl: status?.pageUrl || baseUrl,
          streamUrl: status?.streamUrl || getStreamUrlForBaseUrl(baseUrl),
        },
      };
    } catch {
      return null;
    }
  });

  if (!subnetMatch) {
    throw new Error("Could not auto-find ESP32-CAM. Check that the phone is on the same WiFi as the camera.");
  }

  return subnetMatch;
};

export const startEsp32RecordingState = async (baseUrl) => {
  return requestEsp32(baseUrl, "/record/start");
};

export const stopEsp32RecordingState = async (baseUrl) => {
  return requestEsp32(baseUrl, "/record/stop");
};
