// js/scim-rfc-schemas.js - Refactored SCIM RFC Schemas
// SCIM 2.0 RFC 7643 schemas for compliance validation

import { SCIM_CONFIG } from './config.js';
import { validateRequired, parseError } from './utils.js';

// ============================================================================
// SCIM SCHEMAS
// ============================================================================

/**
 * SCIM 2.0 RFC 7643 schemas for compliance validation
 */
export const scimSchemas = {
  // Common SCIM attributes
  CommonAttributes: {
    type: "object",
    properties: {
      schemas: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        description: "URIs of schemas used to define the attributes of the current resource"
      },
      id: {
        type: "string",
        description: "Unique identifier for the resource"
      },
      externalId: {
        type: "string",
        description: "A String that is an identifier for the resource as defined by the provisioning client"
      },
      meta: {
        type: "object",
        properties: {
          resourceType: { type: "string" },
          created: { type: "string", format: "date-time" },
          lastModified: { type: "string", format: "date-time" },
          version: { type: "string" },
          location: { type: "string" }
        }
      }
    },
    required: ["schemas"]
  },

  // User schema per RFC 7643 §4.1
  User: {
    type: "object",
    allOf: [
      { $ref: "#/definitions/CommonAttributes" },
      {
        type: "object",
        properties: {
          userName: {
            type: "string",
            description: "Unique identifier for the User"
          },
          displayName: {
            type: "string",
            description: "The name of the User, suitable for display to end-users"
          },
          name: {
            type: "object",
            properties: {
              formatted: { type: "string" },
              familyName: { type: "string" },
              givenName: { type: "string" },
              middleName: { type: "string" },
              honorificPrefix: { type: "string" },
              honorificSuffix: { type: "string" }
            }
          },
          emails: {
            type: "array",
            items: {
              type: "object",
              properties: {
                value: { type: "string", format: "email" },
                display: { type: "string" },
                type: { type: "string" },
                primary: { type: "boolean" }
              },
              required: ["value"]
            }
          },
          active: {
            type: "boolean",
            description: "A Boolean value indicating the User's administrative status"
          }
        },
        required: ["userName"]
      }
    ]
  },

  // Group schema per RFC 7643 §4.2
  Group: {
    type: "object",
    allOf: [
      { $ref: "#/definitions/CommonAttributes" },
      {
        type: "object",
        properties: {
          displayName: {
            type: "string",
            description: "A human-readable name for the Group"
          },
          members: {
            type: "array",
            items: {
              type: "object",
              properties: {
                value: { type: "string" },
                display: { type: "string" },
                type: { type: "string" },
                ref: { type: "string" }
              },
              required: ["value"]
            }
          }
        },
        required: ["displayName"]
      }
    ]
  },

  // ServiceProviderConfig schema per RFC 7643 §5
  ServiceProviderConfig: {
    type: "object",
    allOf: [
      { $ref: "#/definitions/CommonAttributes" },
      {
        type: "object",
        properties: {
          documentationUri: { type: "string", format: "uri" },
          patch: {
            type: "object",
            properties: {
              supported: { type: "boolean" }
            }
          },
          bulk: {
            type: "object",
            properties: {
              supported: { type: "boolean" },
              maxOperations: { type: "integer", minimum: 1 },
              maxPayloadSize: { type: "integer", minimum: 1 }
            }
          },
          filter: {
            type: "object",
            properties: {
              supported: { type: "boolean" },
              maxResults: { type: "integer", minimum: 1 }
            }
          },
          changePassword: {
            type: "object",
            properties: {
              supported: { type: "boolean" }
            }
          },
          sort: {
            type: "object",
            properties: {
              supported: { type: "boolean" }
            }
          },
          etag: {
            type: "object",
            properties: {
              supported: { type: "boolean" }
            }
          },
          authenticationSchemes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                specUrl: { type: "string", format: "uri" },
                primary: { type: "boolean" }
              },
              required: ["type", "name"]
            }
          }
        }
      }
    ]
  }
};

// ============================================================================
// RFC SECTIONS
// ============================================================================

/**
 * RFC 7643 section references for compliance validation
 */
