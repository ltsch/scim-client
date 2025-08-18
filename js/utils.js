// js/utils.js - Shared Utility Functions

import { UI_CONFIG } from './config.js';
import { renderJSON } from './ui-components.js';

// ============================================================================
// LOGGING SYSTEM
// ============================================================================

/**
 * Log levels
 */
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Logger class for consistent logging
 */
export class Logger {
  constructor(component = 'App', level = LOG_LEVELS.INFO) {
    this.component = component;
    this.level = level;
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  error(message, error = null) {
    if (this.level >= LOG_LEVELS.ERROR) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [ERROR] [${this.component}] ${message}`;
      console.error(logMessage, error || '');
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} data - Additional data
   */
  warn(message, data = null) {
    if (this.level >= LOG_LEVELS.WARN) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [WARN] [${this.component}] ${message}`;
      console.warn(logMessage, data || '');
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} data - Additional data
   */
  info(message, data = null) {
    if (this.level >= LOG_LEVELS.INFO) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [INFO] [${this.component}] ${message}`;
      console.log(logMessage, data || '');
    }
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} data - Additional data
   */
  debug(message, data = null) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [DEBUG] [${this.component}] ${message}`;
      console.log(logMessage, data || '');
    }
  }
}

// Global logger instance
export const logger = new Logger('SCIM-Client', 
  typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO
);

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html) {
  if (typeof html !== 'string') return '';
  
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '');
}

/**
 * Safely set innerHTML with sanitization
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML content
 */
export function setInnerHTML(element, html) {
  if (!element || !(element instanceof Element)) {
    console.warn('setInnerHTML: Invalid element provided');
    return;
  }
  
  try {
    element.innerHTML = sanitizeHTML(html);
  } catch (error) {
    console.error('setInnerHTML: Failed to set innerHTML', error);
    // Fallback to textContent for safety
    element.textContent = html;
  }
}

// ============================================================================
// MEMORY MANAGEMENT
// ============================================================================

/**
 * Event listener manager to prevent memory leaks
 */
export class EventListenerManager {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Add event listener with tracking
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   * @param {string} id - Unique identifier for this listener
   */
  addListener(element, event, handler, options = {}, id = null) {
    if (!element || !(element instanceof Element)) {
      console.warn('addListener: Invalid element provided');
      return;
    }

    const listenerId = id || `${element.id || 'unknown'}-${event}-${Date.now()}`;
    
    try {
      element.addEventListener(event, handler, options);
      this.listeners.set(listenerId, { element, event, handler, options });
    } catch (error) {
      console.error('addListener: Failed to add event listener', error);
    }
  }

  /**
   * Remove event listener by ID
   * @param {string} id - Listener ID
   */
  removeListener(id) {
    const listener = this.listeners.get(id);
    if (listener) {
      try {
        listener.element.removeEventListener(listener.event, listener.handler, listener.options);
        this.listeners.delete(id);
      } catch (error) {
        console.error('removeListener: Failed to remove event listener', error);
      }
    }
  }

  /**
   * Remove all listeners for an element
   * @param {HTMLElement} element - Target element
   */
  removeAllForElement(element) {
    for (const [id, listener] of this.listeners.entries()) {
      if (listener.element === element) {
        this.removeListener(id);
      }
    }
  }

  /**
   * Remove all tracked listeners
   */
  removeAll() {
    for (const id of this.listeners.keys()) {
      this.removeListener(id);
    }
  }

  /**
   * Get listener count
   * @returns {number} Number of tracked listeners
   */
  getListenerCount() {
    return this.listeners.size;
  }
}

// Global event listener manager
export const eventManager = new EventListenerManager();

// ============================================================================
// DOM UTILITIES
// ============================================================================

/**
 * Safely escape HTML to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

/**
 * Create a DOM element with attributes
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string} content - Element content
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else if (key === 'innerHTML') {
      setInnerHTML(element, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Set content
  if (content) {
    element.textContent = content;
  }
  
  return element;
}

/**
 * Clear an element's content safely
 * @param {HTMLElement} element - Element to clear
 */
export function clearElement(element) {
  if (!element || !(element instanceof Element)) return;
  element.innerHTML = '';
}

/**
 * Add event listener with error handling
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {Object} options - Event options
 */
export function addEventListener(element, event, handler, options = {}) {
  if (!element || !(element instanceof Element)) {
    console.warn('addEventListener: Invalid element provided');
    return;
  }
  
  try {
    element.addEventListener(event, handler, options);
  } catch (error) {
    console.error('addEventListener: Failed to add event listener', error);
  }
}

