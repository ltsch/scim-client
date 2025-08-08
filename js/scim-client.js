// js/scim-client.js - Refactored SCIM Client

import { APP_CONFIG, SCIM_CONFIG } from './config.js';
import { 
  validateRequired, 
  validateElement, 
  validateFunction,
  saveToStorage,
  loadFromStorage,
  parseError,
  safeAsync,
  createError,
  requestLogger,
  createRequestLog,
  createResponseLog,
  parseSCIMError,
  loadAllowedTargets,
  isHostAllowedByPatterns
} from './utils.js';

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base SCIM error class
 */
export class SCIMError extends Error {
  constructor(message, type = 'SCIM_ERROR', details = {}) {
    super(message);
    this.name = 'SCIMError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * SCIM validation error
 */
export class SCIMValidationError extends SCIMError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', { field });
    this.name = 'SCIMValidationError';
  }
}

/**
 * SCIM network error
 */
export class SCIMNetworkError extends SCIMError {
  constructor(message, status = 0, scimError = null) {
    super(message, 'NETWORK_ERROR', { status, scimError });
    this.name = 'SCIMNetworkError';
    this.status = status;
    this.scimError = scimError;
  }
}

// ============================================================================
// CONFIGURATION MANAGER
// ============================================================================

/**
 * SCIM configuration manager
 */
export class SCIMConfig {
  constructor() {
    this.endpoint = this._getStorageItem(APP_CONFIG.STORAGE_KEYS.ENDPOINT)?.replace(/\/$/, '') || '';
    this.apiKey = this._getStorageItem(APP_CONFIG.STORAGE_KEYS.API_KEY) || '';
    this.useProxy = this._getStorageItem(APP_CONFIG.STORAGE_KEYS.USE_PROXY) === 'true';
    this.proxyUrl = this._getStorageItem(APP_CONFIG.STORAGE_KEYS.PROXY_URL) || '/proxy';
    this.timeout = APP_CONFIG.API.TIMEOUT_MS;
  }

  /**
   * Get storage item safely
   * @param {string} key - Storage key
   * @returns {string|null} Stored value
   */
  _getStorageItem(key) {
    return loadFromStorage(key, null);
  }

  /**
   * Set storage item safely
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  _setStorageItem(key, value) {
    saveToStorage(key, value);
  }

  /**
   * Update endpoint configuration
   * @param {string} endpoint - SCIM endpoint URL
   */
  updateEndpoint(endpoint) {
    this.endpoint = endpoint?.replace(/\/$/, '') || '';
    this._setStorageItem(APP_CONFIG.STORAGE_KEYS.ENDPOINT, this.endpoint);
  }

  /**
   * Update API key configuration
   * @param {string} apiKey - API key
   */
  updateApiKey(apiKey) {
    this.apiKey = apiKey || '';
    this._setStorageItem(APP_CONFIG.STORAGE_KEYS.API_KEY, this.apiKey);
  }

  /**
   * Update proxy configuration
   * @param {boolean} useProxy - Whether to use CORS proxy
   */
  updateUseProxy(useProxy) {
    this.useProxy = Boolean(useProxy);
    this._setStorageItem(APP_CONFIG.STORAGE_KEYS.USE_PROXY, this.useProxy.toString());
  }

  /**
   * Update proxy URL configuration
   * @param {string} proxyUrl - Proxy URL
   */
  updateProxyUrl(proxyUrl) {
    this.proxyUrl = proxyUrl || '/proxy';
    this._setStorageItem(APP_CONFIG.STORAGE_KEYS.PROXY_URL, this.proxyUrl);
  }

