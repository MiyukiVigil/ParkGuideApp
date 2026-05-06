import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { convertBackendIdsToFrontend, convertFrontendIdsToBackend, getModuleMapping, clearModuleMapping } from './moduleMapping';

const COMPLETED_MODULES_KEY = 'parkguide_completed_modules';
const QUIZ_PROGRESS_KEY = 'parkguide_quiz_progress';

/**
 * Sync completed modules from backend to local storage
 * Converts backend numeric module IDs to frontend string codes (1.1, 1.2, etc)
 */
export const syncCompletedModulesFromBackend = async () => {
  try {
    // Ensure module mapping is loaded
    await getModuleMapping();
    
    const response = await api.get('/progress/');
    if (response.data && Array.isArray(response.data)) {
      // Extract backend module IDs
      const backendModuleIds = response.data
        .filter(p => p.completed === true)
        .map(p => {
          // Handle both cases: module could be an ID or an object with an id field
          if (typeof p.module === 'object' && p.module !== null) {
            return p.module.id || String(p.module);
          }
          return String(p.module);
        });
      
      console.log('Completed modules from backend (raw IDs):', backendModuleIds);
      
      // Convert backend IDs to frontend codes
      const frontendModuleIds = await convertBackendIdsToFrontend(backendModuleIds);
      console.log('Converted to frontend codes:', frontendModuleIds);
      
      // Store frontend codes (so UI can compare with TRAINING_COURSES module IDs)
      await AsyncStorage.setItem(COMPLETED_MODULES_KEY, JSON.stringify(frontendModuleIds));
      return frontendModuleIds;
    }
    return null;
  } catch (err) {
    console.log('Failed to sync completed modules from backend:', err.message);
    return null;
  }
};

/**
 * Get completed modules (from local storage if available, with backend fallback)
 */
export const getCompletedModules = async () => {
  try {
    // Try backend first
    const backendModules = await syncCompletedModulesFromBackend();
    if (backendModules) {
      console.log('Using backend completed modules:', backendModules);
      return backendModules;
    }
    
    // Fallback to local storage
    const stored = await AsyncStorage.getItem(COMPLETED_MODULES_KEY);
    const result = stored ? JSON.parse(stored) : [];
    console.log('Using local storage completed modules:', result);
    return result;
  } catch (err) {
    console.log('Failed to get completed modules:', err.message);
    const stored = await AsyncStorage.getItem(COMPLETED_MODULES_KEY);
    return stored ? JSON.parse(stored) : [];
  }
};

/**
 * Mark module as completed (local + backend sync)
 * @param {string} moduleId - Frontend module code (e.g., "1.1")
 */
export const markModuleComplete = async (moduleId) => {
  try {
    // Get current list
    const completed = await getCompletedModules();
    const updated = Array.from(new Set([...completed, moduleId]));
    
    // Save locally first (store frontend codes)
    await AsyncStorage.setItem(COMPLETED_MODULES_KEY, JSON.stringify(updated));
    
    // Sync with backend - need to convert frontend code to backend ID
    try {
      const backendIds = await convertFrontendIdsToBackend([moduleId]);
      const backendModuleId = backendIds[0];
      
      console.log(`Marking module complete - Frontend: ${moduleId}, Backend: ${backendModuleId}`);
      await api.post('/complete-module/', { module_id: backendModuleId });
      console.log('Module completion synced to backend');
    } catch (err) {
      console.log('Warning: Module sync to backend failed, local save preserved:', err.message);
    }
    
    return updated;
  } catch (err) {
    console.error('Failed to mark module complete:', err);
    throw err;
  }
};

/**
 * Clear all progress locally and on backend logout
 */
export const clearProgressData = async () => {
  try {
    await AsyncStorage.removeItem(COMPLETED_MODULES_KEY);
    await AsyncStorage.removeItem(QUIZ_PROGRESS_KEY);
    await clearModuleMapping();
  } catch (err) {
    console.error('Failed to clear progress data:', err);
  }
};

/**
 * Save quiz progress to local storage
 */
export const saveQuizProgress = async (moduleId, questionIndex, answers) => {
  try {
    const quizProgress = await getQuizProgress();
    const updated = {
      ...quizProgress,
      [moduleId]: {
        currentQuestion: questionIndex,
        answers: answers,
        timestamp: new Date().toISOString(),
      }
    };
    await AsyncStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.log('Failed to save quiz progress:', err.message);
  }
};

/**
 * Get quiz progress for a module
 */
export const getQuizProgress = async (moduleId = null) => {
  try {
    const stored = await AsyncStorage.getItem(QUIZ_PROGRESS_KEY);
    const quizProgress = stored ? JSON.parse(stored) : {};
    
    if (moduleId) {
      return quizProgress[moduleId] || null;
    }
    return quizProgress;
  } catch (err) {
    console.log('Failed to get quiz progress:', err.message);
    return moduleId ? null : {};
  }
};
