// js/scim-client.js

import { LOCAL_CORS_PROXY, withCorsProxy } from './app.js';

export class SCIMClient {
  constructor() {
    this.endpoint = localStorage.getItem('scim_endpoint')?.replace(/\/$/, '') || '';
    this.apiKey = localStorage.getItem('scim_api_key') || '';
    this.useProxy = localStorage.getItem('use_cors_proxy') === 'true';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/scim+json',
      'Content-Type': 'application/scim+json'
    };
    this.discoveredEndpoints = null;
    this.schemas = null;
    this.resourceTypes = null;
  }

  // Discovery Methods
  async discoverEndpoints() {
    if (this.discoveredEndpoints) {
      return this.discoveredEndpoints;
    }

    try {
      console.log('SCIMClient.discoverEndpoints: Starting concurrent API discovery...');
      
      // Use Promise.all() for concurrent API calls instead of sequential
      const [spConfig, resourceTypes, schemas] = await Promise.all([
        this.getServiceProviderConfig(),
        this.getResourceTypes(),
        this.getSchemas()
      ]);
      
      console.log('SCIMClient.discoverEndpoints: All discovery calls completed concurrently');
      
      this.discoveredEndpoints = {
        serviceProviderConfig: spConfig,
        resourceTypes: resourceTypes,
        schemas: schemas
      };
      
      return this.discoveredEndpoints;
    } catch (error) {
      console.error('SCIMClient.discoverEndpoints: Failed to discover endpoints:', error);
      
      // Provide detailed error information for debugging
      const errorDetails = {
        message: error.message,
        type: error.name,
        timestamp: new Date().toISOString(),
        suggestion: 'Check server connectivity and API endpoint availability'
      };
      
      console.error('SCIMClient.discoverEndpoints: Error details:', errorDetails);
      
      // Return null to indicate discovery failure
      return null;
    }
  }

  async getServiceProviderConfig() {
    return await this._fetch('/ServiceProviderConfig');
  }

  async getResourceTypes() {
    return await this._fetch('/ResourceTypes');
  }

  async getSchemas() {
    return await this._fetch('/Schemas');
  }

  // User Methods
  async getUsers(params = {}) {
    return await this._fetch('/Users', params);
  }

  async getUser(userId) {
    return await this._fetch(`/Users/${userId}`);
  }

  async createUser(userData) {
    return await this._fetch('/Users', {}, 'POST', userData);
  }

  async updateUser(userId, userData) {
    return await this._fetch(`/Users/${userId}`, {}, 'PUT', userData);
  }

  async patchUser(userId, patchOps) {
    return await this._fetch(`/Users/${userId}`, {}, 'PATCH', patchOps);
  }

  async deleteUser(userId) {
    return await this._fetch(`/Users/${userId}`, {}, 'DELETE');
  }

  // Group Methods
  async getGroups(params = {}) {
    return await this._fetch('/Groups', params);
  }

  async getGroup(groupId) {
    return await this._fetch(`/Groups/${groupId}`);
  }

  async createGroup(groupData) {
    return await this._fetch('/Groups', {}, 'POST', groupData);
  }

  async updateGroup(groupId, groupData) {
    return await this._fetch(`/Groups/${groupId}`, {}, 'PUT', groupData);
  }

  async patchGroup(groupId, patchOps) {
    return await this._fetch(`/Groups/${groupId}`, {}, 'PATCH', patchOps);
  }

  async deleteGroup(groupId) {
    return await this._fetch(`/Groups/${groupId}`, {}, 'DELETE');
  }

  // Entitlement Methods
  async getEntitlements(params = {}) {
    return await this._fetch('/Entitlements', params);
  }

  async getEntitlement(entitlementId) {
    return await this._fetch(`/Entitlements/${entitlementId}`);
  }

  async createEntitlement(entitlementData) {
    return await this._fetch('/Entitlements', {}, 'POST', entitlementData);
  }

  async updateEntitlement(entitlementId, entitlementData) {
    return await this._fetch(`/Entitlements/${entitlementId}`, {}, 'PUT', entitlementData);
  }

  async patchEntitlement(entitlementId, patchOps) {
    return await this._fetch(`/Entitlements/${entitlementId}`, {}, 'PATCH', patchOps);
  }

  async deleteEntitlement(entitlementId) {
    return await this._fetch(`/Entitlements/${entitlementId}`, {}, 'DELETE');
  }

  // Role Methods
  async getRoles(params = {}) {
    return await this._fetch('/Roles', params);
  }

  async getRole(roleId) {
    return await this._fetch(`/Roles/${roleId}`);
  }

  async createRole(roleData) {
    return await this._fetch('/Roles', {}, 'POST', roleData);
  }

  async updateRole(roleId, roleData) {
    return await this._fetch(`/Roles/${roleId}`, {}, 'PUT', roleData);
  }

  async patchRole(roleId, patchOps) {
    return await this._fetch(`/Roles/${roleId}`, {}, 'PATCH', patchOps);
  }

  async deleteRole(roleId) {
    return await this._fetch(`/Roles/${roleId}`, {}, 'DELETE');
  }

  // Schema Validation
  async validateResource(resourceType, data) {
    try {
      const discovery = await this.discoverEndpoints();
      if (!discovery || !discovery.schemas.ok) {
        return { valid: true, warnings: ['Schema validation unavailable'] };
      }

      const schemas = discovery.schemas.data.Resources || [];
      const schema = schemas.find(s => s.id === resourceType);
      
      if (!schema) {
        return { valid: true, warnings: [`Schema for ${resourceType} not found`] };
      }

      // Basic validation - check required fields
      const requiredFields = schema.attributes?.filter(attr => attr.required) || [];
      const missingFields = requiredFields.filter(field => !data[field.name]);
      
      if (missingFields.length > 0) {
        return {
          valid: false,
          errors: [`Missing required fields: ${missingFields.map(f => f.name).join(', ')}`]
        };
      }

      return { valid: true };
    } catch (error) {
      console.warn('Schema validation failed:', error);
      return { valid: true, warnings: ['Schema validation failed'] };
    }
  }

  // Get available resource types
  async getAvailableResourceTypes() {
    try {
      const discovery = await this.discoverEndpoints();
      if (!discovery || !discovery.resourceTypes.ok) {
        return ['User', 'Group']; // Fallback to basic types
      }

      return discovery.resourceTypes.data.Resources?.map(rt => rt.name) || ['User', 'Group'];
    } catch (error) {
      console.warn('Failed to get resource types:', error);
      return ['User', 'Group']; // Fallback
    }
  }

  // Generic resource methods
  async getResources(resourceType, params = {}) {
    return await this._fetch(`/${resourceType}`, params);
  }

  async getResource(resourceType, resourceId) {
    return await this._fetch(`/${resourceType}/${resourceId}`);
  }

  async createResource(resourceType, data) {
    return await this._fetch(`/${resourceType}`, {}, 'POST', data);
  }

  async updateResource(resourceType, resourceId, data) {
    return await this._fetch(`/${resourceType}/${resourceId}`, {}, 'PUT', data);
  }

  async patchResource(resourceType, resourceId, patchOps) {
    return await this._fetch(`/${resourceType}/${resourceId}`, {}, 'PATCH', patchOps);
  }

  async deleteResource(resourceType, resourceId) {
    return await this._fetch(`/${resourceType}/${resourceId}`, {}, 'DELETE');
  }

  async _fetch(path, params = {}, method = 'GET', body = null) {
    // Always use the proxy if enabled
    let url = withCorsProxy(this.endpoint, this.useProxy);
    if (!url) {
      console.error('SCIMClient._fetch: No endpoint configured');
      return {
        ok: false,
        status: 0,
        data: {
          error: 'No SCIM endpoint configured',
          details: 'Please configure the SCIM endpoint in Settings'
        },
        headers: {},
        requestInfo: { url: 'N/A', method, headers: this.headers, body }
      };
    }
    
    url += path;
    if (params && Object.keys(params).length) {
      const usp = new URLSearchParams(params);
      url += '?' + usp.toString();
    }

    const requestInfo = {
      url,
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body, null, 2) : null,
      timestamp: new Date().toISOString()
    };

    console.log(`SCIMClient._fetch: Making ${method} request to ${url}`, requestInfo);

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const res = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      let data;
      let parseError = null;

      try {
        data = contentType.includes('json') ? await res.json() : await res.text();
      } catch (parseErr) {
        parseError = parseErr;
        console.error('SCIMClient._fetch: Failed to parse response', {
          contentType,
          status: res.status,
          statusText: res.statusText,
          parseError: parseErr.message
        });
        data = await res.text(); // Fallback to text
      }

      const responseInfo = {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        contentType,
        data,
        parseError: parseError?.message,
        requestInfo
      };

      if (!res.ok) {
        console.error('SCIMClient._fetch: HTTP error', responseInfo);
      } else {
        console.log('SCIMClient._fetch: Success', {
          status: res.status,
          contentType,
          dataSize: typeof data === 'string' ? data.length : JSON.stringify(data).length
        });
      }

      return responseInfo;

    } catch (e) {
      clearTimeout(timeoutId);
      
      let errorDetails = {
        message: e.message,
        name: e.name,
        stack: e.stack
      };

      // Handle specific error types with immediate, accurate feedback
      if (e.name === 'AbortError') {
        errorDetails = {
          ...errorDetails,
          type: 'TIMEOUT',
          message: 'Request timed out after 30 seconds',
          suggestion: 'Check network connectivity and server response time'
        };
              } else if (e.name === 'TypeError') {
        if (e.message.includes('fetch')) {
          errorDetails = {
            ...errorDetails,
            type: 'NETWORK_ERROR',
            message: 'Network request failed - fetch API not available',
            suggestion: 'Check if the CORS proxy is running (/proxy/) and the SCIM server is accessible'
          };
        } else if (e.message.includes('CORS')) {
          errorDetails = {
            ...errorDetails,
            type: 'CORS_ERROR',
            message: 'CORS policy blocked the request',
            suggestion: 'Enable the CORS proxy option in Settings'
          };
        } else {
          errorDetails = {
            ...errorDetails,
            type: 'TYPE_ERROR',
            message: `Type error: ${e.message}`,
            suggestion: 'Check the request parameters and URL format'
          };
        }
      } else if (e.name === 'ReferenceError') {
        errorDetails = {
          ...errorDetails,
          type: 'REFERENCE_ERROR',
          message: `Reference error: ${e.message}`,
          suggestion: 'This is likely a code error - check the browser console for details'
        };
      } else if (e.name === 'SyntaxError') {
        errorDetails = {
          ...errorDetails,
          type: 'SYNTAX_ERROR',
          message: `Syntax error: ${e.message}`,
          suggestion: 'Check the request body format and JSON syntax'
        };
      } else if (e.name === 'RangeError') {
        errorDetails = {
          ...errorDetails,
          type: 'RANGE_ERROR',
          message: `Range error: ${e.message}`,
          suggestion: 'Check URL length and request parameters'
        };
      } else if (e.message && e.message.includes('Failed to fetch')) {
        errorDetails = {
          ...errorDetails,
          type: 'NETWORK_CONNECTION_ERROR',
          message: 'Network connection failed',
          suggestion: 'Check if the CORS proxy is running (/proxy/) and the SCIM server is accessible'
        };
      } else if (e.message && e.message.includes('NetworkError')) {
        errorDetails = {
          ...errorDetails,
          type: 'NETWORK_ERROR',
          message: 'Network error occurred',
          suggestion: 'Check network connectivity and server availability'
        };
      } else {
        errorDetails = {
          ...errorDetails,
          type: 'UNKNOWN_ERROR',
          message: `Unknown error: ${e.message}`,
          suggestion: 'Check the browser console for additional details'
        };
      }

      console.error('SCIMClient._fetch: Request failed', {
        error: errorDetails,
        requestInfo,
        originalError: e
      });

      return {
        ok: false,
        status: 0,
        data: {
          error: errorDetails.message,
          type: errorDetails.type,
          suggestion: errorDetails.suggestion,
          details: errorDetails,
          originalError: {
            name: e.name,
            message: e.message,
            stack: e.stack
          }
        },
        headers: {},
        requestInfo
      };
    }
  }
} 