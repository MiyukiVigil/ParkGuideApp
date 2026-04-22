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

export async function registerAccountApplication({ fullName, email, phoneNumber, birthdate, cvFile }) {
  const endpoint = `${String(api.defaults.baseURL || "").replace(/\/+$/, "")}/accounts/applications/`;
  const formData = new FormData();

  formData.append("full_name", fullName);
  formData.append("email", email);
  formData.append("phone_number", phoneNumber);
  formData.append("birthdate", birthdate);
  formData.append("cv_file", {
    uri: cvFile.uri,
    name: cvFile.name,
    type: cvFile.mimeType || cvFile.type || "application/pdf",
  });

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.detail || "APPLICATION_SUBMIT_FAILED");
    error.response = {
      status: response.status,
      data: payload,
    };
    throw error;
  }

  return payload;
}
