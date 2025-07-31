// js/config.js - Unified Configuration System

// Application-wide configuration
export const APP_CONFIG = {
  // Application settings
  NAME: 'SCIM Client Test Harness',
  VERSION: '1.0.0',
  DESCRIPTION: 'Simple, clean SCIM 2.0 client for testing and development',
  
  // Default settings
  DEFAULT_SECTION: 'User',
  SEARCH_MIN_LENGTH: 2,
  
  // Storage keys
  STORAGE_KEYS: {
    ENDPOINT: 'scim_endpoint',
    API_KEY: 'scim_api_key',
    USE_PROXY: 'scim_use_proxy',
    PROXY_URL: 'scim_proxy_url',
    LAST_SECTION: 'last_section'
  },
  
  // Navigation sections
  SECTIONS: {
    USER: 'User',
    GROUP: 'Group', 
    ROLE: 'Role',
    ENTITLEMENT: 'Entitlement',
    CONFIG: 'config',
    SETTINGS: 'settings',
    LOGS: 'logs'
  },
  
  // API settings
  API: {
    TIMEOUT_MS: 30000,
    DEFAULT_HEADERS: {
      'Accept': 'application/scim+json',
      'Content-Type': 'application/scim+json'
    }
  }
};

// UI Configuration
export const UI_CONFIG = {
  // CSS class names
  CLASSES: {
    // Layout
    APP_LAYOUT: 'app-layout',
    TOPNAV: 'topnav',
    SIDEBAR_NAV: 'sidebar-nav',
    SIDEBAR_BTN: 'sidebar-btn',
    MAIN_PANEL: 'main-panel',
    
    // Modals
    MODAL_OVERLAY: 'modal-overlay',
    MODAL_CONTAINER: 'modal-container',
    MODAL_HEADER: 'modal-header',
    MODAL_BODY: 'modal-body',
    MODAL_FOOTER: 'modal-footer',
    MODAL_CLOSE: 'modal-close',
    
    // Forms
    FORM: 'form',
    FORM_GROUP: 'form-group',
    FORM_LABEL: 'form-label',
    FORM_CONTROL: 'form-control',
    FORM_ERROR: 'form-error',
    FORM_CHECKBOX: 'form-checkbox',
    FORM_CHECKBOX_LABEL: 'checkbox-label',
    FORM_CHECKBOX_TEXT: 'checkbox-text',
    
    // Buttons
    BTN: 'btn',
    BTN_PRIMARY: 'btn-primary',
    BTN_SECONDARY: 'btn-secondary',
    BTN_DANGER: 'btn-danger',
    
    // Tables
    TABLE: 'table',
    TABLE_HEADER: 'table-header',
    TABLE_ROW: 'table-row',
    TABLE_CELL: 'table-cell',
    
    // Loading states
    LOADING_SPINNER: 'loading-spinner',
    SPINNER: 'spinner',
    LOADING_TITLE: 'loading-title',
    LOADING_DESCRIPTION: 'loading-description',
    
    // Error states
    ERROR_MESSAGE: 'error-message',
    SUCCESS_MESSAGE: 'success-message',
    WARNING_MESSAGE: 'warning-message',
    
    // JSON viewer
    JSON_VIEWER: 'json-viewer',
    JSON_FIELD: 'json-field',
    
    // Readonly fields
    READONLY_FIELD: 'readonly-field',
    READONLY_VALUE: 'readonly-value',
    
    // Request/Response
    REQRES_ACCORDION: 'reqres-accordion',
    REQRES_TOGGLE_BTN: 'reqres-toggle-btn',
    REQRES_PANEL: 'reqres-panel'
  },
  
  // Loading types
  LOADING_TYPES: {
    DEFAULT: 'default',
    RETRY: 'retry',
    ERROR_RECOVERY: 'error-recovery',
    METADATA: 'metadata'
  },
  
  // Error types
  ERROR_TYPES: {
    UNKNOWN: 'unknown',
    NETWORK: 'network',
    VALIDATION: 'validation',
    SCIM: 'scim',
    STRING: 'string'
  },
  
  // Messages
  MESSAGES: {
    LOADING: 'Loading...',
    ERROR_UNKNOWN: 'An unknown error occurred',
    ERROR_NETWORK: 'Network error occurred',
    ERROR_VALIDATION: 'Validation error',
    SUCCESS_SAVED: 'Successfully saved',
    SUCCESS_DELETED: 'Successfully deleted'
  }
};

