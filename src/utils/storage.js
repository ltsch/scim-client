/**
 * Browser storage utilities for SCIM client configuration
 */

const STORAGE_KEY = 'scim-client-config';

/**
 * Get configuration from localStorage
 * @returns {Object|null} Configuration object or null if not found
 */
export const getConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error reading config from localStorage:', error);
    return null;
  }
};

/**
 * Save configuration to localStorage
 * @param {Object} config - Configuration object
 */
export const saveConfig = (config) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving config to localStorage:', error);
    throw new Error('Failed to save configuration');
  }
};

/**
 * Clear configuration from localStorage
 */
export const clearConfig = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing config from localStorage:', error);
  }
};

/**
 * Check if configuration exists and is valid
 * @returns {boolean} True if valid config exists
 */
export const hasValidConfig = () => {
  const config = getConfig();
  return config && config.endpoint && config.endpoint.trim() !== '';
};

/**
 * Get default configuration
 * @returns {Object} Default configuration object
 */
export const getDefaultConfig = () => ({
  endpoint: '',
  apiKey: '',
  useCorsProxy: false,
  corsProxyUrl: '/proxy'
}); 