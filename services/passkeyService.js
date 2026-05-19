import { Passkey } from "react-native-passkey";

import CONFIG from "../constants/config";
import api from "../utils/api";

const PASSKEY_DEBUG = true;

const logPasskey = (...args) => {
  if (PASSKEY_DEBUG || __DEV__) {
    console.log("[passkey]", ...args);
  }
};

const summarizeObject = (value) => {
  if (!value || typeof value !== "object") return value;

  return {
    type: Array.isArray(value) ? "array" : "object",
    keys: Object.keys(value),
  };
};

const PASSKEY_START_ENDPOINTS = ["/accounts/passkeys/login/options/"];

const PASSKEY_CONFIRM_ENDPOINTS = ["/accounts/passkeys/login/verify/"];

const PASSKEY_REGISTER_ENDPOINTS = ["/accounts/passkeys/register/options/"];

const PASSKEY_REGISTER_CONFIRM_ENDPOINTS = ["/accounts/passkeys/register/verify/"];

const PASSKEY_DISABLE_ENDPOINTS = ["/accounts/passkeys/disable/"];

const PASSKEY_STATUS_ENDPOINTS = ["/accounts/passkeys/status/"];

const normalizeBaseUrl = (baseUrl) => String(baseUrl || "").trim().replace(/\/+$/, "");

const buildUrl = (path) => {
  const baseUrl = normalizeBaseUrl(CONFIG.PASSKEY_API_BASE_URL || CONFIG.API_BASE_URL);
  if (!baseUrl) return path;
  return `${baseUrl}${path}`;
};

const getErrorCode = (error) => {
  const responseCode = error?.response?.data?.code;
  return String(responseCode || error?.code || error?.name || "").trim().toUpperCase();
};

const getErrorMessage = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail.trim();

  const message = error?.response?.data?.message || error?.message;
  if (typeof message === "string" && message.trim()) return message.trim();

  return "";
};

const summarizePasskeyError = (error) => ({
  name: error?.name,
  code: error?.code,
  message: error?.message,
  nativeStackAndroid: error?.nativeStackAndroid,
  status: error?.response?.status,
  responseCode: error?.response?.data?.code,
  detail: error?.response?.data?.detail,
});

const isNotFound = (error) => error?.response?.status === 404;

const requestWithFallback = async (method, endpoints, data) => {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      logPasskey("request", method.toUpperCase(), buildUrl(endpoint), summarizeObject(data));
      return await api[method](buildUrl(endpoint), data);
    } catch (error) {
      logPasskey(
        "request failed",
        method.toUpperCase(),
        buildUrl(endpoint),
        {
          status: error?.response?.status,
          code: error?.response?.data?.code,
          detail: error?.response?.data?.detail,
          message: error?.message,
        }
      );
      if (isNotFound(error)) {
        lastError = error;
        continue;
      }

      lastError = error;
      break;
    }
  }

  throw lastError || new Error("PASSKEY_REQUEST_FAILED");
};

const extractRequestPayload = (data) => {
  if (!data || typeof data !== "object") return data;
  return data.request || data.options || data.public_key || data.publicKey || data.passkey || data.payload || data.data || data;
};

const normalizeCredentials = (credentials) => {
  if (Array.isArray(credentials)) {
    return credentials.filter(Boolean);
  }

  if (credentials && typeof credentials === "object") {
    return [credentials].filter(Boolean);
  }

  return [];
};

const hasAuthPayload = (data) => Boolean(data && (data.access || data.refresh || data.tokens || data.user));

const toPasskeyState = (data) => ({
  available: isPasskeySupported(),
  enabled: Boolean(data?.enabled ?? data?.is_enabled ?? data?.count ?? normalizeCredentials(data?.credentials).length),
  count: Number(data?.count ?? normalizeCredentials(data?.credentials).length ?? 0) || 0,
  credentials: normalizeCredentials(data?.credentials ?? data?.items ?? data?.results),
});

export function isPasskeySupported() {
  try {
    return Boolean(Passkey?.isSupported?.());
  } catch {
    return false;
  }
}

export async function getPasskeyStatus() {
  if (!isPasskeySupported()) {
    return {
      available: false,
      enabled: false,
      count: 0,
      credentials: [],
    };
  }

  try {
    const response = await requestWithFallback("get", PASSKEY_STATUS_ENDPOINTS);
    logPasskey("status response", summarizeObject(response.data));
    return toPasskeyState(response.data);
  } catch (error) {
    logPasskey("status error", {
      status: error?.response?.status,
      detail: error?.response?.data?.detail,
      message: error?.message,
    });
    return {
      available: isPasskeySupported(),
      enabled: false,
      count: 0,
      credentials: [],
      error,
    };
  }
}