// Form Configuration
export const FORM_CONFIG = {
  // System fields that should be excluded from forms
  SYSTEM_FIELDS: ['id', 'externalId', 'meta', 'password', 'schemas', 'scimGatewayData'],
  
  // Server-assigned fields that should never be modified
  SERVER_ASSIGNED_FIELDS: ['id', 'meta'],
  
  // Immutable fields that cannot be changed after creation
  IMMUTABLE_FIELDS: ['id'],
  

  
  // Supported input types
  SUPPORTED_TYPES: ['string', 'boolean', 'integer', 'decimal'],
  
  // Validation rules
  VALIDATION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    REQUIRED_FIELDS: ['userName', 'displayName']
  }
};

// List Configuration
export const LIST_CONFIG = {
  // Pagination
  PAGE_SIZE: 50,
  MAX_COLUMNS: 8,
  
  // Search
  SEARCH_DELAY_MS: 300,
  MIN_SEARCH_LENGTH: 2,
  
  // Filter operators
  FILTER_OPERATORS: {
    eq: 'Equals',
    ne: 'Not Equals',
    co: 'Contains',
    sw: 'Starts With',
    ew: 'Ends With',
    gt: 'Greater Than',
    lt: 'Less Than',
    ge: 'Greater Than or Equal',
    le: 'Less Than or Equal'
  },
  
  // Common attributes for all resources
  COMMON_ATTRIBUTES: ['id', 'externalId', 'displayName', 'created', 'lastModified']
};

// Resource-specific configurations
export const RESOURCE_CONFIG = {
  USER: {
    TYPE: 'User',
    ENDPOINT: '/Users',
    SCHEMA: 'urn:ietf:params:scim:schemas:core:2.0:User',
    SEARCH_FIELDS: ['userName', 'displayName', 'emails.value'],
    PREFERRED_COLUMNS: ['userName', 'displayName', 'emails', 'active'],
    COMMON_ATTRIBUTES: ['id', 'externalId', 'userName', 'displayName', 'emails', 'active']
  },
  
  GROUP: {
    TYPE: 'Group',
    ENDPOINT: '/Groups',
    SCHEMA: 'urn:ietf:params:scim:schemas:core:2.0:Group',
    SEARCH_FIELDS: ['displayName', 'members.display'],
    PREFERRED_COLUMNS: ['displayName', 'members', 'description'],
    COMMON_ATTRIBUTES: ['id', 'externalId', 'displayName', 'members', 'description']
  },
  
  ENTITLEMENT: {
    TYPE: 'Entitlement',
    ENDPOINT: '/Entitlements',
    SCHEMA: 'urn:ietf:params:scim:schemas:core:2.0:Entitlement',
    SEARCH_FIELDS: ['displayName', 'description'],
    PREFERRED_COLUMNS: ['displayName', 'description'],
    COMMON_ATTRIBUTES: ['id', 'externalId', 'displayName', 'description']
  },
  
  ROLE: {
    TYPE: 'Role',
    ENDPOINT: '/Roles',
    SCHEMA: 'urn:ietf:params:scim:schemas:core:2.0:Role',
    SEARCH_FIELDS: ['displayName', 'description'],
    PREFERRED_COLUMNS: ['displayName', 'description', 'active'],
    COMMON_ATTRIBUTES: ['id', 'externalId', 'displayName', 'description', 'active']
  }
};

