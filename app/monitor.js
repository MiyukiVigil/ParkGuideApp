import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Text, IconButton, Banner, MD3Colors } from 'react-native-paper';

export default function IoTMontior() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isAlertVisible, setAlertVisible] = useState(false);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>We need permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission}><Text>Grant Permission</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Simulation of Real-time Alert System */}
      <Banner
        visible={isAlertVisible}
        actions={[{ label: 'Clear Alert', onPress: () => setAlertVisible(false) }]}
        icon="alert-decagram"
        style={{ backgroundColor: MD3Colors.error90 }}
      >
        AI DETECTED: Potential Regulation Violation (Handling Wildlife). 
        Alert sent to Ranger HQ.
      </Banner>

      <CameraView style={styles.camera} facing="back">
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.liveTag}>● LIVE - ENCRYPTED</Text>
            <Text style={styles.telemetry}>GPS: 1.553° N, 110.359° E</Text>
          </View>

          {/* Mock AI Detection Box */}
          <TouchableOpacity 
            style={styles.detectionBox} 
            onPress={() => setAlertVisible(true)}
          >
            <Text style={styles.detectionText}>SCANNING FOR ANOMALIES...</Text>
          </TouchableOpacity>

          <IconButton
            icon="record-circle"
            iconColor="red"
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
  liveTag: { color: '#ff0000', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: 5 },
  telemetry: { color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', padding: 5 },
  detectionBox: { 
    borderWidth: 2, 
    borderColor: '#00FF00', 
    height: 150, 
    width: '80%', 
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed'
  },
  detectionText: { color: '#00FF00', fontWeight: 'bold', fontSize: 12 },
  recordBtn: { alignSelf: 'center', marginBottom: 30 }
});