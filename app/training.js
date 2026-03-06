import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, Alert, Image } from 'react-native';
import { Text, Card, Button, RadioButton, Surface, IconButton, Portal, Modal, useTheme, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function TrainingModule() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [checked, setChecked] = useState('');
  const [isPassed, setIsPassed] = useState(false);
  const theme = useTheme();
  const router = useRouter();

  const handleQuizSubmit = () => {
    if (checked === 'first') {
      setIsPassed(true);
      setShowQuiz(false);
      Alert.alert("Certification Updated", "You've successfully completed this module.");
    } else {
      Alert.alert("Incorrect", "Please review the safety distance protocols again.");
    }
  };

  return (
    <View style={styles.master}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 1. Progress Header */}
        <Surface style={styles.header} elevation={1}>
          <Text variant="labelLarge" style={{ color: '#2E7D32' }}>MODULE 1.2</Text>
          <Text variant="headlineSmall" style={styles.title}>Orangutan Safety</Text>
        </Surface>

        {/* 2. Multimedia Content (The "UI" phase) */}
        <Card style={styles.videoCard}>
          <View style={styles.videoPlaceholder}>
             <IconButton icon="play-circle" size={64} iconColor="#fff" />
             <Text style={{ color: '#fff' }}>Watch Training Video</Text>
          </View>
        </Card>

        <Card style={styles.contentCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.subHeader}>Proximity Protocols</Text>
            <Text variant="bodyMedium" style={styles.bodyText}>
              Bako National Park requires all guides to maintain a strict 10-meter perimeter. 
              This prevents the transmission of human diseases to primates and ensures the 
              animals do not become habituated to human presence.
            </Text>
          </Card.Content>
        </Card>

        <Button 
          mode="contained" 
          icon="pencil-box-outline"
          style={styles.mainActionBtn}
          onPress={() => setShowQuiz(true)}
          buttonColor={isPassed ? '#4CAF50' : '#2E7D32'}
        >
          {isPassed ? "Retake Assessment" : "Take Module Quiz"}
        </Button>
      </ScrollView>

      {/* 3. The Quiz Modal (The "Click into it" phase) */}
      <Portal>
        <Modal 
          visible={showQuiz} 
          onDismiss={() => setShowQuiz(false)} 
          contentContainerStyle={styles.modalStyle}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Knowledge Check</Text>
          <ProgressBar progress={0.5} color="#2E7D32" style={{ marginVertical: 10 }} />
          
          <Text variant="bodyLarge" style={{ marginBottom: 15 }}>
            What is the minimum safe distance required for a guided group?
          </Text>

          <RadioButton.Group onValueChange={val => setChecked(val)} value={checked}>
            {['10 Meters', '2 Meters', '5 Meters'].map((label, index) => (
              <View key={label} style={styles.radioRow}>
                <RadioButton value={index === 0 ? 'first' : index === 1 ? 'second' : 'third'} />
                <Text>{label}</Text>
              </View>
            ))}
          </RadioButton.Group>

          <View style={styles.modalActions}>
            <Button onPress={() => setShowQuiz(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleQuizSubmit} disabled={!checked}>
              Submit
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  master: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, padding: 20 },
  header: { padding: 20, borderRadius: 20, marginBottom: 20, backgroundColor: '#fff' },
  title: { fontWeight: 'bold', marginTop: 4 },
  videoCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 20 },
  videoPlaceholder: { height: 200, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  contentCard: { borderRadius: 20, backgroundColor: '#fff', marginBottom: 30 },
  subHeader: { fontWeight: 'bold', marginBottom: 8 },
  bodyText: { lineHeight: 24, color: '#444' },
  mainActionBtn: { paddingVertical: 8, borderRadius: 15 },
  modalStyle: { backgroundColor: 'white', padding: 30, margin: 20, borderRadius: 24 },
  modalTitle: { fontWeight: 'bold', marginBottom: 10 },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 25 }
});