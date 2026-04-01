import axios from "axios";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "./tokenStorage";

const API_BASE_URL = "http://localhost:8000/api";
const REFRESH_ENDPOINTS = [
  "/accounts/token/refresh/",
  "/token/refresh/",
];

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise = null;

const requestNewAccessToken = async () => {
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  for (const endpoint of REFRESH_ENDPOINTS) {
    try {
      const response = await refreshClient.post(endpoint, { refresh });
      if (response.data?.access) {
        if (response.data?.refresh) {
          await setRefreshToken(response.data.refresh);
        }
        return response.data.access;
      }
    } catch (err) {
      if (err.response?.status === 404) {
        continue;
      }
      throw err;
    }
  }

  return null;
};

export const ensureFreshSession = async () => {
  const refresh = await getRefreshToken();
  if (!refresh) return false;

  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  const access = await refreshPromise;

  if (!access) {
    await clearAuthTokens();
    return false;
  }

  await setAccessToken(access);
  return true;
};

// Interceptor for attaching access token
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Interceptor for handling 401 errors (expired token)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const hasFreshSession = await ensureFreshSession();
        if (!hasFreshSession) {
          error.isSessionExpired = true;
          throw error;
        }

        const access = await getAccessToken();
        if (!access) {
          error.isSessionExpired = true;
          throw error;
        }

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest); // retry the original request
      } catch (err) {
        if (err !== error) {
          console.log("Refresh token failed", err.response?.data || err.message || err);
        }
        await clearAuthTokens();
        error.isSessionExpired = true;
        throw error;
      }
    }

    throw error;
  }
);

export default api;