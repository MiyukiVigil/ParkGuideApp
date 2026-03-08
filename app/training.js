import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, RadioButton, Surface, IconButton, Portal, Modal, useTheme, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TrainingModule() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [checked, setChecked] = useState('');
  const [isPassed, setIsPassed] = useState(false);
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

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
    <View style={[styles.master, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 1. Progress Header */}
        <Surface style={[styles.header, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>MODULE 1.2</Text>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>Orangutan Safety</Text>
        </Surface>

        {/* 2. Multimedia Content */}
        <Card style={[styles.videoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={[styles.videoPlaceholder, { backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.primaryContainer }]}>
            <IconButton icon="play-circle" size={64} iconColor={theme.colors.primary} />
            <Text style={{ color: theme.colors.onPrimary }}>Watch Training Video</Text>
          </View>
        </Card>

        <Card style={[styles.contentCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.subHeader, { color: theme.colors.onSurface }]}>Proximity Protocols</Text>
            <Text variant="bodyMedium" style={[styles.bodyText, { color: theme.colors.onSurfaceVariant }]}>
              Bako National Park requires all guides to maintain a strict 10-meter perimeter. 
              This prevents the transmission of human diseases to primates and ensures the 
              animals do not become habituated to human presence.
            </Text>
          </Card.Content>
        </Card>

        <Button 
          mode="contained" 
          icon="pencil-box-outline"
          style={[styles.mainActionBtn, { backgroundColor: isPassed ? theme.colors.secondary : theme.colors.primary }]}
          onPress={() => setShowQuiz(true)}
          textColor={theme.colors.onPrimary}
        >
          {isPassed ? "Retake Assessment" : "Take Module Quiz"}
        </Button>
      </ScrollView>

      {/* 3. Quiz Modal */}
      <Portal>
        <Modal 
          visible={showQuiz} 
          onDismiss={() => setShowQuiz(false)} 
          contentContainerStyle={[styles.modalStyle, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Knowledge Check</Text>
          <ProgressBar progress={0.5} color={theme.colors.primary} style={{ marginVertical: 10 }} />
          
          <Text variant="bodyLarge" style={{ marginBottom: 15, color: theme.colors.onSurfaceVariant }}>
            What is the minimum safe distance required for a guided group?
          </Text>

          <RadioButton.Group onValueChange={val => setChecked(val)} value={checked}>
            {['10 Meters', '2 Meters', '5 Meters'].map((label, index) => (
              <View key={label} style={styles.radioRow}>
                <RadioButton value={index === 0 ? 'first' : index === 1 ? 'second' : 'third'} />
                <Text style={{ color: theme.colors.onSurface }}>{label}</Text>
              </View>
            ))}
          </RadioButton.Group>

          <View style={styles.modalActions}>
            <Button onPress={() => setShowQuiz(false)} textColor={theme.colors.primary}>Cancel</Button>
            <Button mode="contained" onPress={handleQuizSubmit} disabled={!checked} textColor={theme.colors.onPrimary} buttonColor={theme.colors.primary}>
              Submit
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  master: { flex: 1},
  container: { flex: 1, padding: 20, marginTop:20},

  header: { 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 20,
    elevation: 2,
  },
  title: { fontWeight: 'bold', marginTop: 4 },

  videoCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 20 },
  videoPlaceholder: { 
    height: 200, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 24,
  },

  contentCard: { borderRadius: 20, marginBottom: 30 },
  subHeader: { fontWeight: 'bold', marginBottom: 8 },
  bodyText: { lineHeight: 24 },

  mainActionBtn: { paddingVertical: 8, borderRadius: 15 },

  modalStyle: { padding: 30, margin: 20, borderRadius: 24 },
  modalTitle: { fontWeight: 'bold', marginBottom: 10 },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 25 },
});