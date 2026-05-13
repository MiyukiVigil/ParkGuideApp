import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { CameraView } from "expo-camera";

import { useMonitoring } from "../contexts/MonitoringContext";

export default function MonitorRecorderHost() {
  const {
    handleRecorderMountError,
    handleRecorderReady,
    recorderMountKey,
    recorderRef,
    recorderVisible,
  } = useMonitoring();

  if (!recorderVisible || Platform.OS === "web") {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.host}>
      <CameraView
        key={recorderMountKey}
        ref={recorderRef}
        style={styles.camera}
        facing="back"
        mode="video"
        mute
        videoQuality="480p"
        onCameraReady={handleRecorderReady}
        onMountError={(event) => handleRecorderMountError(event?.nativeEvent || event)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 2,
    height: 2,
    opacity: 0.01,
    overflow: "hidden",
  },
  camera: {
    width: 2,
    height: 2,
  },
});
