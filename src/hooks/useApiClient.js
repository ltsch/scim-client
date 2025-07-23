import { useState, useCallback } from 'react';
import * as api from '../utils/api';

/**
 * Custom hook for API client functionality
 * @param {Object} config - Configuration object
 * @returns {Object} API client state and methods
 */
export const useApiClient = (config) => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Add a request to the history
   * @param {Object} requestData - Request data to add
   */
  const addRequest = useCallback((requestData) => {
    setRequests(prev => [requestData, ...prev.slice(0, 49)]); // Keep last 50 requests
  }, []);

  /**
   * Clear request history
   */
  const clearRequests = useCallback(() => {
    setRequests([]);
  }, []);

  /**
   * Make a generic SCIM request
   * @param {string} path - API path
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response object
   */
  const makeRequest = useCallback(async (path, options = {}) => {
    if (!config?.endpoint) {
      throw new Error('No endpoint configured');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.makeScimRequest(config.endpoint, path, {
        ...options,
        apiKey: config.apiKey,
        useCorsProxy: config.useCorsProxy,
        corsProxyUrl: config.corsProxyUrl
      });

      addRequest({
        ...response,
        path,
        config: {
          endpoint: config.endpoint,
          useCorsProxy: config.useCorsProxy
        }
      });

      return response;
    } catch (err) {
      const errorResponse = {
        success: false,
        error: err.message,
        path,
        timestamp: new Date().toISOString()
      };
      
      setError(err.message);
      addRequest(errorResponse);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config, addRequest]);

  /**
   * Get resources (Users, Groups, Schemas)
   * @param {string} resourceType - Resource type
   * @returns {Promise<Object>} Response object
   */
  const getResources = useCallback(async (resourceType) => {
    return makeRequest(`/${resourceType}`);
  }, [makeRequest]);

  /**
   * Get a specific resource by ID
   * @param {string} resourceType - Resource type
   * @param {string} id - Resource ID
   * @returns {Promise<Object>} Response object
   */
  const getResourceById = useCallback(async (resourceType, id) => {
    return makeRequest(`/${resourceType}/${id}`);
  }, [makeRequest]);

  /**
   * Create a new resource
   * @param {string} resourceType - Resource type
   * @param {Object} resourceData - Resource data
   * @returns {Promise<Object>} Response object
   */
  const createResource = useCallback(async (resourceType, resourceData) => {
    return makeRequest(`/${resourceType}`, {
      method: 'POST',
      body: resourceData
    });
  }, [makeRequest]);

  /**
   * Update a resource
   * @param {string} resourceType - Resource type
   * @param {string} id - Resource ID
   * @param {Object} resourceData - Updated resource data
   * @returns {Promise<Object>} Response object
   */
  const updateResource = useCallback(async (resourceType, id, resourceData) => {
    return makeRequest(`/${resourceType}/${id}`, {
      method: 'PUT',
      body: resourceData
    });
  }, [makeRequest]);

  /**
   * Delete a resource
   * @param {string} resourceType - Resource type
   * @param {string} id - Resource ID
   * @returns {Promise<Object>} Response object
   */
  const deleteResource = useCallback(async (resourceType, id) => {
    return makeRequest(`/${resourceType}/${id}`, {
      method: 'DELETE'
    });
  }, [makeRequest]);

  return {
    requests,
    isLoading,
    error,
    makeRequest,
    getResources,
    getResourceById,
    createResource,
    updateResource,
    deleteResource,
    clearRequests
  };
}; 