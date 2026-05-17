import React, { useEffect, useState } from "react";
import { Image, Platform } from "react-native";
import { Avatar, useTheme } from "react-native-paper";

import { getAvatarUrl, getBackendAssetUrl, getBackendOrigin } from "../constants/config";
import { getAccessToken } from "../utils/tokenStorage";

const sanitizeImageUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (parsed.hostname.includes("googleapis.com")) {
      parsed.searchParams.delete("v");
      return parsed.toString();
    }
  } catch {
    return raw;
  }

  return raw;
};

export default function ProfileAvatar({ size = 54, uri, seed, icon = "account", style }) {
  const theme = useTheme();
  const [webBlobUri, setWebBlobUri] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedUri = uri ? sanitizeImageUrl(getBackendAssetUrl(uri)) : "";
  const fallbackUri = getAvatarUrl(seed || "park-guide");
  const shouldFetchWithAuth =
    Platform.OS === "web" &&
    resolvedUri &&
    getBackendOrigin() &&
    resolvedUri.startsWith(getBackendOrigin());

  useEffect(() => {
    setImageFailed(false);

    if (!shouldFetchWithAuth) {
      setWebBlobUri("");
      return undefined;
    }

    let active = true;
    let objectUrl = "";

    const loadImage = async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch(resolvedUri, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) throw new Error(`Image request failed: ${response.status}`);

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (active) setWebBlobUri(objectUrl);
      } catch {
        if (active) setWebBlobUri("");
        if (Platform.OS === "web") {
          console.warn("[ProfileAvatar] Authenticated image fetch failed", resolvedUri);
        }
      }
    };

    loadImage();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolvedUri, shouldFetchWithAuth]);

  if (resolvedUri || fallbackUri) {
    const imageUri = imageFailed
      ? fallbackUri
      : shouldFetchWithAuth
        ? webBlobUri || fallbackUri
        : resolvedUri || fallbackUri;

    if (Platform.OS === "web") {
      return (
        <Image
          source={{ uri: imageUri }}
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.colors.primaryContainer,
            },
            style,
          ]}
          onError={() => {
            console.warn("[ProfileAvatar] Image failed to load", imageUri);
            setImageFailed(true);
          }}
        />
      );
    }

    return (
      <Avatar.Image
        size={size}
        source={{ uri: imageUri }}
        style={style}
      />
    );
  }

  return (
    <Avatar.Icon
      size={size}
      icon={icon}
      style={[{ backgroundColor: theme.colors.primaryContainer }, style]}
      color={theme.colors.primary}
    />
  );
}
