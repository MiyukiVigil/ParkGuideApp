import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAPPING_CACHE_KEY = 'parkguide_module_mapping_v2';

/**
 * NEW APPROACH: Backend now returns module codes (1.1, 1.2, etc) directly
 * No more conversion needed! The backend stores:
 * - Course.code (e.g., "course1")
 * - Module.code (e.g., "1.1", "1.2")
 * 
 * Frontend can use these codes directly without any mapping layer.
 * This file maintains backward compatibility and caching for performance.
 */

let cachedMapping = null;

/**
 * Build module mapping directly from backend (using codes, no conversion)
 */
export const buildModuleMapping = async () => {
  try {
    console.log('📥 Loading module codes from backend...');
    
    const response = await api.get('/courses/');
    if (!response.data || !Array.isArray(response.data)) {
      console.warn('Invalid courses response:', response.data);
      return null;
    }

    const backendToFrontend = {}; // Backend numeric ID → Module code (e.g., "67" → "1.1")
    const frontendToBackend = {}; // Module code → Backend numeric ID (e.g., "1.1" → "67")
    const codeToModuleInfo = {};  // Module code → {id, courseCode, moduleCode}

    // Process each course and its modules
    for (const course of response.data) {
      const modules = course.modules || [];
      
      for (const module of modules) {
        // Now backend returns both:
        // - module.id = numeric ID from database (67, 68, etc)
        // - module.code = string code from JSON (1.1, 1.2, etc)
        
        if (module.code) {
          const numericId = String(module.id);
          const moduleCode = module.code;
          
          backendToFrontend[numericId] = moduleCode;
          frontendToBackend[moduleCode] = numericId;
          codeToModuleInfo[moduleCode] = {
            id: module.id,
            code: moduleCode,
            courseCode: course.code,
            title: module.title,
          };
          
          console.log(`  ✓ Module ${moduleCode} (ID: ${numericId})`);
        }
      }
    }

    const mapping = { backendToFrontend, frontendToBackend, codeToModuleInfo };
    cachedMapping = mapping;
    
    // Cache for offline access
    try {
      await AsyncStorage.setItem(MAPPING_CACHE_KEY, JSON.stringify(mapping));
      console.log('✅ Module mapping cached');
    } catch (err) {
      console.warn('⚠️ Failed to cache mapping:', err.message);
    }

    console.log('✅ Module mapping loaded successfully');
    return mapping;
  } catch (err) {
    console.error('❌ Failed to load module mapping:', err.message);
    return null;
  }
};

/**
 * Get module mapping (from cache or fetch)
 */
export const getModuleMapping = async () => {
  if (cachedMapping) {
    return cachedMapping;
  }

  try {
    const stored = await AsyncStorage.getItem(MAPPING_CACHE_KEY);
    if (stored) {
      cachedMapping = JSON.parse(stored);
      console.log('📦 Module mapping loaded from cache');
      return cachedMapping;
    }
  } catch (err) {
    console.warn('⚠️ Failed to load from cache:', err.message);
  }

  return await buildModuleMapping();
};

/**
 * Convert backend numeric IDs to module codes
 * E.g., ["67", "68", "69"] → ["1.1", "1.2", "1.3"]
 * 
 * Now that backend returns codes with modules, this is just a lookup table.
 */
export const convertBackendIdsToFrontend = async (backendIds) => {
  if (!backendIds || backendIds.length === 0) return [];

  const mapping = await getModuleMapping();
  if (!mapping) {
    console.warn('No module mapping, returning backend IDs:', backendIds);
    return backendIds;
  }

  const converted = backendIds
    .map(id => mapping.backendToFrontend[String(id)])
    .filter(Boolean);

  console.log('🔄 Converted backend IDs:', backendIds, '→', converted);
  return converted;
};

/**
 * Convert module codes to backend numeric IDs (if needed)
 * E.g., ["1.1", "1.2", "1.3"] → ["67", "68", "69"]
 */
export const convertFrontendIdsToBackend = async (frontendIds) => {
  if (!frontendIds || frontendIds.length === 0) return [];

  const mapping = await getModuleMapping();
  if (!mapping) {
    console.warn('No module mapping, returning frontend IDs:', frontendIds);
    return frontendIds;
  }

  const converted = frontendIds
    .map(id => mapping.frontendToBackend[id])
    .filter(Boolean);

  console.log('🔄 Converted frontend codes:', frontendIds, '→', converted);
  return converted;
};

/**
 * Get module info by code
 * Returns: {id, code, courseCode, title}
 */
export const getModuleByCode = async (moduleCode) => {
  const mapping = await getModuleMapping();
  if (!mapping) return null;
  return mapping.codeToModuleInfo[moduleCode] || null;
};

/**
 * Clear mapping cache (on logout, etc)
 */
export const clearModuleMapping = async () => {
  cachedMapping = null;
  try {
    await AsyncStorage.removeItem(MAPPING_CACHE_KEY);
    console.log('🗑️ Module mapping cleared');
  } catch (err) {
    console.warn('⚠️ Failed to clear mapping:', err.message);
  }
};