/**
 * Remove event listener safely
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {Object} options - Event options
 */
export function removeEventListener(element, event, handler, options = {}) {
  if (!element || !(element instanceof Element)) return;
  
  try {
    element.removeEventListener(event, handler, options);
  } catch (error) {
    console.error('removeEventListener: Failed to remove event listener', error);
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate that a value is not null/undefined
 * @param {*} value - Value to validate
 * @param {string} name - Name for error message
 * @throws {Error} If validation fails
 */
export function validateRequired(value, name) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${name} is required. Please provide a value for this field.`);
  }
}

/**
 * Validate that a value is a valid DOM element
 * @param {*} element - Element to validate
 * @param {string} name - Name for error message
 * @throws {Error} If validation fails
 */
export function validateElement(element, name) {
  if (!element || !(element instanceof Element)) {
    throw new Error(`${name} must be a valid DOM element. Received: ${typeof element}${element ? ` (${element.constructor.name})` : ''}`);
  }
}

/**
 * Validate that a value is a function
 * @param {*} value - Value to validate
 * @param {string} name - Name for error message
 * @throws {Error} If validation fails
 */
export function validateFunction(value, name) {
  if (typeof value !== 'function') {
    throw new Error(`${name} must be a function. Received: ${typeof value}${value ? ` (${value.constructor.name})` : ''}`);
  }
}

/**
 * Validate form data against schema attributes
 * @param {Object} formData - Form data to validate
 * @param {Array} attributes - Schema attributes
 * @throws {Error} If validation fails
 */
export function validateFormData(formData, attributes) {
  if (!formData || typeof formData !== 'object') {
    throw new Error(`Form data must be an object. Received: ${typeof formData}${formData ? ` (${formData.constructor.name})` : ''}`);
  }
  
  if (!Array.isArray(attributes)) {
    throw new Error(`Attributes must be an array. Received: ${typeof attributes}${attributes ? ` (${attributes.constructor.name})` : ''}`);
  }
  
  // Check required fields
  attributes.forEach(attr => {
    if (attr.required && (!formData[attr.name] || formData[attr.name] === '')) {
      throw new Error(`${attr.name} is required. Please provide a value for this field.`);
    }
  });
  
  // Validate field types
  attributes.forEach(attr => {
    const value = formData[attr.name];
    if (value !== undefined && value !== null && value !== '') {
      validateFieldType(value, attr);
    }
  });
}

/**
 * Validate field value against its type
 * @param {*} value - Field value
 * @param {Object} attr - Field attribute definition
 * @throws {Error} If validation fails
 */
export function validateFieldType(value, attr) {
  switch (attr.type) {
    case 'string':
      if (typeof value !== 'string') {
        throw new Error(`${attr.name} must be a string. Received: ${typeof value} (${value})`);
      }
      if (attr.multiValued && !Array.isArray(value)) {
        throw new Error(`${attr.name} must be an array of strings. Received: ${typeof value} (${value})`);
      }
      break;
      
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error(`${attr.name} must be a boolean. Received: ${typeof value} (${value})`);
      }
      break;
      
    case 'integer':
    case 'decimal':
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`${attr.name} must be a number. Received: ${typeof value} (${value})`);
      }
      break;
      
    default:
      // Unknown type, skip validation
      break;
  }
}

/**
 * Debug and validate complex fields for edit forms
 * @param {Array} complexFields - Array of complex field names
 * @param {Object} data - The resource data (user, group, role, entitlement)
 * @param {string} resourceType - Type of resource for logging
 * @returns {Array} Validated complex field names
 */
export function debugComplexFields(complexFields, data, resourceType) {
  console.log(`Complex fields found for ${resourceType}:`, complexFields);
  console.log(`${resourceType} data keys:`, Object.keys(data));
  
  return complexFields.filter(fieldName => {
    console.log(`Processing field:`, fieldName, 'Type:', typeof fieldName, 'Value:', data[fieldName]);
    
    // Ensure fieldName is a string
    if (typeof fieldName !== 'string') {
      console.error('Field name is not a string:', fieldName);
      return false;
    }
    
    return true;
  });
}

// ============================================================================
// DATA UTILITIES
// ============================================================================

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}

/**
 * Merge objects deeply
 * @param {Object} target - Target object
 * @param {...Object} sources - Source objects
 * @returns {Object} Merged object
 */
export function deepMerge(target, ...sources) {
  if (!target || typeof target !== 'object') return target;
  
  sources.forEach(source => {
    if (!source || typeof source !== 'object') return;
    
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    });
  });
  
  return target;
}

/**
 * Get nested object property safely
 * @param {Object} obj - Object to search
 * @param {string} path - Property path (e.g., 'user.name')
 * @param {*} defaultValue - Default value if property not found
 * @returns {*} Property value or default
 */
export function getNestedProperty(obj, path, defaultValue = undefined) {
  if (!obj || typeof obj !== 'object') return defaultValue;
  
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj) ?? defaultValue;
}

/**
 * Set nested object property safely
 * @param {Object} obj - Object to modify
 * @param {string} path - Property path (e.g., 'user.name')
 * @param {*} value - Value to set
 */
export function setNestedProperty(obj, path, value) {
  if (!obj || typeof obj !== 'object') return;
  
  const keys = path.split('.');
  const lastKey = keys.pop();
  
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  
  target[lastKey] = value;
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Create a standardized error object
 * @param {string} message - Error message
 * @param {string} type - Error type
 * @param {Object} details - Additional error details
 * @returns {Object} Standardized error object
 */
export function createError(message, type = 'unknown', details = {}) {
  return {
    message: String(message),
    type: type,
    details: details,
    timestamp: new Date().toISOString(),
    stack: new Error().stack
  };
}

/**
 * Parse error object for display
 * @param {*} error - Error to parse
 * @returns {Object} Parsed error information
 */
export function parseError(error) {
  let errorMessage = UI_CONFIG.MESSAGES.ERROR_UNKNOWN;
  let errorType = UI_CONFIG.ERROR_TYPES.UNKNOWN;
  let errorDetails = '';
  let errorStack = '';
  
  if (error && typeof error === 'object') {
    // Extract message
    if (error.message) {
      errorMessage = error.message;
    } else if (error.error) {
      errorMessage = error.error;
    } else if (error.detail) {
      errorMessage = error.detail;
    }
    
    // Extract type
    if (error.type) {
      errorType = error.type;
    } else if (error.name) {
      errorType = error.name;
    }
    
    // Extract details
    if (error.details) {
      errorDetails = typeof error.details === 'object' 
        ? JSON.stringify(error.details, null, 2)
        : String(error.details);
    }
    
    // Extract stack
    if (error.stack) {
      errorStack = error.stack;
    }
  } else if (error) {
    errorMessage = String(error);
  }
  
  return {
    message: errorMessage,
    type: errorType,
    details: errorDetails,
    stack: errorStack
  };
}

/**
 * Handle async operations with error catching
 * @param {Function} asyncFn - Async function to execute
 * @param {Function} errorHandler - Error handler function
 * @returns {Promise} Promise that resolves with result or rejects with handled error
 */
export async function safeAsync(asyncFn, errorHandler = null) {
  try {
    return await asyncFn();
  } catch (error) {
    const parsedError = parseError(error);
    
    if (errorHandler && typeof errorHandler === 'function') {
      errorHandler(parsedError);
    } else {
      console.error('Unhandled async error:', parsedError);
    }
    
    throw parsedError;
  }
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

/**
 * Save data to localStorage safely
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
export function saveToStorage(key, value) {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    // If quota exceeded, try to clear some storage and retry
    if (error.name === 'QuotaExceededError') {
      try {
        // Clear old logs first
        localStorage.removeItem('scim_request_logs');
        // Try again
        localStorage.setItem(key, serialized);
      } catch (retryError) {
        console.error('Failed to save even after clearing storage:', retryError);
      }
    }
  }
}

/**
 * Load data from localStorage safely
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Stored value or default
 */
export function loadFromStorage(key, defaultValue = null) {
  try {
    const serialized = localStorage.getItem(key);
    if (serialized === null) return defaultValue;
    return JSON.parse(serialized);
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
}

// =========================================================================
// ALLOWED TARGETS (Shared allowlist for SPA and Proxy)
// =========================================================================

/**
 * Load allowed targets from baked JSON file in the web root
 * @returns {Promise<Array<string>>} Array of allowed patterns
 */
export async function loadAllowedTargets() {
  try {
    const res = await fetch('allowed-targets.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.allowed_targets) ? data.allowed_targets : [];
  } catch (e) {
    return [];
  }
}

/**
 * Check if hostname matches a list of patterns (exact, wildcard, CIDR for IP addresses)
 * Note: CIDR evaluation is now supported in frontend for IP addresses
 * @param {string} hostname
 * @param {Array<string>} patterns
 */
export function isHostAllowedByPatterns(hostname, patterns) {
  if (!hostname || !Array.isArray(patterns) || patterns.length === 0) return false;
  const h = String(hostname).toLowerCase();
  
  for (const raw of patterns) {
    const pat = String(raw).toLowerCase().trim();
    if (!pat) continue;
    
    // Handle CIDR patterns for IP addresses
    if (pat.includes('/')) {
      if (isIPInCIDR(h, pat)) return true;
      continue;
    }
    
    // Handle wildcard patterns
    if (pat.startsWith('*.')) {
      const base = pat.slice(2);
      if (h === base || h.endsWith('.' + base)) return true;
    } else if (h === pat) {
      return true;
    }
  }
  return false;
}

/**
 * Check if IP address is within CIDR range
 * @param {string} ip - IP address to check
 * @param {string} cidr - CIDR notation (e.g., "192.168.0.0/16")
 * @returns {boolean} True if IP is in CIDR range
 */
function isIPInCIDR(ip, cidr) {
  try {
    // Simple CIDR validation for common private ranges
    const [network, bits] = cidr.split('/');
    const bitCount = parseInt(bits);
    
    // Convert IP to numeric representation
    const ipParts = ip.split('.').map(Number);
    const networkParts = network.split('.').map(Number);
    
    if (ipParts.length !== 4 || networkParts.length !== 4) return false;
    
    // Calculate network mask
    const mask = (0xFFFFFFFF << (32 - bitCount)) >>> 0;
    
    // Convert IPs to 32-bit integers
    const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const networkNum = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];
    
    // Check if IP is in network range
    return (ipNum & mask) === (networkNum & mask);
  } catch (error) {
    console.warn('CIDR validation error:', error);
    return false;
  }
}

/**
 * Remove data from localStorage safely
 * @param {string} key - Storage key
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (typeof str !== 'string') return String(str);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert camelCase to kebab-case
 * @param {string} str - String to convert
 * @returns {string} Kebab-case string
 */
export function camelToKebab(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 * @param {string} str - String to convert
 * @returns {string} Camel-case string
 */
export function kebabToCamel(str) {
  if (typeof str !== 'string') return String(str);
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated
 * @returns {string} Truncated string
 */
export function truncate(str, maxLength, suffix = '...') {
  if (typeof str !== 'string') return String(str);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Remove duplicates from array
 * @param {Array} array - Array to deduplicate
 * @returns {Array} Array without duplicates
 */
export function unique(array) {
  if (!Array.isArray(array)) return [];
  return [...new Set(array)];
}

/**
 * Group array items by key
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key or function to group by
 * @returns {Object} Grouped object
 */
export function groupBy(array, key) {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
    return groups;
  }, {});
}

/**
 * Sort array by multiple criteria
 * @param {Array} array - Array to sort
 * @param {Array} criteria - Array of sort criteria objects
 * @returns {Array} Sorted array
 */
export function sortBy(array, criteria) {
  if (!Array.isArray(array)) return [];
  
  return array.sort((a, b) => {
    for (const criterion of criteria) {
      const { key, order = 'asc' } = criterion;
      const aVal = getNestedProperty(a, key);
      const bVal = getNestedProperty(b, key);
      
      if (aVal < bVal) return order === 'desc' ? 1 : -1;
      if (aVal > bVal) return order === 'desc' ? -1 : 1;
    }
    return 0;
  });
}

// ============================================================================
// DEBOUNCE UTILITY
// ============================================================================

/**
 * Create a debounced function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
  let timeoutId;
  
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Create a minimal SCIM fallback schema for a resource type
 * @param {string} resourceType - The resource type (User, Group, Role, Entitlement)
 * @returns {Object} Minimal fallback schema
 */
export function createFallbackSchema(resourceType) {
  const resourceConfig = {
    User: {
      id: RESOURCE_CONFIG.USER.SCHEMA,
      name: RESOURCE_CONFIG.USER.TYPE,
      attributes: [
        {
          name: 'userName',
          type: 'string',
          required: true,
          description: 'Unique identifier for the User (required by SCIM 2.0)'
        },
        {
          name: 'displayName',
          type: 'string',
          required: false,
          description: 'The name of the User, suitable for display to end-users'
        },
        {
          name: 'active',
          type: 'boolean',
          required: false,
          description: 'A Boolean value indicating the User\'s administrative status'
        }
      ]
    },
    Group: {
      id: RESOURCE_CONFIG.GROUP.SCHEMA,
      name: RESOURCE_CONFIG.GROUP.TYPE,
      attributes: [
        {
          name: 'displayName',
          type: 'string',
          required: true,
          description: 'The name of the Group, suitable for display to end-users (required by SCIM 2.0)'
        },
        {
          name: 'description',
          type: 'string',
          required: false,
          description: 'A human-readable description of the Group'
        }
      ]
    },
    Role: {
      id: RESOURCE_CONFIG.ROLE.SCHEMA,
      name: RESOURCE_CONFIG.ROLE.TYPE,
      attributes: [
        {
          name: 'displayName',
          type: 'string',
          required: true,
          description: 'The name of the Role, suitable for display to end-users (required by SCIM 2.0)'
        },
        {
          name: 'description',
          type: 'string',
          required: false,
          description: 'A human-readable description of the Role'
        }
      ]
    },
    Entitlement: {
      id: RESOURCE_CONFIG.ENTITLEMENT.SCHEMA,
      name: RESOURCE_CONFIG.ENTITLEMENT.TYPE,
      attributes: [
        {
          name: 'displayName',
          type: 'string',
          required: true,
          description: 'The name of the Entitlement, suitable for display to end-users (required by SCIM 2.0)'
        },
        {
          name: 'description',
          type: 'string',
          required: false,
          description: 'A human-readable description of the Entitlement'
        }
      ]
    }
  };

  const config = resourceConfig[resourceType];
  if (!config) {
    throw new Error(`Unknown resource type: ${resourceType}. Supported types: ${Object.keys(resourceConfig).join(', ')}`);
  }

  return {
    id: config.id,
    name: config.name,
    description: `Minimal fallback schema - server schema unavailable`,
    attributes: config.attributes
  };
}

/**
 * Handle missing schema with fallback and warning
 * @param {Object} schema - The schema from server (may be null)
 * @param {string} resourceType - The resource type
 * @param {HTMLElement} container - Container to show warning in
 * @returns {Object} The schema to use (either server schema or fallback)
 */
export function handleMissingSchema(schema, resourceType, container) {
  if (schema) {
    return schema;
  }

  console.warn('SCIM Schema not available from server. Using minimal fallback schema.');
  console.warn('This may not comply with server requirements. Check server documentation.');

  const fallbackSchema = createFallbackSchema(resourceType);

  // Show warning to user
  setTimeout(() => {
    const warning = createElement('div', {
      className: 'warning-message',
      innerHTML: `
        <strong>Warning:</strong> Server schema not available. 
        Using minimal fallback schema. 
        <br>This may not comply with server requirements. 
        <br>Check server documentation for required attributes.
      `
    });
    container.appendChild(warning);
  }, 100);

  return fallbackSchema;
}

/**
 * Fetch schema for a specific resource type
 * @param {Object} client - SCIM client instance
 * @param {string} resourceType - Resource type (User, Group, etc.)
 * @returns {Promise<Object|null>} Schema object or null if not found
 */
export async function fetchSchemaForResource(client, resourceType) {
  try {
    const schemas = await client.getSchemas();
    
    // Try to find schema by common patterns
    const schema = schemas.find(schema => {
      // Check by schema ID (most reliable)
      if (schema.id === `urn:ietf:params:scim:schemas:core:2.0:${resourceType}`) {
        return true;
      }
      
      // Check by name
      if (schema.name === resourceType) {
        return true;
      }
      
      // Check by resourceType property
      if (schema.resourceType === resourceType) {
        return true;
      }
      
      return false;
    });
    
    return schema || null;
  } catch (error) {
    console.warn(`Failed to fetch ${resourceType} schema:`, error);
    return null;
  }
}

/**
 * Format a value for display in readonly fields
 * @param {*} value - The value to format
 * @returns {string} Formatted value for display
 */
export function formatReadonlyValue(value) {
  if (value === undefined || value === null) {
    return '';
  } else if (typeof value === 'object') {
    // For objects, show a formatted JSON representation
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return '[Complex Object]';
    }
  } else {
    return String(value);
  }
}

/**
 * Safely render JSON data, handling undefined/null values
 * @param {HTMLElement} container - Container element
 * @param {*} data - Data to render
 * @param {string} emptyMessage - Message to show when data is empty
 */
export function safeRenderJSON(container, data, emptyMessage = '(empty)') {
  if (data !== undefined && data !== null) {
    renderJSON(container, data);
  } else {
    container.innerHTML = `<span class="${UI_CONFIG.CLASSES.READONLY_VALUE}">${emptyMessage}</span>`;
  }
}

// ============================================================================
// REQUEST/RESPONSE LOGGING SYSTEM
// ============================================================================

/**
 * Request/Response logging system for debugging
 */
export class RequestResponseLogger {
  constructor() {
    this.logs = [];
    this.maxEntries = 10; // Reduced to prevent localStorage quota issues
    this.enabled = true;
    this.loadFromStorage();
  }

  /**
   * Log a request/response pair
   * @param {Object} request - Request information
   * @param {Object} response - Response information
   * @param {Object} options - Logging options
   */
  log(request, response, options = {}) {
    if (!this.enabled) return;

    const logEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      status: response.status,
      statusText: response.statusText,
      duration: response.duration,
      requestSize: request.size,
      responseSize: response.size,
      requestHeaders: this.sanitizeHeaders(request.headers),
      responseHeaders: this.sanitizeHeaders(response.headers),
      requestBody: request.body,
      responseBody: response.body,
      error: response.error,
      scimError: response.scimError,
      success: response.status >= 200 && response.status < 300
    };

    this.logs.unshift(logEntry);
    
    // Keep only the latest entries
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(0, this.maxEntries);
    }

    this.saveToStorage();
    this.notifyListeners(logEntry);
  }



  /**
   * Generate unique log entry ID
   * @returns {string} Unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Sanitize headers to remove sensitive information
   * @param {Object} headers - Headers object
   * @returns {Object} Sanitized headers
   */
  sanitizeHeaders(headers) {
    if (!headers) return {};
    
    const sanitized = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    Object.entries(headers).forEach(([key, value]) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  /**
   * Get all logs
   * @returns {Array} Log entries
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Get logs filtered by criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered log entries
   */
  getFilteredLogs(filters = {}) {
    return this.logs.filter(log => {
      if (filters.method && log.method !== filters.method) return false;
      if (filters.status && log.status !== filters.status) return false;
      if (filters.success !== undefined && log.success !== filters.success) return false;
      if (filters.url && !log.url.includes(filters.url)) return false;
      if (filters.error && !log.error) return false;
      return true;
    });
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.saveToStorage();
  }



  /**
   * Export logs as JSON
   * @returns {string} JSON string
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Save logs to storage
   */
  saveToStorage() {
    try {
      saveToStorage('scim_request_logs', this.logs);
    } catch (error) {
      console.warn('Failed to save request logs:', error);
                    // If quota exceeded, just disable logging temporarily
       if (error.name === 'QuotaExceededError') {
         console.warn('localStorage quota exceeded, disabling request logging temporarily');
         this.enabled = false;
         setTimeout(() => {
           this.enabled = true;
         }, 60000); // Re-enable after 1 minute
       }
    }
  }

  /**
   * Load logs from storage
   */
  loadFromStorage() {
    try {
      const stored = loadFromStorage('scim_request_logs', []);
      this.logs = Array.isArray(stored) ? stored : [];
    } catch (error) {
      console.warn('Failed to load request logs:', error);
      this.logs = [];
    }
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    if (this.logs.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        successRate: 0,
        errorRate: 0
      };
    }

    const successful = this.logs.filter(log => log.success);
    const errors = this.logs.filter(log => !log.success);
    const responseTimes = this.logs.map(log => log.duration).filter(time => time !== undefined);

    return {
      totalRequests: this.logs.length,
      successfulRequests: successful.length,
      errorRequests: errors.length,
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      successRate: (successful.length / this.logs.length) * 100,
      errorRate: (errors.length / this.logs.length) * 100,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0
    };
  }

  /**
   * Event listeners for log updates
   */
  listeners = [];

  /**
   * Add event listener
   * @param {Function} listener - Event listener
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   * @param {Function} listener - Event listener
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify listeners of new log entry
   * @param {Object} logEntry - Log entry
   */
  notifyListeners(logEntry) {
    this.listeners.forEach(listener => {
      try {
        listener(logEntry);
      } catch (error) {
        console.error('Error in request log listener:', error);
      }
    });
  }
}

// Global logger instance
export const requestLogger = new RequestResponseLogger();

/**
 * Create a request log entry
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @returns {Object} Request log entry
 */
export function createRequestLog(method, url, options = {}) {
  const startTime = Date.now();
  
  return {
    method: method.toUpperCase(),
    url,
    headers: options.headers || {},
    body: options.body,
    size: options.body ? JSON.stringify(options.body).length : 0,
    startTime
  };
}

/**
 * Create a response log entry
 * @param {Response} response - Fetch response
 * @param {Object} requestLog - Request log entry
 * @param {*} responseBody - Response body
 * @returns {Object} Response log entry
 */
export async function createResponseLog(response, requestLog, responseBody) {
  const endTime = Date.now();
  const duration = endTime - requestLog.startTime;
  
  let body = responseBody;
  let size = 0;
  
  if (responseBody) {
    if (typeof responseBody === 'string') {
      size = responseBody.length;
    } else if (typeof responseBody === 'object') {
      body = responseBody;
      size = JSON.stringify(responseBody).length;
    }
  }

  const responseLog = {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    body,
    size,
    duration,
    error: !response.ok ? response.statusText : null,
    scimError: null
  };

  // Parse SCIM error if present
  if (!response.ok && responseBody && typeof responseBody === 'object') {
    responseLog.scimError = await parseSCIMError(responseBody, response.status);
  }

  return responseLog;
}

// ============================================================================
// SCIM ERROR PARSING
// ============================================================================

/**
 * Parse SCIM error response with RFC context
 * @param {Object} errorResponse - Error response object
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Parsed SCIM error
 */
export async function parseSCIMError(errorResponse, statusCode) {
  const { SCIM_CONFIG } = await import('./config.js');
  
  let scimCode = null;
  let scimType = null;
  let detail = null;
  let rfcContext = null;

  // Extract SCIM error information
  if (errorResponse && typeof errorResponse === 'object') {
    scimCode = errorResponse.scimType || errorResponse.scimCode;
    scimType = errorResponse.scimType;
    detail = errorResponse.detail || errorResponse.message || errorResponse.error;
  }

  // If no SCIM code, try to infer from HTTP status
  if (!scimCode && statusCode) {
    const statusMapping = SCIM_CONFIG.HTTP_STATUS_MAPPING[statusCode];
    if (statusMapping) {
      scimCode = statusMapping.scimCode;
    }
  }

  // Get RFC context
  if (scimCode) {
    const errorCodeEntry = Object.values(SCIM_CONFIG.ERROR_CODES)
      .find(code => code.code === scimCode);
    
    if (errorCodeEntry) {
      rfcContext = {
        section: errorCodeEntry.rfc,
        description: errorCodeEntry.description,
        solution: errorCodeEntry.solution
      };
    }
  }

  // Fallback to HTTP status context
  if (!rfcContext && statusCode) {
    const statusMapping = SCIM_CONFIG.HTTP_STATUS_MAPPING[statusCode];
    if (statusMapping) {
      rfcContext = {
        section: `HTTP ${statusCode}`,
        description: statusMapping.description,
        solution: `Check: ${statusMapping.commonCauses.join(', ')}`
      };
    }
  }

  return {
    scimCode,
    scimType,
    detail,
    statusCode,
    rfcContext,
    rawError: errorResponse
  };
}

/**
 * Dynamically detect complex fields that should be rendered as JSON
 * @param {Object} data - The resource data (user, group, role, entitlement)
 * @param {Array} excludeFields - Fields to exclude from complex detection
 * @returns {Array} Array of field names that are complex objects
 */
export function detectComplexFields(data, excludeFields = []) {
  return Object.keys(data).filter(fieldName => {
    const value = data[fieldName];
    
    // Skip excluded fields
    if (excludeFields.includes(fieldName)) return false;
    if (fieldName === 'schemas') return false;
    
    // Check if the value is a complex object (array or object)
    return value !== null && 
           value !== undefined && 
           (Array.isArray(value) || (typeof value === 'object' && !(value instanceof Date)));
  });
}

/**
 * Get readonly fields for a resource, excluding complex fields
 * @param {Object} data - Resource data
 * @param {Array} serverAssignedFields - Fields that are server-assigned
 * @param {Array} systemFields - System fields to exclude
 * @returns {Array} Readonly fields
 */
export function getReadonlyFields(data, serverAssignedFields = [], systemFields = []) {
  const readonlyFields = [];
  
  // Always include server-assigned fields
  serverAssignedFields.forEach(field => {
    if (data[field] !== undefined && data[field] !== null) {
      readonlyFields.push(field);
    }
  });
  
  // Get complex fields to exclude them from readonly fields
  const complexFields = detectComplexFields(data);
  
  // Include other fields that are not editable and not complex
  Object.keys(data).forEach(key => {
    if (!systemFields.includes(key) && 
        !serverAssignedFields.includes(key) &&
        !complexFields.includes(key) &&
        key !== 'schemas' &&
        !readonlyFields.includes(key)) {
      readonlyFields.push(key);
    }
  });
  
  return readonlyFields;
}

/**
 * Get editable attributes from schema
 * @param {Object} schema - Schema object
 * @param {Array} systemFields - System fields to exclude
 * @returns {Array} Editable attributes
 */
export function getEditableAttributes(schema, systemFields = []) {
  if (!schema || !Array.isArray(schema.attributes)) return [];
  
  return schema.attributes.filter(attr => {
    // Skip system fields
    if (systemFields.includes(attr.name)) return false;
    if (attr.name === 'schemas') return false;
    
    // Include fields that are not explicitly read-only
    if (attr.readOnly === true) return false;
    if (attr.mutability === 'readOnly') return false;
    
    // Exclude complex object types that should be rendered as JSON
    if (attr.type === 'complex' || attr.type === 'object') return false;
    if (attr.multiValued && attr.type !== 'string') return false;
    
    // Include supported types
    return ['string', 'boolean', 'integer', 'decimal'].includes(attr.type);
  });
}

/**
 * Render all fields dynamically based on schema and data
 * @param {HTMLElement} form - Form element to append fields to
 * @param {Object} data - The data object
 * @param {Object} schema - Schema object (optional)
 * @param {Object} options - Rendering options
 * @param {Array} options.systemFields - System fields to exclude
 * @param {Array} options.serverAssignedFields - Server-assigned fields
 * @param {boolean} options.readonly - Whether to render as readonly (default: false)
 * @param {Function} options.onFieldRender - Callback for custom field rendering
 */
export function renderAllFields(form, data, schema = null, options = {}) {
  const {
    systemFields = [],
    serverAssignedFields = [],
    readonly = false,
    onFieldRender = null
  } = options;
  
  // Get all fields from the data
  const allFields = Object.keys(data);
  const complexFields = detectComplexFields(data);
  
  // Get editable fields from schema if available
  const editableFields = schema ? getEditableAttributes(schema, systemFields).map(attr => attr.name) : [];
  
  allFields.forEach(fieldName => {
    // Skip system fields
    if (systemFields.includes(fieldName) || fieldName === 'schemas') {
      return;
    }
    
    const fieldValue = data[fieldName];
    const isComplex = complexFields.includes(fieldName);
    const isEditable = editableFields.includes(fieldName) && !readonly;
    
    // Create field group
    const fieldGroup = createElement('div', {
      className: UI_CONFIG.CLASSES.FORM_GROUP
    });
    
    const label = createElement('label', {
      className: UI_CONFIG.CLASSES.FORM_LABEL,
      textContent: fieldName
    });
    
    if (isComplex) {
      // Render complex fields as JSON
      const jsonField = createElement('div', {
        className: UI_CONFIG.CLASSES.JSON_FIELD
      });
      
      safeRenderJSON(jsonField, fieldValue);
      fieldGroup.appendChild(label);
      fieldGroup.appendChild(jsonField);
    } else if (isEditable) {
      // Render as editable field
      const input = createElement('input', {
        type: 'text',
        id: fieldName,
        className: UI_CONFIG.CLASSES.FORM_CONTROL,
        value: fieldValue !== undefined && fieldValue !== null ? fieldValue : ''
      });
      
      fieldGroup.appendChild(label);
      fieldGroup.appendChild(input);
    } else {
      // Render as readonly field
      const readonlyValue = createElement('div', {
        className: UI_CONFIG.CLASSES.READONLY_FIELD
      });
      
      readonlyValue.innerHTML = `
        <span class="${UI_CONFIG.CLASSES.READONLY_VALUE}">${escapeHTML(formatReadonlyValue(fieldValue))}</span>
      `;
      
      fieldGroup.appendChild(label);
      fieldGroup.appendChild(readonlyValue);
    }
    
    // Allow custom field rendering override
    if (onFieldRender) {
      onFieldRender(fieldGroup, fieldName, fieldValue, isComplex, isEditable);
    }
    
    form.appendChild(fieldGroup);
  });
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export default {
  // DOM utilities
  escapeHTML,
  createElement,
  clearElement,
  addEventListener,
  removeEventListener,
  
  // Security utilities
  sanitizeHTML,
  setInnerHTML,
  
  // Memory management
  EventListenerManager,
  eventManager,
  
  // Logging
  Logger,
  logger,
  LOG_LEVELS,
  
  // Validation utilities
  validateRequired,
  validateElement,
  validateFunction,
  validateFormData,
  validateFieldType,
  debugComplexFields,
  
  // Data utilities
  deepClone,
  deepMerge,
  getNestedProperty,
  setNestedProperty,
  
  // Error handling utilities
  createError,
  parseError,
  safeAsync,
  
  // Storage utilities
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
  
  // String utilities
  capitalize,
  camelToKebab,
  kebabToCamel,
  truncate,
  
  // Array utilities
  unique,
  groupBy,
  sortBy,
  
  // Request/Response logging
  RequestResponseLogger,
  requestLogger,
  createRequestLog,
  createResponseLog,
  parseSCIMError,
  
  // Other utilities
  debounce,
  createFallbackSchema,
  handleMissingSchema,
  fetchSchemaForResource,
  formatReadonlyValue,
  safeRenderJSON,
  detectComplexFields,
  getReadonlyFields
}; 