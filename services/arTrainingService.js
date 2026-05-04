/**
 * AR Training Service
 * Uses the dedicated backend AR simulation API and keeps a small offline cache.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import api from "../utils/api";

const CACHE_KEYS = {
  scenarios: "ar_training_scenarios",
  statistics: "ar_training_statistics",
};

const readList = (data) => data?.results || data || [];

class ARTrainingService {
  async getARScenarios(type = null) {
    const cacheKey = type ? `${CACHE_KEYS.scenarios}_${type}` : CACHE_KEYS.scenarios;

    try {
      const response = await api.get("/ar-training/scenarios/", {
        params: type ? { type } : undefined,
      });
      const scenarios = readList(response.data);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(scenarios));
      return scenarios;
    } catch (error) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
      console.log("Error fetching AR scenarios", error.response?.data || error.message);
      return [];
    }
  }

  async getScenarioDetails(scenarioId) {
    const response = await api.get(`/ar-training/scenarios/${scenarioId}/`);
    return response.data;
  }

  async startScenario(scenarioId) {
    const response = await api.get(`/ar-training/scenarios/${scenarioId}/start/`);
    return response.data;
  }

  async discoverHotspot(hotspotId) {
    const response = await api.post(`/ar-training/hotspots/${hotspotId}/discover/`);
    return response.data;
  }

  async answerQuiz(quizId, answerIndex, timeTakenSeconds = 0) {
    const response = await api.post(`/ar-training/quiz/${quizId}/answer/`, {
      answer_index: answerIndex,
      time_taken_seconds: timeTakenSeconds,
    });
    return response.data;
  }

  async updateProgress(progressId, payload) {
    const response = await api.post(`/ar-training/progress/${progressId}/update_progress/`, payload);
    return response.data;
  }

  async getProgress() {
    const response = await api.get("/ar-training/progress/");
    return readList(response.data);
  }

  async getTrainingSummary() {
    try {
      const response = await api.get("/ar-training/statistics/my_stats/");
      const stats = response.data || {};
      const normalized = {
        totalScenariosCompleted: stats.totalScenariosCompleted || stats.scenarios_completed || 0,
        totalHotspotsVisited: stats.totalHotspotsVisited || stats.total_hotspots_discovered || 0,
        averageQuizScore: stats.averageQuizScore || stats.average_quiz_score || 0,
        trainingHours: stats.trainingHours || 0,
        badgesEarned: stats.badgesEarned || stats.badges_earned || 0,
      };
      await AsyncStorage.setItem(CACHE_KEYS.statistics, JSON.stringify(normalized));
      return normalized;
    } catch (error) {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.statistics);
      if (cached) return JSON.parse(cached);
      return {
        totalScenariosCompleted: 0,
        totalHotspotsVisited: 0,
        averageQuizScore: 0,
        trainingHours: 0,
        badgesEarned: 0,
      };
    }
  }
}

export default new ARTrainingService();
