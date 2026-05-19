import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

import CONFIG from "../constants/config";
import api from "../utils/api";

let configured = false;

const configureGoogleSignin = () => {
  if (configured) return;

  GoogleSignin.configure({
    webClientId: CONFIG.GOOGLE_WEB_CLIENT_ID,
    iosClientId: CONFIG.GOOGLE_IOS_CLIENT_ID || undefined,
    offlineAccess: false,
    profileImageSize: 120,
  });
  configured = true;
};

export const isGoogleSignInConfigured = () => Boolean(CONFIG.GOOGLE_WEB_CLIENT_ID);

export async function signInWithGoogle() {
  if (!isGoogleSignInConfigured()) {
    const error = new Error("GOOGLE_SIGN_IN_NOT_CONFIGURED");
    error.code = "GOOGLE_SIGN_IN_NOT_CONFIGURED";
    throw error;
  }

  configureGoogleSignin();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const result = await GoogleSignin.signIn();
  const idToken = result?.data?.idToken || result?.idToken;
  if (!idToken) {
    const error = new Error("GOOGLE_ID_TOKEN_MISSING");
    error.code = "GOOGLE_ID_TOKEN_MISSING";
    throw error;
  }

  const response = await api.post("/accounts/google/login/", {
    id_token: idToken,
  });

  return response.data;
}

export function getFriendlyGoogleSignInError(error, fallbackMessage = "Unable to sign in with Google.") {
  const code = String(error?.code || error?.name || "").toUpperCase();
  const detail = error?.response?.data?.detail;

  if (detail) return detail;
  if (code.includes(statusCodes.SIGN_IN_CANCELLED)) return "Google sign-in was cancelled.";
  if (code.includes(statusCodes.IN_PROGRESS)) return "Google sign-in is already in progress.";
  if (code.includes(statusCodes.PLAY_SERVICES_NOT_AVAILABLE)) return "Google Play Services is not available or needs an update.";
  if (code.includes("NOT_CONFIGURED")) return "Google sign-in is not configured yet.";

  return fallbackMessage;
}