  /**
   * Get request headers
   * @returns {Object} Headers object
   */
  getHeaders() {
    const headers = { ...APP_CONFIG.API.DEFAULT_HEADERS };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  /**
   * Validate configuration
   * @throws {SCIMValidationError} If validation fails
   */
  validate() {
    validateRequired(this.endpoint, 'SCIM endpoint');
    
    try {
      new URL(this.endpoint);
    } catch (error) {
      throw new SCIMValidationError('Invalid SCIM endpoint URL');
    }
  }
}

// ============================================================================
// RESPONSE PROCESSOR
// ============================================================================

/**
 * Process SCIM API responses consistently
 */
export class SCIMResponseProcessor {
  /**
   * Process list response
   * @param {Object} response - API response
   * @param {string} resourceType - Resource type
   * @returns {Array} Processed resources
   */
  static processListResponse(response, resourceType) {
    if (!response || typeof response !== 'object') {
      throw new SCIMValidationError(`Invalid ${resourceType} response`);
    }

    // Handle both direct array and Resources array
    if (Array.isArray(response)) {
      return response;
    }

    if (response.Resources && Array.isArray(response.Resources)) {
      return response.Resources;
    }

    if (response.resources && Array.isArray(response.resources)) {
      return response.resources;
    }

    throw new SCIMValidationError(`No ${resourceType} resources found in response`);
  }

  /**
   * Process single resource response
   * @param {Object} response - API response
   * @param {string} resourceType - Resource type
   * @returns {Object} Processed resource
   */
  static processSingleResponse(response, resourceType) {
    if (!response || typeof response !== 'object') {
      throw new SCIMValidationError(`Invalid ${resourceType} response`);
    }

    return response;
  }

  /**
   * Process error response with enhanced SCIM error parsing
   * @param {Object} response - Error response
   * @param {number} status - HTTP status
   * @returns {SCIMError} Processed error
   */
  static async processErrorResponse(response, status) {
    let message = 'Unknown error';
    let details = {};
    let scimError = null;

    if (response && typeof response === 'object') {
      if (response.detail) {
        message = response.detail;
      } else if (response.message) {
        message = response.message;
      } else if (response.error) {
        message = response.error;
      }

      if (response.scimType) {
        details.scimType = response.scimType;
      }

      if (response.schemas) {
        details.schemas = response.schemas;
      }

      // Parse SCIM error with RFC context
      scimError = await parseSCIMError(response, status);
    }

    const networkError = new SCIMNetworkError(message, status, scimError);
    networkError.details = details;
    
    return networkError;
  }
}

// ============================================================================
// SCIM CLIENT
// ============================================================================

/**
 * Main SCIM client for API interactions
 */
export class SCIMClient {
  /**
   * Create SCIM client
   * @param {Object} config - Configuration object
   */
  constructor(config = {}) {
    this.config = new SCIMConfig();
    
    // Override config with provided values
    if (config.endpoint) this.config.updateEndpoint(config.endpoint);
    if (config.apiKey) this.config.updateApiKey(config.apiKey);
    if (config.useProxy !== undefined) this.config.updateUseProxy(config.useProxy);
    
    this.validate();
  }

  /**
   * Validate client configuration
   * @throws {SCIMValidationError} If validation fails
   */
  validate() {
    this.config.validate();
  }

  /**
   * Validate resource ID
   * @param {string} id - Resource ID
   * @param {string} resourceType - Resource type
   * @throws {SCIMValidationError} If validation fails
   */
  _validateResourceId(id, resourceType) {
    validateRequired(id, `${resourceType} ID`);
    if (typeof id !== 'string' || id.trim() === '') {
      throw new SCIMValidationError(`Invalid ${resourceType} ID`);
    }
  }

  /**
   * Validate resource data
   * @param {Object} data - Resource data
   * @param {string} resourceType - Resource type
   * @throws {SCIMValidationError} If validation fails
   */
  _validateResourceData(data, resourceType) {
    if (!data || typeof data !== 'object') {
      throw new SCIMValidationError(`${resourceType} data must be an object`);
    }
  }

  /**
   * Validate query parameters
   * @param {Object} params - Query parameters
   * @throws {SCIMValidationError} If validation fails
   */
  _validateParams(params) {
    if (params && typeof params !== 'object') {
      throw new SCIMValidationError('Parameters must be an object');
    }
  }