export const rfcSections = {
  "User": "§4.1",
  "Group": "§4.2", 
  "ServiceProviderConfig": "§5",
  "ResourceType": "§6",
  "Schema": "§7",
  "Bulk": "§3.7",
  "Filter": "§3.4.2.2",
  "Sort": "§3.4.2.3",
  "Patch": "§3.5.2",
  "ETag": "§3.11",
  "ChangePassword": "§3.6"
};

// ============================================================================
// COMPLIANCE VALIDATION
// ============================================================================

/**
 * Get RFC section reference for a keyword
 * @param {string} keyword - The keyword to look up
 * @returns {string} RFC section reference
 */
export function getRFCSection(keyword) {
  return rfcSections[keyword] || "§Unknown";
}

/**
 * Validate SCIM resource against RFC 7643 schema
 * @param {Object} data - Resource data to validate
 * @param {string} resourceType - Type of resource (User, Group, etc.)
 * @returns {Object} Validation result with errors array
 */
export function validateSCIMResource(data, resourceType) {
  const errors = [];
  
  try {
    validateRequired(data, 'data');
    validateRequired(resourceType, 'resourceType');
    
    const schema = scimSchemas[resourceType];
    if (!schema) {
      errors.push(`Unknown resource type: ${resourceType}`);
      return { valid: false, errors };
    }
    
    // Check required schemas field
    if (!data.schemas || !Array.isArray(data.schemas) || data.schemas.length === 0) {
      errors.push("Resource must include 'schemas' array");
    }
    
    // Check for required fields based on resource type
    switch (resourceType) {
      case 'User':
        if (!data.userName) {
          errors.push("User resource must include 'userName' field");
        }
        break;
      case 'Group':
        if (!data.displayName) {
          errors.push("Group resource must include 'displayName' field");
        }
        break;
      case 'ServiceProviderConfig':
        // ServiceProviderConfig has no additional required fields
        break;
      default:
        // For unknown types, just check basic SCIM structure
        break;
    }
    
    // Validate email format if present
    if (data.emails && Array.isArray(data.emails)) {
      data.emails.forEach((email, index) => {
        if (email.value && !isValidEmail(email.value)) {
          errors.push(`Invalid email format at index ${index}: ${email.value}`);
        }
      });
    }
    
  } catch (error) {
    const parsedError = parseError(error);
    errors.push(`Validation error: ${parsedError}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check RFC compliance of SCIM response
 * @param {Object} response - Response object to validate
 * @param {string} endpoint - Endpoint that was called
 * @returns {Object} Compliance check result
 */
export function checkRFCCompliance(response, endpoint) {
  const complianceChecks = [];
  
  try {
    validateRequired(response, 'response');
    validateRequired(endpoint, 'endpoint');
    
    // Check response structure
    if (!response.data) {
      complianceChecks.push({
        type: 'error',
        message: 'Response missing data property',
        rfcSection: '§3.4.2.1'
      });
    }
    
    // Check status codes
    if (response.status >= 400) {
      complianceChecks.push({
        type: 'warning',
        message: `HTTP ${response.status} response`,
        rfcSection: '§3.12'
      });
    }
    
    // Check content type for JSON responses
    if (response.headers && response.headers['content-type']) {
      const contentType = response.headers['content-type'];
      if (!contentType.includes('application/scim+json') && !contentType.includes('application/json')) {
        complianceChecks.push({
          type: 'warning',
          message: `Unexpected content type: ${contentType}`,
          rfcSection: '§3.1.1'
        });
      }
    }
    
    // Check for required SCIM fields in data
    if (response.data && typeof response.data === 'object') {
      if (!response.data.schemas) {
        complianceChecks.push({
          type: 'warning',
          message: 'Response data missing schemas field',
          rfcSection: '§3.1'
        });
      }
      
      if (!response.data.id && endpoint.includes('/Users/') && response.status === 200) {
        complianceChecks.push({
          type: 'warning',
          message: 'User resource missing id field',
          rfcSection: '§4.1'
        });
      }
    }
    
  } catch (error) {
    const parsedError = parseError(error);
    complianceChecks.push({
      type: 'error',
      message: `Compliance check error: ${parsedError}`,
      rfcSection: '§Unknown'
    });
  }
  
  return {
    compliant: complianceChecks.filter(check => check.type === 'error').length === 0,
    checks: complianceChecks
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  scimSchemas,
  rfcSections,
  getRFCSection,
  validateSCIMResource,
  checkRFCCompliance
};