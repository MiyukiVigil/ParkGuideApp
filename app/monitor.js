// Theming got small problem but I lazy to fix yet - Ivan

import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Text, IconButton, Banner, useTheme } from 'react-native-paper';

export default function IoTMonitor() {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [isAlertVisible, setAlertVisible] = useState(false);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.onBackground, marginBottom: 10 }}>
          We need permission to show the camera
        </Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text style={{ color: theme.colors.primary }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Real-time Alert Banner */}
      <Banner
        visible={isAlertVisible}
        actions={[{ label: 'Clear Alert', onPress: () => setAlertVisible(false) }]}
        icon="alert-decagram"
        style={{ backgroundColor: theme.colors.errorContainer }}
        theme={{ colors: { text: theme.colors.onErrorContainer } }}
      >
        AI DETECTED: Potential Regulation Violation (Handling Wildlife). Alert sent to Ranger HQ.
      </Banner>

      <CameraView style={styles.camera} facing="back">
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.liveTag, { color: theme.colors.error }]}>● LIVE - ENCRYPTED</Text>
            <Text style={[styles.telemetry, { color: theme.colors.onSurface }]}>
              GPS: 1.553° N, 110.359° E
            </Text>
          </View>

          {/* Mock AI Detection Box */}
          <TouchableOpacity 
            style={[styles.detectionBox, { borderColor: theme.colors.primary }]} 
            onPress={() => setAlertVisible(true)}
          >
            <Text style={[styles.detectionText, { color: theme.colors.primary }]}>
              SCANNING FOR ANOMALIES...
            </Text>
          </TouchableOpacity>

          {/* Record Button */}
          <IconButton
            icon="record-circle"
            iconColor={theme.colors.error}
            size={60}
            style={styles.recordBtn}
          />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  liveTag: { fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  telemetry: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  detectionBox: { 
    borderWidth: 2, 
    height: 150, 
    width: '80%', 
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderRadius: 12
  },
  detectionText: { fontWeight: 'bold', fontSize: 12 },
  recordBtn: { alignSelf: 'center', marginBottom: 30 }
});