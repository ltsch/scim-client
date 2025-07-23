/**
 * API utilities for SCIM client
 */

/**
 * Parse error response from API
 * @param {Response} response - Fetch response object
 * @returns {Promise<string>} Error message
 */
const parseErrorResponse = async (response) => {
  try {
    const errorData = await response.json();
    return errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
};

function joinUrl(base, path) {
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

/**
 * Make a SCIM API request
 * @param {string} endpoint - Base SCIM endpoint
 * @param {string} path - API path (e.g., '/Users', '/Groups')
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} options.body - Request body for POST/PUT
 * @param {string} options.apiKey - API key for authentication
 * @param {boolean} options.useCorsProxy - Whether to use CORS proxy
 * @param {string} options.corsProxyUrl - CORS proxy URL
 * @returns {Promise<Object>} Response object with data and metadata
 */
export const makeScimRequest = async (endpoint, path, options = {}) => {
  const {
    method = 'GET',
    body = null,
    apiKey = '',
    useCorsProxy = true,
    corsProxyUrl = '/proxy'
  } = options;

  // Debug log for endpoint and path
  console.log('[makeScimRequest] endpoint:', endpoint, 'path:', path, 'options:', options);

  const url = joinUrl(endpoint, path);
  const requestUrl = useCorsProxy ? `${corsProxyUrl}?url=${encodeURIComponent(url)}` : url;

  // Debug log for final request URL
  console.log('[makeScimRequest] Final requestUrl:', requestUrl);

  const headers = {
    'Content-Type': 'application/scim+json',
    'Accept': 'application/scim+json'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const requestOptions = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  };

  const startTime = Date.now();
  
  try {
    const response = await fetch(requestUrl, requestOptions);
    const endTime = Date.now();
    
    const responseData = await response.text();
    let parsedData = null;
    
    try {
      parsedData = responseData ? JSON.parse(responseData) : null;
    } catch (parseError) {
      console.warn('Response is not valid JSON:', responseData);
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: parsedData,
      rawResponse: responseData,
      headers: Object.fromEntries(response.headers.entries()),
      requestUrl,
      method,
      requestBody: body,
      responseTime: endTime - startTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      requestUrl,
      method,
      requestBody: body,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Get SCIM resources (Users, Groups, etc.)
 * @param {string} endpoint - Base SCIM endpoint
 * @param {string} resourceType - Resource type ('Users', 'Groups', 'Schemas')
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Response object
 */
export const getResources = (endpoint, resourceType, config) => {
  return makeScimRequest(endpoint, `/${resourceType}`, {
    method: 'GET',
    apiKey: config.apiKey,
    useCorsProxy: config.useCorsProxy,
    corsProxyUrl: config.corsProxyUrl
  });
};

/**
 * Get a specific SCIM resource by ID
 * @param {string} endpoint - Base SCIM endpoint
 * @param {string} resourceType - Resource type ('Users', 'Groups', 'Schemas')
 * @param {string} id - Resource ID
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Response object
 */
export const getResourceById = (endpoint, resourceType, id, config) => {
  return makeScimRequest(endpoint, `/${resourceType}/${id}`, {
    method: 'GET',
    apiKey: config.apiKey,
    useCorsProxy: config.useCorsProxy,
    corsProxyUrl: config.corsProxyUrl
  });
};

/**
 * Create a new SCIM resource
 * @param {string} endpoint - Base SCIM endpoint
 * @param {string} resourceType - Resource type ('Users', 'Groups')
 * @param {Object} resourceData - Resource data to create
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Response object
 */
export const createResource = (endpoint, resourceType, resourceData, config) => {
  return makeScimRequest(endpoint, `/${resourceType}`, {
    method: 'POST',
    body: resourceData,
    apiKey: config.apiKey,
    useCorsProxy: config.useCorsProxy,
    corsProxyUrl: config.corsProxyUrl
  });
};

/**
 * Update a SCIM resource
 * @param {string} endpoint - Base SCIM endpoint
 * @param {string} resourceType - Resource type ('Users', 'Groups')
 * @param {string} id - Resource ID
 * @param {Object} resourceData - Updated resource data
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Response object
 */
export const updateResource = (endpoint, resourceType, id, resourceData, config) => {
  return makeScimRequest(endpoint, `/${resourceType}/${id}`, {
    method: 'PUT',
    body: resourceData,
    apiKey: config.apiKey,
    useCorsProxy: config.useCorsProxy,
    corsProxyUrl: config.corsProxyUrl
  });
};

/**
 * Delete a SCIM resource
 * @param {string} endpoint - Base SCIM endpoint
 * @param {string} resourceType - Resource type ('Users', 'Groups')
 * @param {string} id - Resource ID
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Response object
 */
export const deleteResource = (endpoint, resourceType, id, config) => {
  return makeScimRequest(endpoint, `/${resourceType}/${id}`, {
    method: 'DELETE',
    apiKey: config.apiKey,
    useCorsProxy: config.useCorsProxy,
    corsProxyUrl: config.corsProxyUrl
  });
}; 