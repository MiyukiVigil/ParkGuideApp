import CONFIG from "../constants/config";
import api from "../utils/api";

const TWO_FACTOR_STATUS_ENDPOINTS = ["/accounts/2fa/status/"];

const TWO_FACTOR_SETUP_ENDPOINTS = ["/accounts/2fa/setup/"];

const TWO_FACTOR_CONFIRM_ENDPOINTS = ["/accounts/2fa/confirm/"];

const TWO_FACTOR_DISABLE_ENDPOINTS = ["/accounts/2fa/disable/"];

const TWO_FACTOR_VERIFY_ENDPOINTS = ["/accounts/2fa/login/verify/"];

const normalizeBaseUrl = (baseUrl) => String(baseUrl || "").trim().replace(/\/+$/, "");

const buildUrl = (path) => {
  const baseUrl = normalizeBaseUrl(CONFIG.API_BASE_URL);
  if (!baseUrl) return path;
  return `${baseUrl}${path}`;
};

const isNotFound = (error) => error?.response?.status === 404;

const requestWithFallback = async (method, endpoints, data) => {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      return await api[method](buildUrl(endpoint), data);
    } catch (error) {
      if (isNotFound(error)) {
        lastError = error;
        continue;
      }

      lastError = error;
      break;
    }
  }

  throw lastError || new Error("TWO_FACTOR_REQUEST_FAILED");
};

const getErrorCode = (error) => String(error?.response?.data?.code || error?.code || error?.name || "").trim().toUpperCase();

const getErrorMessage = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail.trim();

  const message = error?.response?.data?.message || error?.message;
  if (typeof message === "string" && message.trim()) return message.trim();

  return "";
};

const normalizeState = (data) => ({
  available: true,
  enabled: Boolean(data?.enabled ?? data?.is_enabled ?? data?.has_setup_secret),
  has_setup_secret: Boolean(data?.has_setup_secret ?? data?.secret ?? data?.otpauth_uri),
  details: data?.details ?? data?.meta ?? data ?? null,
});

export async function getTwoFactorStatus() {
  try {
    const response = await requestWithFallback("get", TWO_FACTOR_STATUS_ENDPOINTS);
    return normalizeState(response.data);
  } catch (error) {
    return {
      available: true,
      enabled: false,
      has_setup_secret: false,
      details: null,
      error,
    };
  }
}

export async function setupTwoFactor(currentPassword) {
  if (!currentPassword || !String(currentPassword).trim()) {
    const error = new Error("PASSWORD_REQUIRED");
    error.code = "PASSWORD_REQUIRED";
    throw error;
  }

  const response = await requestWithFallback("post", TWO_FACTOR_SETUP_ENDPOINTS, {
    currentPassword,
    password: currentPassword,
  });

  return response.data;
}

export async function confirmTwoFactor(code) {
  if (!code || !String(code).trim()) {
    const error = new Error("CODE_REQUIRED");
    error.code = "CODE_REQUIRED";
    throw error;
  }

  const response = await requestWithFallback("post", TWO_FACTOR_CONFIRM_ENDPOINTS, {
    code: String(code).trim(),
  });

  return response.data;
}

export async function disableTwoFactor({ currentPassword, code }) {
  if (!currentPassword || !String(currentPassword).trim()) {
    const error = new Error("PASSWORD_REQUIRED");
    error.code = "PASSWORD_REQUIRED";
    throw error;
  }

  if (!code || !String(code).trim()) {
    const error = new Error("CODE_REQUIRED");
    error.code = "CODE_REQUIRED";
    throw error;
  }

  const response = await requestWithFallback("post", TWO_FACTOR_DISABLE_ENDPOINTS, {
    currentPassword,
    password: currentPassword,
    code: String(code).trim(),
  });

  return response.data;
}

export async function verifyTwoFactorLogin({ requestId, code }) {
  if (!requestId || !String(requestId).trim()) {
    const error = new Error("REQUEST_ID_REQUIRED");
    error.code = "REQUEST_ID_REQUIRED";
    throw error;
  }

  if (!code || !String(code).trim()) {
    const error = new Error("CODE_REQUIRED");
    error.code = "CODE_REQUIRED";
    throw error;
  }

  const response = await requestWithFallback("post", TWO_FACTOR_VERIFY_ENDPOINTS, {
    request_id: requestId,
    requestId,
    code: String(code).trim(),
  });

  return response.data;
}

export function getTwoFactorQrUrl(otpauthUri) {
  if (!otpauthUri) return "";
  if (/^https?:\/\//i.test(String(otpauthUri))) return String(otpauthUri);

  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    String(otpauthUri)
  )}`;
}

export function getFriendlyTwoFactorError(error, fallbackMessage = "Unable to complete authenticator request.") {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  if (code.includes("CODE_REQUIRED") || code.includes("INVALID_CODE") || message.includes("invalid code") || message.includes("expired")) {
    return "The authenticator code is invalid or expired.";
  }

  if (code.includes("PASSWORD_REQUIRED") || message.includes("password")) {
    return "Your password is required to continue.";
  }

  if (code.includes("REQUEST_ID_REQUIRED") || message.includes("request id")) {
    return "Your sign-in request expired. Please sign in again.";
  }

  if (message.includes("not enabled") || message.includes("disabled")) {
    return "Authenticator 2FA is not enabled on this account.";
  }

  if (message.includes("already enabled")) {
    return "Authenticator 2FA is already enabled.";
  }

  if (message.includes("already disabled")) {
    return "Authenticator 2FA is already disabled.";
  }

  if (message.includes("secret") || message.includes("setup")) {
    return "Unable to finish authenticator setup.";
  }

  if (message.includes("network") || code.includes("REQUEST_FAILED") || code.includes("NETWORK")) {
    return fallbackMessage;
  }

  return fallbackMessage;
}
