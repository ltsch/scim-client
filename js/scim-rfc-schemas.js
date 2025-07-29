// js/scim-rfc-schemas.js
// SCIM 2.0 RFC 7643 schemas for compliance validation

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
                $ref: { type: "string" },
                type: { type: "string" }
              },
              required: ["value"]
            }
          }
        },
        required: ["displayName"]
      }
    ]
  },

  // ServiceProviderConfig schema per RFC 7644 §4.4
  ServiceProviderConfig: {
    type: "object",
    properties: {
      schemas: {
        type: "array",
        items: { type: "string" },
        contains: { const: "urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig" }
      },
      patch: {
        type: "object",
        properties: {
          supported: { type: "boolean" }
        },
        required: ["supported"]
      },
      bulk: {
        type: "object",
        properties: {
          supported: { type: "boolean" },
          maxOperations: { type: "integer" }
        },
        required: ["supported"]
      },
      filter: {
        type: "object",
        properties: {
          supported: { type: "boolean" },
          maxResults: { type: "integer" }
        },
        required: ["supported"]
      },
      changePassword: {
        type: "object",
        properties: {
          supported: { type: "boolean" }
        },
        required: ["supported"]
      },
      sort: {
        type: "object",
        properties: {
          supported: { type: "boolean" }
        },
        required: ["supported"]
      },
      etag: {
        type: "object",
        properties: {
          supported: { type: "boolean" }
        },
        required: ["supported"]
      },
      authenticationSchemes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            name: { type: "string" },
            description: { type: "string" }
          },
          required: ["type", "name"]
        }
      }
    },
    required: ["schemas", "patch", "bulk", "filter", "changePassword", "sort", "etag", "authenticationSchemes"]
  }
};

// RFC section mapping for error context
export const rfcSections = {
  "required": "RFC 7643 §3.1 - Common Attributes",
  "type": "RFC 7643 §2.2 - Attribute Types",
  "format": "RFC 7643 §2.2 - Attribute Types",
  "minItems": "RFC 7643 §2.2 - Multi-valued Attributes",
  "allOf": "RFC 7643 §3 - Resource Schema",
  "contains": "RFC 7644 §4.4 - Service Provider Configuration"
};

// Get RFC section for validation error
export function getRFCSection(keyword) {
  return rfcSections[keyword] || "RFC 7643 - SCIM Core Schema";
}

// Validate SCIM resource against RFC schema
export function validateSCIMResource(data, resourceType) {
  const Ajv = require('ajv');
  const ajv = new Ajv({ 
    allErrors: true,
    verbose: true,
    schemas: scimSchemas
  });

  const schema = scimSchemas[resourceType];
  if (!schema) {
    return {
      valid: false,
      errors: [{ message: `Unknown resource type: ${resourceType}` }]
    };
  }

  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    return {
      valid: false,
      errors: validate.errors.map(err => ({
        path: err.instancePath || err.schemaPath,
        message: err.message,
        keyword: err.keyword,
        rfcSection: getRFCSection(err.keyword),
        data: err.data
      }))
    };
  }

  return { valid: true };
}

// Check RFC compliance for server responses
export function checkRFCCompliance(response, endpoint) {
  const complianceChecks = [];

  // Check ServiceProviderConfig compliance
  if (endpoint.includes('ServiceProviderConfig')) {
    const validation = validateSCIMResource(response, 'ServiceProviderConfig');
    if (!validation.valid) {
      complianceChecks.push({
        type: 'SERVICE_PROVIDER_CONFIG',
        status: 'NON_COMPLIANT',
        issues: validation.errors,
        rfcSection: 'RFC 7644 §4.4'
      });
    } else {
      complianceChecks.push({
        type: 'SERVICE_PROVIDER_CONFIG',
        status: 'COMPLIANT',
        rfcSection: 'RFC 7644 §4.4'
      });
    }
  }

  // Check User resource compliance
  if (endpoint.includes('Users') && response.Resources) {
    response.Resources.forEach((user, index) => {
      const validation = validateSCIMResource(user, 'User');
      if (!validation.valid) {
        complianceChecks.push({
          type: 'USER_RESOURCE',
          status: 'NON_COMPLIANT',
          resourceIndex: index,
          issues: validation.errors,
          rfcSection: 'RFC 7643 §4.1'
        });
      }
    });
  }

  // Check Group resource compliance
  if (endpoint.includes('Groups') && response.Resources) {
    response.Resources.forEach((group, index) => {
      const validation = validateSCIMResource(group, 'Group');
      if (!validation.valid) {
        complianceChecks.push({
          type: 'GROUP_RESOURCE',
          status: 'NON_COMPLIANT',
          resourceIndex: index,
          issues: validation.errors,
          rfcSection: 'RFC 7643 §4.2'
        });
      }
    });
  }

  return complianceChecks;
}