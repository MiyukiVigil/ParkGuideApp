import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { useTheme, Surface, Text, Button, ActivityIndicator, RadioButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ThemedBackground from '../../components/ThemedBackground';
import { useThemeContext } from '../../contexts/ThemeContext';
import courseService from '../../services/courseService';

export default function PracticeView() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const { isSimpleMode, highContrast } = useThemeContext();
  const { id } = useLocalSearchParams();

  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const containerWidth = width > 1200 ? 800 : '100%';
  const containerMargin = width > 1200 ? 'auto' : 0;

  const cardRadius = isSimpleMode || highContrast ? 16 : 24;

  const getLocalizedText = (textData) => {
    if (!textData) return '';
    if (typeof textData === 'string') return textData;
    if (typeof textData === 'object') {
      return textData[i18n.language] || textData.en || textData.ms || textData.zh || '';
    }
    return String(textData);
  };

  useEffect(() => {
    loadPractice();
  }, [id]);

  const loadPractice = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setAnswers({});
      const data = await courseService.getPracticeExercise(id);
      setPractice(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading practice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    if (!practice || !practice.questions) {
      return;
    }

    const allAnswered = practice.questions.every((q, idx) => answers[idx] !== undefined);
    if (!allAnswered) {
      Alert.alert(t('error'), t('answerAllQuestions'));
      return;
    }

    try {
      setSubmitting(true);
      const submissionAnswers = practice.questions.map((_, idx) => answers[idx]);
      const resultData = await courseService.submitPracticeExercise(id, submissionAnswers);
      setResult(resultData);
    } catch (err) {
      Alert.alert(t('errorSubmitting'), err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('practiceExercise')} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!practice) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('practiceExercise')} showBack />
        <View style={styles.centerContainer}>
          <Text>{t('errorLoadingCourse')}</Text>
          <Button onPress={loadPractice} style={{ marginTop: 16 }}>
            {t('tryAgain')}
          </Button>
        </View>
      </View>
    );
  }

  const questions = practice.questions || [];
  const isPassed = result && result.score >= (practice.passing_score || 70);

  // Show results
  if (result) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('practiceResult')} showBack={false} />

        <ScrollView
          style={[styles.container, { width: containerWidth, marginLeft: containerMargin, marginRight: containerMargin }]}
          contentContainerStyle={styles.contentContainer}
        >
          <Surface
            style={[
              styles.resultCard,
              {
                backgroundColor: isPassed ? theme.colors.secondaryContainer : theme.colors.errorContainer,
                borderColor: isPassed ? theme.colors.secondary : theme.colors.error,
                borderRadius: cardRadius,
              },
            ]}
            elevation={highContrast ? 0 : 2}
          >
            <Text
              variant={isSimpleMode || highContrast ? 'headlineSmall' : 'headlineMedium'}
              style={{
                color: isPassed ? theme.colors.onSecondaryContainer : theme.colors.onErrorContainer,
                fontWeight: '800',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {isPassed ? t('passed') : t('failed')}
            </Text>

            <Text
              variant="displaySmall"
              style={{
                color: isPassed ? theme.colors.secondary : theme.colors.error,
                fontWeight: '800',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              {Math.round(result.score)}%
            </Text>

            <Text
              variant="bodyMedium"
              style={{
                color: isPassed ? theme.colors.onSecondaryContainer : theme.colors.onErrorContainer,
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              {isPassed
                ? t('greatJob')
                : `${t('notQuite')} ${t('passingScore', { score: practice.passing_score })} ${t('required')}`}
            </Text>
          </Surface>

          {/* Review Answers */}
          <View style={{ marginTop: 20 }}>
            <Text
              variant="titleMedium"
              style={{
                color: theme.colors.onSurface,
                fontWeight: '800',
                marginBottom: 12,
              }}
            >
              {t('review')}
            </Text>

            {questions.map((question, idx) => {
              const userAnswer = answers[idx];
              const isCorrect = userAnswer === question.correctIndex;

              return (
                <Surface
                  key={idx}
                  style={[
                    styles.reviewCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: isCorrect ? theme.colors.secondary : theme.colors.error,
                      borderRadius: cardRadius,
                    },
                  ]}
                  elevation={highContrast ? 0 : 1}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      variant="titleSmall"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: '700',
                        flex: 1,
                      }}
                      numberOfLines={2}
                    >
                      {t('question')} {idx + 1}
                    </Text>
                    <Text
                      variant="labelSmall"
                      style={{
                        color: isCorrect ? theme.colors.secondary : theme.colors.error,
                        fontWeight: '700',
                      }}
                    >
                      {isCorrect ? '✓' : '✗'}
                    </Text>
                  </View>

                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurface,
                      marginBottom: 12,
                    }}
                  >
                    {getLocalizedText(question.question_text)}
                  </Text>

                  <View style={{ marginBottom: 12 }}>
                    <Text
                      variant="labelSmall"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        fontWeight: '600',
                        marginBottom: 4,
                      }}
                    >
                      {t('yourAnswer')}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{
                        color: isCorrect ? theme.colors.secondary : theme.colors.error,
                        fontWeight: '600',
                      }}
                    >
                      {getLocalizedText(question.options[userAnswer]?.text)}
                    </Text>
                  </View>

                  {!isCorrect && (
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.outlineVariant,
                        paddingTop: 12,
                      }}
                    >
                      <Text
                        variant="labelSmall"
                        style={{
                          color: theme.colors.secondary,
                          fontWeight: '600',
                          marginBottom: 4,
                        }}
                      >
                        {t('correctAnswer')}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{
                          color: theme.colors.secondary,
                          fontWeight: '600',
                        }}
                      >
                        {getLocalizedText(question.options[question.correctIndex]?.text)}
                      </Text>
                    </View>
                  )}

                  {question.explanation && (
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.outlineVariant,
                        paddingTop: 12,
                        marginTop: 12,
                      }}
                    >
                      <Text
                        variant="labelSmall"
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          fontWeight: '600',
                          marginBottom: 4,
                        }}
                      >
                        {t('explanation')}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{
                          color: theme.colors.onSurfaceVariant,
                        }}
                      >
                        {getLocalizedText(question.explanation)}
                      </Text>
                    </View>
                  )}
                </Surface>
              );
            })}
          </View>

          {/* Retry Button */}
          <Button
            mode="contained"
            onPress={loadPractice}
            style={{ marginTop: 20 }}
          >
            {t('retryPractice')}
          </Button>
        </ScrollView>
      </View>
    );
  }

  // Show practice questions
  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ThemedBackground />
      <AppHeader title={t('practiceExercise')} showBack />

      <ScrollView
        style={[styles.container, { width: containerWidth, marginLeft: containerMargin, marginRight: containerMargin }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <Surface
          style={[
            styles.headerCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              borderRadius: cardRadius,
            },
          ]}
          elevation={highContrast ? 0 : isSimpleMode ? 1 : 2}
        >
          <Text
            variant={isSimpleMode || highContrast ? 'headlineSmall' : 'headlineMedium'}
            style={{
              color: theme.colors.onSurface,
              fontWeight: '800',
              marginBottom: 16,
            }}
          >
            {t('practiceExercise')}
          </Text>

          <Text
            variant="bodyMedium"
            style={{
              color: theme.colors.onSurfaceVariant,
            }}
          >
            {t('answerTheFollowingQuestions')}
          </Text>
        </Surface>

        {/* Questions */}
        {questions.map((question, idx) => (
          <QuestionCard
            key={idx}
            question={question}
            index={idx + 1}
            total={questions.length}
            selectedAnswer={answers[idx]}
            onSelectAnswer={(optionIdx) => {
              setAnswers({ ...answers, [idx]: optionIdx });
            }}
            theme={theme}
            isSimpleMode={isSimpleMode}
            highContrast={highContrast}
            cardRadius={cardRadius}
            t={t}
            getLocalizedText={getLocalizedText}
          />
        ))}

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={{ marginTop: 20, marginBottom: 20 }}
        >
          {t('submitPractice')}
        </Button>
      </ScrollView>
    </View>
  );
}

