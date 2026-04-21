export async function ensureMockPassword() {
  return true;
}

import api from "../utils/api";

export async function changePassword({ currentPassword, newPassword, confirmPassword }) {
  if (!currentPassword || !newPassword || !confirmPassword) {
    const error = new Error("FILL_ALL_PASSWORD_FIELDS");
    error.code = "FILL_ALL_PASSWORD_FIELDS";
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("PASSWORD_MUST_BE_8");
    error.code = "PASSWORD_MUST_BE_8";
    throw error;
  }

  if (newPassword !== confirmPassword) {
    const error = new Error("PASSWORDS_DO_NOT_MATCH");
    error.code = "PASSWORDS_DO_NOT_MATCH";
    throw error;
  }

  try {
    const response = await api.post("/accounts/change-password/", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response.data;
  } catch (apiError) {
    const mappedCode = apiError?.response?.data?.code;
    const backendDetail = apiError?.response?.data?.detail;
    const error = new Error(backendDetail || mappedCode || "CHANGE_PASSWORD_FAILED");
    error.code = mappedCode || "CHANGE_PASSWORD_FAILED";
    error.detail = backendDetail || "";
    throw error;
  }
}

export async function requestForgotPasswordCode(email) {
  return api.post("/accounts/forgot-password/", { email });
}

export async function confirmForgotPassword({ email, code, newPassword, confirmPassword }) {
  return api.post("/accounts/forgot-password/confirm/", {
    email,
    code,
    newPassword,
    confirmPassword,
  });
}