  /**
   * Discover available endpoints
   * @returns {Promise<Object>} Endpoints information
   */
  async discoverEndpoints() {
    return await safeAsync(async () => {
      const response = await this._fetch('/ServiceProviderConfig');
      
      if (!response || typeof response !== 'object') {
        throw new SCIMValidationError('Invalid ServiceProviderConfig response');
      }

      return {
        serviceProviderConfig: response,
        supportedResources: response.supportedResources || [],
        supportedOperations: response.supportedOperations || [],
        supportedFilters: response.supportedFilters || [],
        supportedSort: response.supportedSort || false,
        supportedPatch: response.supportedPatch || false,
        supportedBulk: response.supportedBulk || false,
        maxOperations: response.maxOperations || 0,
        maxPayloadSize: response.maxPayloadSize || 0,
        maxResults: response.maxResults || 0
      };
    });
  }

  /**
   * Get service provider configuration
   * @returns {Promise<Object>} Service provider config
   */
  async getServiceProviderConfig() {
    return await safeAsync(async () => {
      return await this._fetch('/ServiceProviderConfig');
    });
  }

  /**
   * Get complete server configuration
   * @returns {Promise<Object>} Server configuration
   */
  async getServerConfig() {
    return await safeAsync(async () => {
      const [serviceProviderConfig, resourceTypes, schemas] = await Promise.all([
        this.getServiceProviderConfig(),
        this.getResourceTypes(),
        this.getSchemas()
      ]);

      return {
        serviceProviderConfig,
        resourceTypes,
        schemas,
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * Get resource types
   * @returns {Promise<Array>} Resource types
   */
  async getResourceTypes() {
    return await safeAsync(async () => {
      const response = await this._fetch('/ResourceTypes');
      
      // Handle SCIM ListResponse format
      if (response && response.Resources && Array.isArray(response.Resources)) {
        return response.Resources;
      }
      
      // Fallback for direct array response
      if (response && Array.isArray(response)) {
        return response;
      }

      return [];
    });
  }

  /**
   * Get schemas
   * @returns {Promise<Array>} Schemas
   */
  async getSchemas() {
    return await safeAsync(async () => {
      const response = await this._fetch('/Schemas');
      
      // Handle SCIM ListResponse format
      if (response && response.Resources && Array.isArray(response.Resources)) {
        return response.Resources;
      }
      
      // Fallback for direct array response
      if (response && Array.isArray(response)) {
        return response;
      }

      return [];
    });
  }

  /**
   * Generic method to get resources
   * @param {string} resourceType - Resource type
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Resources
   */
  async _getResources(resourceType, params = {}) {
    this._validateParams(params);
    const response = await this._fetch(`/${resourceType}`, params);
    return SCIMResponseProcessor.processListResponse(response, resourceType);
  }

  /**
   * Generic method to get a single resource
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @returns {Promise<Object>} Resource
   */
  async _getResource(resourceType, resourceId) {
    this._validateResourceId(resourceId, resourceType);
    const response = await this._fetch(`/${resourceType}/${resourceId}`);
    return SCIMResponseProcessor.processSingleResponse(response, resourceType);
  }

  /**
   * Generic method to create a resource
   * @param {string} resourceType - Resource type
   * @param {Object} data - Resource data
   * @returns {Promise<Object>} Created resource
   */
  async _createResource(resourceType, data) {
    this._validateResourceData(data, resourceType);
    return await this._fetch(`/${resourceType}`, {}, 'POST', data);
  }

  /**
   * Generic method to update a resource
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {Object} data - Resource data
   * @returns {Promise<Object>} Updated resource
   */
  async _updateResource(resourceType, resourceId, data) {
    this._validateResourceId(resourceId, resourceType);
    this._validateResourceData(data, resourceType);
    return await this._fetch(`/${resourceType}/${resourceId}`, {}, 'PUT', data);
  }

  /**
   * Generic method to patch a resource
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {Array} patchOps - Patch operations
   * @returns {Promise<Object>} Patched resource
   */
  async _patchResource(resourceType, resourceId, patchOps) {
    this._validateResourceId(resourceId, resourceType);
    if (!Array.isArray(patchOps)) {
      throw new SCIMValidationError('Patch operations must be an array');
    }
    return await this._fetch(`/${resourceType}/${resourceId}`, {}, 'PATCH', patchOps);
  }

  /**
   * Generic method to delete a resource
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @returns {Promise<Object>} Deletion result
   */
  async _deleteResource(resourceType, resourceId) {
    this._validateResourceId(resourceId, resourceType);
    return await this._fetch(`/${resourceType}/${resourceId}`, {}, 'DELETE');
  }

  // ============================================================================
  // USER METHODS
  // ============================================================================

  async getUsers(params = {}) {
    return await this._getResources('Users', params);
  }

  async getUser(userId) {
    return await this._getResource('Users', userId);
  }

  async createUser(userData) {
    return await this._createResource('Users', userData);
  }

  async updateUser(userId, userData) {
    return await this._updateResource('Users', userId, userData);
  }

  async patchUser(userId, patchOps) {
    return await this._patchResource('Users', userId, patchOps);
  }

  async deleteUser(userId) {
    return await this._deleteResource('Users', userId);
  }

  // ============================================================================
  // GROUP METHODS
  // ============================================================================

  async getGroups(params = {}) {
    return await this._getResources('Groups', params);
  }

  async getGroup(groupId) {
    return await this._getResource('Groups', groupId);
  }

  async createGroup(groupData) {
    return await this._createResource('Groups', groupData);
  }

  async updateGroup(groupId, groupData) {
    return await this._updateResource('Groups', groupId, groupData);
  }

  async patchGroup(groupId, patchOps) {
    return await this._patchResource('Groups', groupId, patchOps);
  }

  async deleteGroup(groupId) {
    return await this._deleteResource('Groups', groupId);
  }

  // ============================================================================
  // ENTITLEMENT METHODS
  // ============================================================================

  async getEntitlements(params = {}) {
    return await this._getResources('Entitlements', params);
  }

  async getEntitlement(entitlementId) {
    return await this._getResource('Entitlements', entitlementId);
  }

  async createEntitlement(entitlementData) {
    return await this._createResource('Entitlements', entitlementData);
  }

  async updateEntitlement(entitlementId, entitlementData) {
    return await this._updateResource('Entitlements', entitlementId, entitlementData);
  }

  async patchEntitlement(entitlementId, patchOps) {
    return await this._patchResource('Entitlements', entitlementId, patchOps);
  }

  async deleteEntitlement(entitlementId) {
    return await this._deleteResource('Entitlements', entitlementId);
  }

  // ============================================================================
  // ROLE METHODS
  // ============================================================================

  async getRoles(params = {}) {
    return await this._getResources('Roles', params);
  }

  async getRole(roleId) {
    return await this._getResource('Roles', roleId);
  }

  async createRole(roleData) {
    return await this._createResource('Roles', roleData);
  }

  async updateRole(roleId, roleData) {
    return await this._updateResource('Roles', roleId, roleData);
  }

  async patchRole(roleId, patchOps) {
    return await this._patchResource('Roles', roleId, patchOps);
  }

  async deleteRole(roleId) {
    return await this._deleteResource('Roles', roleId);
  }

  // ============================================================================
  // GENERIC RESOURCE METHODS
  // ============================================================================

  /**
   * Get available resource types
   * @returns {Promise<Array>} Available resource types
   */
  async getAvailableResourceTypes() {
    return await safeAsync(async () => {
      try {
        const resourceTypes = await this.getResourceTypes();
        return resourceTypes.map(rt => rt.name);
      } catch (error) {
        // Fallback to common resource types
        return ['User', 'Group'];
      }
    });
  }

  /**
   * Generic resource methods
   */
  async getResources(resourceType, params = {}) {
    return await this._getResources(resourceType, params);
  }

  async getResource(resourceType, resourceId) {
    return await this._getResource(resourceType, resourceId);
  }

  async createResource(resourceType, data) {
    return await this._createResource(resourceType, data);
  }

  async updateResource(resourceType, resourceId, data) {
    return await this._updateResource(resourceType, resourceId, data);
  }

  async patchResource(resourceType, resourceId, patchOps) {
    return await this._patchResource(resourceType, resourceId, patchOps);
  }

  async deleteResource(resourceType, resourceId) {
    return await this._deleteResource(resourceType, resourceId);
  }

  // ============================================================================
  // CORE FETCH METHOD WITH ENHANCED LOGGING
  // ============================================================================

  /**
   * Core fetch method with error handling, proxy support, and comprehensive logging
   * @param {string} path - API path
   * @param {Object} params - Query parameters
   * @param {string} method - HTTP method
   * @param {Object} body - Request body
   * @returns {Promise<Object>} Response data
   */
  async _fetch(path, params = {}, method = 'GET', body = null) {
    return await safeAsync(async () => {
      // Build URL
      let url = this.config.endpoint + path;
      
      // Add query parameters
      if (Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value);
          }
        });
        url += '?' + searchParams.toString();
      }

      // Handle CORS proxy
      if (this.config.useProxy) {
        // The proxy expects the full URL to be passed in the path after /proxy/
        // nginx routes /proxy/ to the Python CORS proxy at 127.0.0.1:8002
        // The Python proxy expects the raw URL, not URL-encoded
        url = this.config.proxyUrl + '/' + url;
      }

      // Enforce frontend allowlist check against target hostname
      try {
        const targetUrl = new URL(this.config.endpoint);
        const allowed = await loadAllowedTargets();
        if (!isHostAllowedByPatterns(targetUrl.hostname, allowed)) {
          throw new SCIMValidationError('Target host is not allowed by client policy');
        }
      } catch (e) {
        if (e instanceof SCIMValidationError) throw e;
        // If URL parsing fails, fall back to existing validation
      }

      // Prepare request options
      const options = {
        method: method.toUpperCase(),
        headers: this.config.getHeaders()
      };

      // Add body for non-GET requests
      if (body && method.toUpperCase() !== 'GET') {
        options.body = JSON.stringify(body);
      }

      // Create request log entry
      const requestLog = createRequestLog(method, url, options);

      // Implement timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      try {
        // Make request with timeout
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
      
      // Parse response body
      let responseBody;
      let responseLog;
      const contentType = response.headers.get('content-type');
      
      try {
        // Handle empty responses (common for DELETE requests)
        const contentLength = response.headers.get('content-length');
        if (contentLength === '0' || response.status === 204) {
          responseBody = null;
        } else if (contentType && (contentType.includes('application/json') || contentType.includes('application/scim+json'))) {
          try {
            responseBody = await response.json();
          } catch (error) {
            // If JSON parsing fails, try as text
            responseBody = await response.text();
          }
        } else {
          responseBody = await response.text();
        }

        // Create response log entry
        responseLog = await createResponseLog(response, requestLog, responseBody);

        // Log the request/response pair
        requestLogger.log(requestLog, responseLog);

      } catch (parseError) {
        // If response parsing fails, still log the request with error info
        responseLog = await createResponseLog(response, requestLog, null);
        responseLog.error = parseError.message;
        responseLog.success = false;
        requestLogger.log(requestLog, responseLog);
        
        // Re-throw the parsing error
        throw parseError;
      }

      // Handle response
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = responseBody && typeof responseBody === 'object' ? responseBody : { detail: response.statusText };
        } catch (e) {
          errorData = { detail: response.statusText };
        }
        
        throw await SCIMResponseProcessor.processErrorResponse(errorData, response.status);
      }

      // Return response body (null for successful DELETE requests is fine)
      return responseBody;
      
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new SCIMNetworkError('Request timeout', 0, { timeout: this.config.timeout });
        }
        throw error;
      }
    });
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export default SCIMClient; 