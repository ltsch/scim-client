import { useState, useEffect } from 'react';
import { getConfig, saveConfig, clearConfig, getDefaultConfig } from '../utils/storage';

/**
 * Custom hook for configuration management
 * @returns {Object} Configuration state and methods
 */
export const useConfig = () => {
  const [config, setConfig] = useState(getDefaultConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load configuration on mount
  useEffect(() => {
    try {
      const savedConfig = getConfig();
      if (savedConfig) {
        setConfig(savedConfig);
      }
    } catch (err) {
      setError('Failed to load configuration');
      console.error('Error loading config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration object
   */
  const updateConfig = (newConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  /**
   * Save configuration to localStorage
   * @param {Object} configToSave - Configuration to save (optional, uses current state if not provided)
   */
  const saveConfiguration = (configToSave = config) => {
    try {
      saveConfig(configToSave);
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to save configuration');
      console.error('Error saving config:', err);
      return false;
    }
  };

  /**
   * Clear configuration
   */
  const clearConfiguration = () => {
    try {
      clearConfig(); // Clear from localStorage
      setConfig(getDefaultConfig()); // Reset state
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to clear configuration');
      console.error('Error clearing config:', err);
      return false;
    }
  };

  /**
   * Check if current configuration is valid
   * @returns {boolean} True if configuration is valid
   */
  const isValid = () => {
    return config.endpoint && config.endpoint.trim() !== '';
  };

  return {
    config,
    isLoading,
    error,
    updateConfig,
    saveConfiguration,
    clearConfiguration,
    isValid: isValid(),
    hasValidConfig: isValid()
  };
}; 