import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

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
        const refresh = await AsyncStorage.getItem("refreshToken");
        if (!refresh) throw new Error("No refresh token found");

        const response = await axios.post("http://localhost:8000/api/accounts/token/refresh/", {
          refresh,
        });

        const { access } = response.data;
        await AsyncStorage.setItem("accessToken", access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest); // retry the original request
      } catch (err) {
        console.log("Refresh token failed", err);
        await AsyncStorage.removeItem("accessToken");
        await AsyncStorage.removeItem("refreshToken");
        // optional: redirect to login
        throw err;
      }
    }

    throw error;
  }
);

export default api;