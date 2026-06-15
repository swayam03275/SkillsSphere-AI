import { apiRequest } from "./apiClient";
import { resolveProtectedFilePath } from "../utils/protectedAssetUrl";

export const getSignedFileUrl = async (url, token) => {
  if (!url || typeof url !== "string") return url;

  const filePath = resolveProtectedFilePath(url);
  if (!filePath) return url;
  if (!token) return url;

  try {
    const response = await apiRequest("/api/files/sign", {
      method: "POST",
      body: { path: filePath },
      token,
    });

    return response.url || url;
  } catch {
    return url;
  }
};