// SCIM Configuration
export const SCIM_CONFIG = {
  // RFC sections for error context
  RFC_SECTIONS: {
    'MISSING_SERVICE_PROVIDER_CONFIG': {
      section: 'RFC 7644 §4.4 - Service Provider Configuration',
      requirement: 'ServiceProviderConfig endpoint is mandatory',
      impact: 'Cannot determine server capabilities',
      solution: 'Ensure SCIM server implements ServiceProviderConfig endpoint'
    },
    'INVALID_FILTER_SYNTAX': {
      section: 'RFC 7644 §3.4.2.2 - Filtering',
      requirement: 'Filter syntax must comply with RFC 7644',
      impact: 'Search and filtering operations will fail',
      solution: 'Use proper SCIM filter syntax (e.g., userName eq "john")'
    },
    'MISSING_SCHEMAS': {
      section: 'RFC 7643 §3.1 - Common Attributes',
      requirement: 'Resources must include schemas attribute',
      impact: 'Server may reject requests',
      solution: 'Include schemas array in all resource operations'
    },
    'AUTHENTICATION_ERROR': {
      section: 'RFC 7644 §2.1 - Authentication',
      requirement: 'Valid authentication credentials required',
      impact: 'All operations will be rejected',
      solution: 'Check API key and authentication method'
    },
    'AUTHORIZATION_ERROR': {
      section: 'RFC 7644 §2.1 - Authorization',
      requirement: 'Sufficient permissions required for operation',
      impact: 'Operation will be rejected',
      solution: 'Check user permissions and resource access'
    },
    'INVALID_SYNTAX': {
      section: 'RFC 7644 §3.3.2 - Request Syntax',
      requirement: 'Request body must be valid JSON',
      impact: 'Request will be rejected',
      solution: 'Validate JSON syntax and required fields'
    },
    'INVALID_PATH': {
      section: 'RFC 7644 §3.4.2.1 - Resource Path',
      requirement: 'Resource path must be valid',
      impact: 'Resource not found',
      solution: 'Check resource ID and endpoint path'
    },
    'INVALID_VALUE': {
      section: 'RFC 7643 §2.2 - Attribute Types',
      requirement: 'Attribute values must match defined types',
      impact: 'Request will be rejected',
      solution: 'Check attribute types and constraints'
    },
    'MUTABILITY_ERROR': {
      section: 'RFC 7643 §2.2 - Mutability',
      requirement: 'Attributes must respect mutability rules',
      impact: 'Update operation will fail',
      solution: 'Check schema for readOnly/immutable attributes'
    },
    'UNIQUENESS_ERROR': {
      section: 'RFC 7643 §2.2 - Uniqueness',
      requirement: 'Unique attributes must not have duplicates',
      impact: 'Create/update operation will fail',
      solution: 'Check for existing resources with same unique value'
    },
    'TOO_MANY_ERROR': {
      section: 'RFC 7644 §3.4.2.4 - Pagination',
      requirement: 'Results exceed maximum allowed',
      impact: 'Request will be rejected',
      solution: 'Use pagination parameters (startIndex, count)'
    },
    'NO_TARGET_ERROR': {
      section: 'RFC 7644 §3.4.2.1 - Resource Path',
      requirement: 'Target resource must exist',
      impact: 'Operation will fail',
      solution: 'Check resource ID and ensure resource exists'
    },
    'INVALID_VERS_ERROR': {
      section: 'RFC 7644 §3.14 - Versioning',
      requirement: 'Version must match current resource version',
      impact: 'Update operation will fail',
      solution: 'Retrieve latest version and retry'
    },
    'SENSITIVITY_ERROR': {
      section: 'RFC 7643 §2.2 - Sensitivity',
      requirement: 'Sensitive attributes require special handling',
      impact: 'Operation will be rejected',
      solution: 'Check permissions for sensitive attributes'
    }
  },
  
  // SCIM Error codes with RFC references
  ERROR_CODES: {
    INVALID_FILTER: {
      code: 'invalidFilter',
      rfc: 'RFC 7644 §3.4.2.2',
      description: 'The specified filter syntax was invalid',
      solution: 'Check filter syntax and supported operators'
    },
    INVALID_SYNTAX: {
      code: 'invalidSyntax',
      rfc: 'RFC 7644 §3.3.2',
      description: 'The request body was not well-formed',
      solution: 'Validate JSON syntax and required fields'
    },
    INVALID_PATH: {
      code: 'invalidPath',
      rfc: 'RFC 7644 §3.4.2.1',
      description: 'The "path" attribute was invalid',
      solution: 'Check resource path and ID format'
    },
    NO_TARGET: {
      code: 'noTarget',
      rfc: 'RFC 7644 §3.4.2.1',
      description: 'The specified "path" did not yield a target',
      solution: 'Verify resource exists and path is correct'
    },
    INVALID_VALUE: {
      code: 'invalidValue',
      rfc: 'RFC 7643 §2.2',
      description: 'The value was invalid',
      solution: 'Check attribute type and constraints'
    },
    INVALID_VERS: {
      code: 'invalidVers',
      rfc: 'RFC 7644 §3.14',
      description: 'The specified version number was invalid',
      solution: 'Retrieve latest version and retry'
    },
    TOO_MANY: {
      code: 'tooMany',
      rfc: 'RFC 7644 §3.4.2.4',
      description: 'The specified filter yields more results than allowed',
      solution: 'Use pagination or more specific filter'
    },
    UNIQUENESS: {
      code: 'uniqueness',
      rfc: 'RFC 7643 §2.2',
      description: 'One or more of the attribute values are already in use',
      solution: 'Check for existing resources with same unique value'
    },
    MUTABILITY: {
      code: 'mutability',
      rfc: 'RFC 7643 §2.2',
      description: 'The attempted modification is not compatible with the attribute\'s mutability',
      solution: 'Check schema for readOnly/immutable attributes'
    },
    SENSITIVITY: {
      code: 'sensitivity',
      rfc: 'RFC 7643 §2.2',
      description: 'The specified attribute is sensitive and cannot be modified',
      solution: 'Check permissions for sensitive attributes'
    }
  },

  // HTTP status code to SCIM error mapping
  HTTP_STATUS_MAPPING: {
    400: {
      scimCode: 'invalidSyntax',
      description: 'Bad Request - Invalid request syntax',
      commonCauses: ['Malformed JSON', 'Missing required fields', 'Invalid filter syntax']
    },
    401: {
      scimCode: 'authentication',
      description: 'Unauthorized - Authentication required',
      commonCauses: ['Missing API key', 'Invalid credentials', 'Expired token']
    },
    403: {
      scimCode: 'authorization',
      description: 'Forbidden - Insufficient permissions',
      commonCauses: ['Insufficient privileges', 'Resource access denied', 'Sensitive attribute access']
    },
    404: {
      scimCode: 'noTarget',
      description: 'Not Found - Resource not found',
      commonCauses: ['Invalid resource ID', 'Resource deleted', 'Wrong endpoint']
    },
    409: {
      scimCode: 'uniqueness',
      description: 'Conflict - Resource conflict',
      commonCauses: ['Duplicate unique attribute', 'Version conflict', 'Resource already exists']
    },
    412: {
      scimCode: 'invalidVers',
      description: 'Precondition Failed - Version mismatch',
      commonCauses: ['Outdated version', 'Concurrent modification', 'ETag mismatch']
    },
    413: {
      scimCode: 'tooMany',
      description: 'Payload Too Large - Request too large',
      commonCauses: ['Too many resources', 'Large payload', 'Exceeded limits']
    },
    422: {
      scimCode: 'invalidValue',
      description: 'Unprocessable Entity - Validation failed',
      commonCauses: ['Invalid attribute values', 'Schema validation failed', 'Business rule violation']
    },
    429: {
      scimCode: 'rateLimit',
      description: 'Too Many Requests - Rate limit exceeded',
      commonCauses: ['API rate limit', 'Too many requests', 'Throttling applied']
    },
    500: {
      scimCode: 'serverError',
      description: 'Internal Server Error - Server error',
      commonCauses: ['Server processing error', 'Database error', 'Configuration issue']
    },
    503: {
      scimCode: 'serviceUnavailable',
      description: 'Service Unavailable - Service temporarily unavailable',
      commonCauses: ['Server maintenance', 'Overloaded server', 'Temporary outage']
    }
  },

  // Request/Response logging configuration
  LOGGING: {
    ENABLED: true,
    MAX_ENTRIES: 500,
    PERSIST_TO_STORAGE: true,
    INCLUDE_HEADERS: true,
    INCLUDE_TIMING: true,
    INCLUDE_SIZE: true,
    SENSITIVE_HEADERS: ['authorization', 'cookie', 'x-api-key'],
    LOG_LEVELS: {
      DEBUG: 'debug',
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error'
    }
  }
};

// Export all configurations
export default {
  APP: APP_CONFIG,
  UI: UI_CONFIG,
  FORM: FORM_CONFIG,
  LIST: LIST_CONFIG,
  RESOURCE: RESOURCE_CONFIG,
  SCIM: SCIM_CONFIG
}; 