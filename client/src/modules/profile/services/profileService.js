import { apiRequest, normalizeApiError } from "../../../services/apiClient";

const handleProfileError = (error) => {
  const normalized = normalizeApiError(error);
  if (normalized.status === 401 || normalized.status === 403)
    return { ...normalized, message: "You are not authorized. Please log in again." };
  if (normalized.status === 400 || normalized.status === 422)
    return { ...normalized, message: normalized.message || "Please check your input and try again." };
  if (normalized.status === 0 || normalized.status >= 500)
    return { ...normalized, message: "Unable to connect to the server. Please try again later." };
  return normalized;
};

export const updateProfile = async (payload, token) => {
  try {
    const response = await apiRequest("/api/users/me", { method: "PUT", body: payload, token });
    return { success: true, user: response.user };
  } catch (error) { throw handleProfileError(error); }
};

export const uploadAvatar = async (file, token) => {
  try {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await apiRequest("/api/users/me/avatar", { method: "PUT", body: formData, token });
    return { success: true, user: response.user };
  } catch (error) { throw handleProfileError(error); }
};

export const removeAvatar = async (token) => {
  try {
    const response = await apiRequest("/api/users/me/avatar", { method: "DELETE", token });
    return { success: true, user: response.user };
  } catch (error) { throw handleProfileError(error); }
};

export const getUserPreferences = async (token) => {
  try {
    const response = await apiRequest("/api/users/preferences", { token });
    return { success: true, preferences: response.preferences };
  } catch (error) { throw handleProfileError(error); }
};

export const updateUserPreferences = async (preferences, token) => {
  try {
    const response = await apiRequest("/api/users/preferences", {
      method: "PUT",
      body: preferences,
      token,
    });
    return { success: true, preferences: response.preferences };
  } catch (error) { throw handleProfileError(error); }
};

export const deleteProfile = async (token) => {
  try {
    const response = await apiRequest("/api/users/me", { method: "DELETE", token });
    return { success: true, message: response.message };
  } catch (error) { throw handleProfileError(error); }
};
