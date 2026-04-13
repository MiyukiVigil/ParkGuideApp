import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { useTheme, Surface, Text, Button, ActivityIndicator, RadioButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ThemedBackground from '../../components/ThemedBackground';
import { useThemeContext } from '../../contexts/ThemeContext';
import courseService from '../../services/courseService';

const getLocalizedText = (textData, language = 'en') => {
  if (!textData) return '';
  if (typeof textData === 'string') return textData;
  return textData[language] || textData.en || '';
};

export default function QuizView() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const { isSimpleMode, highContrast } = useThemeContext();
  const { id } = useLocalSearchParams();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [error, setError] = useState(null);

  const containerWidth = width > 1200 ? 800 : '100%';
  const containerMargin = width > 1200 ? 'auto' : 0;

  const cardRadius = isSimpleMode || highContrast ? 16 : 24;

  useEffect(() => {
    loadQuiz();
  }, [id]);

  // Reload quiz when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadQuiz();
    }, [id])
  );

  useEffect(() => {
    let interval;
    if (quizStarted && timeRemaining !== null && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizStarted, timeRemaining]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setAnswers({});
      setQuizStarted(false);
      const data = await courseService.getQuiz(id);
      setQuiz(data);
      setTimeRemaining((data.time_limit || 30) * 60);
    } catch (err) {
      setError(err.message);
      console.error('Error loading quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    if (!quiz || !quiz.questions) {
      return;
    }

    const allAnswered = quiz.questions.every((q, idx) => answers[idx] !== undefined);
    if (!allAnswered) {
      Alert.alert(t('error'), t('answerAllQuestions') || 'Please answer all questions');
      return;
    }

    try {
      setSubmitting(true);
      const submissionAnswers = quiz.questions.map((_, idx) => answers[idx]);
      const resultData = await courseService.submitQuiz(id, submissionAnswers);
      setResult(resultData);
    } catch (err) {
      Alert.alert(t('errorSubmitting'), err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('quiz')} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!quiz) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('quiz')} showBack />
        <View style={styles.centerContainer}>
          <Text>{t('errorLoadingCourse')}</Text>
          <Button onPress={loadQuiz} style={{ marginTop: 16 }}>
            {t('tryAgain')}
          </Button>
        </View>
      </View>
    );
  }

  const questions = quiz.questions || [];
  const isPassed = result && result.score >= (quiz.passing_score || 70);

  // Show results
  if (result) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('quizResult')} showBack={false} />

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
              {isPassed ? t('quizPassed', { score: Math.round(result.score) }) : t('quizFailed', { score: Math.round(result.score), passing: quiz.passing_score || 70 })}
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

            {isPassed && (
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.onSecondaryContainer,
                  textAlign: 'center',
                  marginBottom: 24,
                }}
              >
                {t('finishCourse')}
              </Text>
            )}
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
              
              // Find the correct answer index from options with is_correct flag
              let correctAnswerIndex = null;
              if (Array.isArray(question.options)) {
                for (let i = 0; i < question.options.length; i++) {
                  const option = question.options[i];
                  if (typeof option === 'object' && option.is_correct) {
                    correctAnswerIndex = i;
                    break;
                  }
                }
              }
              
              // Fallback to correctIndex if options don't have is_correct
              if (correctAnswerIndex === null) {
                correctAnswerIndex = question.correctIndex;
              }
              
              const isCorrect = userAnswer === correctAnswerIndex;

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
                      {t('quizQuestion')} {idx + 1}
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
                    {getLocalizedText(question.question_text, i18n.language)}
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
                      {getLocalizedText(question.options[userAnswer]?.text, i18n.language)}
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
                        {getLocalizedText(question.options[correctAnswerIndex]?.text, i18n.language)}
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
                        {question.explanation}
                      </Text>
                    </View>
                  )}
                </Surface>
              );
            })}
          </View>

          {/* Retry or Finish Button */}
          {isPassed ? (
            <Button
              mode="contained"
              onPress={() => router.back()}
              style={{ marginTop: 20 }}
            >
              {t('goToChapter')}
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={loadQuiz}
              style={{ marginTop: 20 }}
            >
              {t('retakeQuiz')}
            </Button>
          )}
        </ScrollView>
      </View>
    );
  }

  // Quiz start screen or questions
  if (!quizStarted) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ThemedBackground />
        <AppHeader title={t('quiz')} showBack />

        <ScrollView
          style={[styles.container, { width: containerWidth, marginLeft: containerMargin, marginRight: containerMargin }]}
          contentContainerStyle={styles.contentContainer}
        >
          <Surface
            style={[
              styles.startCard,
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
                textAlign: 'center',
              }}
            >
              {t('quizStarted')}
            </Text>

            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginBottom: 16,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              {t('readyToStart') || 'Test your knowledge with this quiz. You will have limited time to answer all questions.'}
            </Text>

            <View
              style={[
                styles.infoBox,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <View style={{ marginBottom: 12 }}>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t('totalQuestions')}: {questions.length}
                </Text>
              </View>
              {quiz.time_limit && (
                <View style={{ marginBottom: 12 }}>
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {t('quizTime', { minutes: quiz.time_limit })}
                  </Text>
                </View>
              )}
              <View>
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t('passingScore', { score: quiz.passing_score || 70 })}
                </Text>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={() => setQuizStarted(true)}
              style={{ marginTop: 24 }}
            >
              {t('startQuiz')}
            </Button>
          </Surface>
        </ScrollView>
      </View>
    );
  }

  // Quiz in progress
  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title={t('quiz')}
        subtitle={`${formatTime(timeRemaining || 0)} remaining`}
        showBack={false}
      />

      <ScrollView
        style={[styles.container, { width: containerWidth, marginLeft: containerMargin, marginRight: containerMargin }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Time Warning */}
        {timeRemaining !== null && timeRemaining < 300 && (
          <Surface
            style={[
              styles.warningCard,
              {
                backgroundColor: theme.colors.errorContainer,
                borderColor: theme.colors.error,
              },
            ]}
          >
            <Text
              style={{
                color: theme.colors.error,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              ⏱️ {t('timeRemaining')}: {formatTime(timeRemaining || 0)}
            </Text>
          </Surface>
        )}

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
            language={i18n.language}
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
          {t('finishQuiz')}
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
  language = 'en',
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
        {t('quizQuestion')} {index} {t('ofTotal', { total })}
      </Text>

      <Text
        variant="bodyMedium"
        style={{
          color: theme.colors.onSurface,
          marginBottom: 16,
          lineHeight: 22,
        }}
      >
        {getLocalizedText(question.question_text, language)}
      </Text>

      <View>
        {question.options && question.options.length > 0 ? (
          question.options.map((option, optIdx) => {
            // Options are objects with a 'text' property that's multilingual
            const optionText = option?.text ? getLocalizedText(option.text, language) : (typeof option === 'string' ? option : `Option ${optIdx + 1}`);
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
          <Text style={{ color: '#999', fontStyle: 'italic' }}>No options available</Text>
        )}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  startCard: {
    padding: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  warningCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
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