export async function registerPasskey({ currentPassword, label }) {
  if (!currentPassword || !String(currentPassword).trim()) {
    const error = new Error("PASSWORD_REQUIRED");
    error.code = "PASSWORD_REQUIRED";
    throw error;
  }

  if (!isPasskeySupported()) {
    const error = new Error("PASSKEY_NOT_SUPPORTED");
    error.code = "PASSKEY_NOT_SUPPORTED";
    throw error;
  }

  const startResponse = await requestWithFallback("post", PASSKEY_REGISTER_ENDPOINTS, {
    currentPassword,
    password: currentPassword,
    label,
  });

  logPasskey("register options response", summarizeObject(startResponse.data));

  if (hasAuthPayload(startResponse.data)) {
    return startResponse.data;
  }

  const requestPayload = extractRequestPayload(startResponse.data);
  logPasskey("register request payload", summarizeObject(requestPayload));
  let credential;
  try {
    credential = await Passkey.create(requestPayload);
  } catch (error) {
    logPasskey("register native error", summarizePasskeyError(error));
    throw error;
  }
  logPasskey("register credential result", summarizeObject(credential));

  const confirmResponse = await requestWithFallback("post", PASSKEY_REGISTER_CONFIRM_ENDPOINTS, {
    request_id: startResponse.data?.request_id || startResponse.data?.requestId || startResponse.data?.id,
    requestId: startResponse.data?.request_id || startResponse.data?.requestId || startResponse.data?.id,
    credential,
  });

  logPasskey("register verify response", summarizeObject(confirmResponse.data));

  return confirmResponse.data;
}

export async function disablePasskeys(currentPassword) {
  if (!currentPassword || !String(currentPassword).trim()) {
    const error = new Error("PASSWORD_REQUIRED");
    error.code = "PASSWORD_REQUIRED";
    throw error;
  }

  const response = await requestWithFallback("post", PASSKEY_DISABLE_ENDPOINTS, {
    currentPassword,
    password: currentPassword,
  });

  logPasskey("disable response", summarizeObject(response.data));

  return response.data;
}

export async function signInWithPasskey(email) {
  if (!isPasskeySupported()) {
    const error = new Error("PASSKEY_NOT_SUPPORTED");
    error.code = "PASSKEY_NOT_SUPPORTED";
    throw error;
  }

  const startResponse = await requestWithFallback("post", PASSKEY_START_ENDPOINTS, {
    email,
  });

  logPasskey("login options response", summarizeObject(startResponse.data));

  if (hasAuthPayload(startResponse.data)) {
    return startResponse.data;
  }

  const requestPayload = extractRequestPayload(startResponse.data);
  logPasskey("login request payload", summarizeObject(requestPayload));
  let credential;
  try {
    credential = await Passkey.get(requestPayload);
  } catch (error) {
    logPasskey("login native error", summarizePasskeyError(error));
    throw error;
  }
  logPasskey("login credential result", summarizeObject(credential));

  const confirmResponse = await requestWithFallback("post", PASSKEY_CONFIRM_ENDPOINTS, {
    request_id: startResponse.data?.request_id || startResponse.data?.requestId || startResponse.data?.id,
    requestId: startResponse.data?.request_id || startResponse.data?.requestId || startResponse.data?.id,
    credential,
  });

  logPasskey("login verify response", summarizeObject(confirmResponse.data));

  return confirmResponse.data;
}

export function getFriendlyPasskeyError(error, fallbackMessage = "Unable to complete passkey request.") {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  if (code.includes("NOT_SUPPORTED") || message.includes("not supported")) {
    return "Passkeys are not supported on this device.";
  }

  if (code.includes("USER_CANCEL") || code.includes("CANCELLED") || message.includes("cancel")) {
    return "Passkey request was cancelled.";
  }

  if (code.includes("TIMEOUT") || message.includes("timeout")) {
    return "Passkey request timed out. Please try again.";
  }

  if (code.includes("NO_CREDENTIAL") || message.includes("no credential") || message.includes("no passkey")) {
    return "No passkey is available for this account.";
  }

  if (code.includes("INVALID_CHALLENGE") || message.includes("challenge")) {
    return "The passkey challenge is no longer valid.";
  }

  if (code.includes("BAD_CONFIGURATION") || message.includes("configuration")) {
    return "Passkey sign in is not configured correctly.";
  }

  if (code.includes("REQUEST_FAILED") || code.includes("NATIVE_ERROR") || message.includes("network")) {
    return fallbackMessage;
  }

  return fallbackMessage;
}
