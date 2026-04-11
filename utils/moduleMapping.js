import api from './api';
import { TRAINING_COURSES } from '../constants/courses';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAPPING_CACHE_KEY = 'parkguide_module_mapping';

/**
 * Builds a mapping between backend numeric module IDs and frontend string codes (1.1, 1.2, etc)
 * Backend structure: Course has many Modules (with numeric DB IDs)
 * Frontend structure: TRAINING_COURSES has modules with string codes like "1.1", "1.2"
 * 
 * Mapping strategy:
 * 1. Fetch courses from backend to get module IDs
 * 2. Match by position (first course first modules, etc)
 * 3. Create bidirectional mapping: backendId ↔ frontendCode
 */

let cachedMapping = null;

/**
 * Fetch courses from backend and build the module ID mapping
 */
export const buildModuleMapping = async () => {
  try {
    console.log('Building module mapping from backend...');
    
    // Fetch courses from backend
    const response = await api.get('/courses/');
    if (!response.data || !Array.isArray(response.data)) {
      console.log('Invalid courses response:', response.data);
      return null;
    }

    const backendToFrontend = {}; // Backend ID → Frontend code (e.g., "67" → "1.1")
    const frontendToBackend = {}; // Frontend code → Backend ID (e.g., "1.1" → "67")

    // Sort backend courses by ID to ensure consistent ordering
    const sortedCourses = response.data.sort((a, b) => a.id - b.id);

    // Map each backend course to frontend course by position
    for (let courseIdx = 0; courseIdx < sortedCourses.length && courseIdx < TRAINING_COURSES.length; courseIdx++) {
      const backendCourse = sortedCourses[courseIdx];
      const frontendCourse = TRAINING_COURSES[courseIdx];

      // Get modules from backend course
      const backendModules = backendCourse.modules || [];
      const frontendModules = frontendCourse.modules || [];

      // Sort backend modules by ID for consistent ordering
      const sortedModules = backendModules.sort((a, b) => a.id - b.id);

      // Map each module by position
      for (let modIdx = 0; modIdx < sortedModules.length && modIdx < frontendModules.length; modIdx++) {
        const backendModuleId = String(sortedModules[modIdx].id);
        const frontendModuleCode = frontendModules[modIdx].id;

        backendToFrontend[backendModuleId] = frontendModuleCode;
        frontendToBackend[frontendModuleCode] = backendModuleId;

        console.log(`Mapped: Backend ${backendModuleId} ↔ Frontend ${frontendModuleCode}`);
      }
    }

    // Cache the mapping
    const mapping = { backendToFrontend, frontendToBackend };
    cachedMapping = mapping;
    
    try {
      await AsyncStorage.setItem(MAPPING_CACHE_KEY, JSON.stringify(mapping));
    } catch (storageErr) {
      console.log('Failed to cache mapping:', storageErr.message);
    }

    console.log('Module mapping built successfully:', mapping);
    return mapping;
  } catch (err) {
    console.log('Failed to build module mapping:', err.message);
    return null;
  }
};

/**
 * Load module mapping from cache or fetch from backend
 */
export const getModuleMapping = async () => {
  // Return cached mapping if available
  if (cachedMapping) {
    return cachedMapping;
  }

  // Try to load from storage
  try {
    const stored = await AsyncStorage.getItem(MAPPING_CACHE_KEY);
    if (stored) {
      cachedMapping = JSON.parse(stored);
      console.log('Module mapping loaded from storage');
      return cachedMapping;
    }
  } catch (err) {
    console.log('Failed to load mapping from storage:', err.message);
  }

  // Build fresh mapping from backend
  return await buildModuleMapping();
};

/**
 * Convert backend module IDs to frontend codes
 * E.g., ["67", "68", "69"] → ["1.1", "1.2", "1.3"]
 */
export const convertBackendIdsToFrontend = async (backendIds) => {
  if (!backendIds || backendIds.length === 0) return [];

  const mapping = await getModuleMapping();
  if (!mapping) {
    console.log('No module mapping available, returning backend IDs as-is');
    return backendIds;
  }

  const converted = backendIds
    .map(id => mapping.backendToFrontend[id] || id)
    .filter(id => id); // Remove unmapped IDs

  console.log('Converted backend IDs to frontend:', backendIds, '→', converted);
  return converted;
};

/**
 * Convert frontend module codes to backend IDs (if needed)
 * E.g., ["1.1", "1.2", "1.3"] → ["67", "68", "69"]
 */
export const convertFrontendIdsToBackend = async (frontendIds) => {
  if (!frontendIds || frontendIds.length === 0) return [];

  const mapping = await getModuleMapping();
  if (!mapping) {
    console.log('No module mapping available, returning frontend IDs as-is');
    return frontendIds;
  }

  const converted = frontendIds
    .map(id => mapping.frontendToBackend[id] || id)
    .filter(id => id);

  console.log('Converted frontend IDs to backend:', frontendIds, '→', converted);
  return converted;
};

/**
 * Clear cached mapping (on logout, etc)
 */
export const clearModuleMapping = async () => {
  cachedMapping = null;
  try {
    await AsyncStorage.removeItem(MAPPING_CACHE_KEY);
  } catch (err) {
    console.log('Failed to clear mapping:', err.message);
  }
};
