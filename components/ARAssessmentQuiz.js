/**
 * AR Training Assessment Quiz Component
 * Integrated quiz system for validating guide knowledge after AR scenarios
 */

import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from "react-native";
import {
  Text,
  Button,
  Surface,
  ProgressBar,
  Chip,
  Icon,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * Individual Quiz Question Component
 */
const QuizQuestion = ({
  question,
  options,
  selectedIndex,
  onSelect,
  showAnswer,
  correctIndex,
  theme,
  language,
}) => {
  const getLocalizedText = (value, fallback = "") => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value[language] || value.en || fallback;
  };

  return (
    <Surface style={styles.questionContainer}>
      <Text style={styles.questionText}>
        {getLocalizedText(question)}
      </Text>

      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = index === correctIndex;
          const showCorrectness = showAnswer && (isCorrect || isSelected);

          let optionBackgroundColor = theme.colors.surface;
          let optionBorderColor = "#ddd";
          let optionTextColor = theme.colors.onSurface;

          if (showCorrectness) {
            if (isCorrect && isSelected) {
              optionBackgroundColor = "#c8e6c9";
              optionBorderColor = "#4caf50";
            } else if (isCorrect && !isSelected) {
              optionBackgroundColor = "#fff9c4";
              optionBorderColor = "#fbc02d";
            } else if (!isCorrect && isSelected) {
              optionBackgroundColor = "#ffcdd2";
              optionBorderColor = "#f44336";
            }
          } else if (isSelected) {
            optionBackgroundColor = theme.colors.primaryContainer;
            optionBorderColor = theme.colors.primary;
          }

          return (
            <TouchableOpacity
              key={index}
              onPress={() => !showAnswer && onSelect(index)}
              disabled={showAnswer}
              style={[
                styles.optionButton,
                {
                  backgroundColor: optionBackgroundColor,
                  borderColor: optionBorderColor,
                },
              ]}
            >
              <View style={styles.optionContent}>
                <View
                  style={[
                    styles.optionCircle,
                    { borderColor: optionBorderColor },
                  ]}
                >
                  {showCorrectness && (
                    <MaterialCommunityIcons
                      name={isCorrect ? "check" : "close"}
                      size={16}
                      color={isCorrect ? "#4caf50" : "#f44336"}
                    />
                  )}
                  {!showCorrectness && isSelected && (
                    <View
                      style={[
                        styles.optionDot,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    />
                  )}
                </View>
                <Text style={[styles.optionText, { color: optionTextColor }]}>
                  {getLocalizedText(option)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Surface>
  );
};

/**
 * Quiz Results Screen
 */
const QuizResults = ({ score, totalQuestions, onRetake, onComplete, theme, language }) => {
  const getLocalizedText = (value, fallback = "") => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value[language] || value.en || fallback;
  };

  const percentage = (score / totalQuestions) * 100;
  let resultMessage = "";
  let resultIcon = "";
  let resultColor = "";

  if (percentage === 100) {
    resultMessage =
      language === "zh"
        ? "完美！"
        : language === "ms"
        ? "Sempurna!"
        : "Perfect!";
    resultIcon = "star";
    resultColor = "#fbc02d";
  } else if (percentage >= 80) {
    resultMessage =
      language === "zh"
        ? "出色！"
        : language === "ms"
        ? "Cemerlang!"
        : "Excellent!";
    resultIcon = "check-circle";
    resultColor = "#4caf50";
  } else if (percentage >= 60) {
    resultMessage =
      language === "zh"
        ? "良好"
        : language === "ms"
        ? "Baik"
        : "Good";
    resultIcon = "information";
    resultColor = "#2196f3";
  } else {
    resultMessage =
      language === "zh"
        ? "再试一次"
        : language === "ms"
        ? "Cuba Lagi"
        : "Try Again";
    resultIcon = "alert-circle";
    resultColor = "#f44336";
  }

  return (
    <View style={styles.resultsContainer}>
      <View style={styles.resultIconContainer}>
        <MaterialCommunityIcons
          name={resultIcon}
          size={80}
          color={resultColor}
        />
      </View>

      <Text style={styles.resultMessage}>{resultMessage}</Text>

      <View style={styles.scoreDisplay}>
        <Text style={styles.scoreText}>
          {score} / {totalQuestions}
        </Text>
        <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
      </View>

      <ProgressBar
        progress={percentage / 100}
        style={styles.resultProgressBar}
        color={resultColor}
      />

      <View style={styles.performanceChips}>
        <Chip style={styles.performanceChip} icon="brain">
          {language === "zh"
            ? "知识"
            : language === "ms"
            ? "Pengetahuan"
            : "Knowledge"}{" "}
          {percentage >= 80 ? "✓" : "○"}
        </Chip>
        <Chip style={styles.performanceChip} icon="eye">
          {language === "zh"
            ? "理解"
            : language === "ms"
            ? "Pemahaman"
            : "Understanding"}{" "}
          {percentage >= 60 ? "✓" : "○"}
        </Chip>
      </View>

      <View style={styles.resultsButtonContainer}>
        <Button
          mode="outlined"
          onPress={onRetake}
          style={styles.resultButton}
        >
          {language === "zh"
            ? "重新考试"
            : language === "ms"
            ? "Ambil Semula"
            : "Retake Quiz"}
        </Button>
        <Button
          mode="contained"
          onPress={onComplete}
          style={styles.resultButton}
        >
          {language === "zh"
            ? "完成"
            : language === "ms"
            ? "Siap"
            : "Complete"}
        </Button>
      </View>
    </View>
  );
};

/**
 * Main AR Assessment Quiz Component
 */
export const ARAssessmentQuiz = ({
  scenarioType,
  questions,
  onComplete,
  onCancel,
  theme,
  language = "en",
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const getLocalizedText = (value, fallback = "") => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value[language] || value.en || fallback;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = answers[currentQuestion.id];

  const handleSelectAnswer = (optionIndex) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionIndex,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        slideAnim.setValue(0);
      });
    } else {
      setShowAnswers(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      Animated.timing(slideAnim, {
        toValue: -1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        slideAnim.setValue(0);
      });
    }
  };

  const handleSubmit = () => {
    setShowAnswers(true);
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct) {
        score++;
      }
    });
    return score;
  };

  const handleRetake = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowAnswers(false);
  };

  const handleCompleteQuiz = () => {
    setQuizComplete(true);
    const score = calculateScore();
    onComplete({
      scenarioType,
      score,
      totalQuestions: questions.length,
      percentage: (score / questions.length) * 100,
      answers,
    });
  };

  if (quizComplete) {
    return (
      <QuizResults
        score={calculateScore()}
        totalQuestions={questions.length}
        onRetake={handleRetake}
        onComplete={handleCompleteQuiz}
        theme={theme}
        language={language}
      />
    );
  }

  const progress = (currentQuestionIndex + 1) / questions.length;

  return (
    <View style={styles.quizContainer}>
      {/* Header */}
      <Surface style={styles.quizHeader}>
        <View style={styles.quizHeaderContent}>
          <Text style={styles.quizTitle}>
            {language === "zh"
              ? "AR培训评估"
              : language === "ms"
              ? "Penilaian Latihan AR"
              : "AR Training Assessment"}
          </Text>
          <Text style={styles.quizSubtitle}>
            {getLocalizedText(
              {
                forest: {
                  en: "Biodiversity Knowledge Test",
                  ms: "Ujian Pengetahuan Biodiversiti",
                  zh: "生物多样性知识测试",
                },
                eco: {
                  en: "Eco-tourism Practices Test",
                  ms: "Ujian Amalan Eko-pelancongan",
                  zh: "生态旅游实践测试",
                },
                wildlife: {
                  en: "Wildlife Safety Test",
                  ms: "Ujian Keselamatan Hidupan Liar",
                  zh: "野生动物安全测试",
                },
              }[scenarioType]
            )}
          </Text>
        </View>
        <TouchableOpacity onPress={onCancel}>
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
      </Surface>

      {/* Progress */}
      <Surface style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            {language === "zh"
              ? `问题 ${currentQuestionIndex + 1} / ${questions.length}`
              : language === "ms"
              ? `Soalan ${currentQuestionIndex + 1} / ${questions.length}`
              : `Question ${currentQuestionIndex + 1} / ${questions.length}`}
          </Text>
        </View>
        <ProgressBar progress={progress} style={styles.quizProgressBar} />
      </Surface>

      {/* Question */}
      <ScrollView style={styles.questionContent}>
        <QuizQuestion
          question={currentQuestion.question}
          options={currentQuestion.options[language] || currentQuestion.options.en}
          selectedIndex={selectedAnswer}
          onSelect={handleSelectAnswer}
          showAnswer={showAnswers}
          correctIndex={currentQuestion.correct}
          theme={theme}
          language={language}
        />

        {/* Explanation */}
        {showAnswers && (
          <Surface style={styles.explanationContainer}>
            <View style={styles.explanationHeader}>
              <MaterialCommunityIcons
                name="lightbulb"
                size={20}
                color="#fbc02d"
              />
              <Text style={styles.explanationTitle}>
                {language === "zh"
                  ? "解释"
                  : language === "ms"
                  ? "Penjelasan"
                  : "Explanation"}
              </Text>
            </View>
            <Text style={styles.explanationText}>
              {getLocalizedText(currentQuestion.explanation)}
            </Text>
          </Surface>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={handlePrevious}
          disabled={currentQuestionIndex === 0}
          style={styles.navButton}
        >
          {language === "zh"
            ? "上一个"
            : language === "ms"
            ? "Sebelumnya"
            : "Previous"}
        </Button>

        {!showAnswers && (
          <Button
            mode="contained"
            onPress={
              currentQuestionIndex === questions.length - 1
                ? handleSubmit
                : handleNext
            }
            disabled={selectedAnswer === undefined}
            style={styles.navButton}
          >
            {currentQuestionIndex === questions.length - 1
              ? language === "zh"
                ? "提交"
                : language === "ms"
                ? "Hantar"
                : "Submit"
              : language === "zh"
              ? "下一个"
              : language === "ms"
              ? "Seterusnya"
              : "Next"}
          </Button>
        )}

        {showAnswers && (
          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.navButton}
          >
            {currentQuestionIndex === questions.length - 1
              ? language === "zh"
                ? "查看结果"
                : language === "ms"
                ? "Lihat Keputusan"
                : "View Results"
              : language === "zh"
              ? "下一个"
              : language === "ms"
              ? "Seterusnya"
              : "Next"}
          </Button>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  quizContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  quizHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  quizHeaderContent: {
    flex: 1,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  quizSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressHeader: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  quizProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  questionContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  questionContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#000",
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  explanationContainer: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fffbea",
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#fbc02d",
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#333",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    justifyContent: "space-between",
  },
  navButton: {
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  resultIconContainer: {
    marginBottom: 24,
  },
  resultMessage: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  scoreDisplay: {
    alignItems: "center",
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#2196f3",
  },
  percentageText: {
    fontSize: 24,
    color: "#666",
    marginTop: 4,
  },
  resultProgressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 16,
    width: "100%",
  },
  performanceChips: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 24,
  },
  performanceChip: {
    flex: 1,
  },
  resultsButtonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 24,
  },
  resultButton: {
    flex: 1,
  },
});

export default ARAssessmentQuiz;