function QuestionCard({
  question,
  index,
  total,
  selectedAnswer,
  onSelectAnswer,
  theme,
  isSimpleMode,
  highContrast,
  cardRadius,
  t,
  getLocalizedText,
}) {
  return (
    <Surface
      style={[
        styles.questionCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderRadius: cardRadius,
        },
      ]}
      elevation={highContrast ? 0 : 1}
    >
      <Text
        variant="titleSmall"
        style={{
          color: theme.colors.onSurface,
          fontWeight: '700',
          marginBottom: 8,
        }}
      >
        {t('question')} {index} {t('ofTotal', { total })}
      </Text>

      <Text
        variant="bodyMedium"
        style={{
          color: theme.colors.onSurface,
          marginBottom: 16,
          lineHeight: 22,
        }}
      >
        {getLocalizedText(question.question_text)}
      </Text>

      <View>
        {question.options && question.options.length > 0 ? (
          question.options.map((option, optIdx) => {
            // Options are objects with a 'text' property that's multilingual
            const optionText = option?.text ? getLocalizedText(option.text) : (typeof option === 'string' ? option : `Option ${optIdx + 1}`);
            return (
              <View key={optIdx} style={{ marginBottom: 12 }}>
                <RadioButton.Item
                  label={optionText}
                  value={optIdx}
                  status={selectedAnswer === optIdx ? 'checked' : 'unchecked'}
                  onPress={() => onSelectAnswer(optIdx)}
                  labelVariant="bodyMedium"
                  style={{
                    paddingVertical: 0,
                    paddingHorizontal: 0,
                  }}
                />
              </View>
            );
          })
        ) : (
          <Text style={{ color: '#999', fontStyle: 'italic' }}>{t('noOptionsAvailable')}</Text>
        )}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  headerCard: {
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  questionCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultCard: {
    padding: 24,
    borderWidth: 2,
    borderRadius: 16,
    marginBottom: 24,
  },
  reviewCard: {
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 12,
  },
});
