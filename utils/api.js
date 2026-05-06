const API_BASE_URL = "http://127.0.0.1:8000";

export async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        },
        ...options,
    });

    const data = await response.json().catch(() => null);

    console.log("API status:", response.status);
    console.log("API response:", data);

    if (!response.ok) {
        throw new Error(
        data?.detail ||
        data?.message ||
        JSON.stringify(data) ||
        "Request failed"
        );
    }

    return data;
}