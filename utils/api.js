import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const clearAuthTokens = async () => {
  await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
};

const requestNewAccessToken = async () => {
  const refresh = await AsyncStorage.getItem("refreshToken");
  if (!refresh) return null;

  for (const endpoint of REFRESH_ENDPOINTS) {
    try {
      const response = await refreshClient.post(endpoint, { refresh });
      if (response.data?.access) {
        if (response.data?.refresh) {
          await AsyncStorage.setItem("refreshToken", response.data.refresh);
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
  const refresh = await AsyncStorage.getItem("refreshToken");
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

  await AsyncStorage.setItem("accessToken", access);
  return true;
};

// Interceptor for attaching access token
api.interceptors.request.use(async (config) => {
  let token = await AsyncStorage.getItem("accessToken");

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

        const access = await AsyncStorage.getItem("accessToken");
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