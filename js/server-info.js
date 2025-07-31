// js/server-info.js - Refactored Server Information Component

import { UI_CONFIG, SCIM_CONFIG } from './config.js';
import {
  validateElement,
  validateRequired,
  escapeHTML,
  createElement,
  addEventListener,
  clearElement,
  parseError,
  safeAsync
} from './utils.js';
import { showError, showLoading } from './ui-components.js';
import { checkRFCCompliance } from './scim-rfc-schemas.js';

// ============================================================================
// SERVER CAPABILITIES RENDERER
// ============================================================================

/**
 * Server capabilities renderer
 */
class ServerCapabilitiesRenderer {
  /**
   * Create server capabilities renderer
   * @param {HTMLElement} container - Container element
   * @param {Object} serverConfig - Server configuration
   * @param {Array} resourceTypes - Resource types
   * @param {Array} schemas - Schemas
   */
  constructor(container, serverConfig, resourceTypes, schemas) {
    this.container = container;
    this.serverConfig = serverConfig;
    this.resourceTypes = resourceTypes;
    this.schemas = schemas;
    
    this.validate();
    this.render();
  }
  
  /**
   * Validate component configuration
   * @throws {Error} If validation fails
   */
  validate() {
    validateElement(this.container, 'container');
  }
  
  /**
   * Render the server capabilities
   */
  render() {
    clearElement(this.container);
    
    // Check RFC compliance
    const complianceChecks = this.serverConfig ? 
      checkRFCCompliance(this.serverConfig, 'ServiceProviderConfig') : [];
    
    // Create main container
    const serverInfo = createElement('div', {
      className: 'server-info'
    });
    
    // Create title
    const title = createElement('h2', {
      textContent: 'SCIM Server Capabilities'
    });
    
    const description = createElement('p', {
      className: 'info-description',
      textContent: 'Developer-focused view of server capabilities and RFC compliance status.'
    });
    
    serverInfo.appendChild(title);
    serverInfo.appendChild(description);
    
    // Render RFC compliance section
    this.renderComplianceSection(serverInfo, complianceChecks);
    
    // Render supported resources section
    this.renderResourcesSection(serverInfo);
    
    // Render server features section
    if (this.serverConfig) {
      this.renderFeaturesSection(serverInfo);
    }
    
    this.container.appendChild(serverInfo);
  }
  
  /**
   * Render RFC compliance section
   * @param {HTMLElement} parent - Parent element
   * @param {Array} complianceChecks - Compliance checks
   */
  renderComplianceSection(parent, complianceChecks) {
    const section = createElement('div', {
      className: 'capability-section'
    });
    
    const sectionTitle = createElement('h3', {
      textContent: '🔍 RFC Compliance Status'
    });
    
    const statusDiv = createElement('div', {
      className: 'compliance-status'
    });
    
    if (this.serverConfig) {
      statusDiv.innerHTML = `
        <span class="status compliant">✅ RFC 7644 §4.4 Compliant - ServiceProviderConfig endpoint available</span>
      `;
    } else {
      statusDiv.innerHTML = `
        <span class="status non-compliant">❌ RFC 7644 §4.4 Non-Compliant - Missing ServiceProviderConfig endpoint</span>
      `;
    }
    
    section.appendChild(sectionTitle);
    section.appendChild(statusDiv);
    
    // Add compliance details if available
    if (complianceChecks.length > 0) {
      const detailsDiv = createElement('div', {
        className: 'compliance-details'
      });
      
      complianceChecks.forEach(check => {
        const itemDiv = createElement('div', {
          className: `compliance-item ${check.status.toLowerCase()}`
        });
        
        itemDiv.innerHTML = `
          <strong>${escapeHTML(check.type)}:</strong> ${escapeHTML(check.status)}
          ${check.issues ? `
            <details class="compliance-details-expanded">
              <summary>Show Issues</summary>
              <ul class="compliance-issues-list">
                ${check.issues.map(issue => `<li>${escapeHTML(issue.path)}: ${escapeHTML(issue.message)}</li>`).join('')}
              </ul>
            </details>
          ` : ''}
        `;
        
        detailsDiv.appendChild(itemDiv);
      });
      
      section.appendChild(detailsDiv);
    }
    
    parent.appendChild(section);
  }
  
  /**
   * Render supported resources section
   * @param {HTMLElement} parent - Parent element
   */
  renderResourcesSection(parent) {
    const section = createElement('div', {
      className: 'capability-section'
    });
    
    const sectionTitle = createElement('h3', {
      textContent: '📋 Supported Resources'
    });
    
    const resourceList = createElement('div', {
      className: 'resource-list'
    });
    
    if (this.resourceTypes && this.resourceTypes.length > 0) {
      this.resourceTypes.forEach(rt => {
        const resourceItem = createElement('div', {
          className: 'resource-item'
        });
        
        const resourceHeader = createElement('div', {
          className: 'resource-header'
        });
        
        const resourceName = createElement('strong', {
          textContent: rt.name
        });
        
        const resourceSchema = createElement('span', {
          className: 'resource-schema',
          textContent: rt.schema
        });
        
        resourceHeader.appendChild(resourceName);
        resourceHeader.appendChild(resourceSchema);
        
        const resourceDescription = createElement('div', {
          className: 'resource-description',
          textContent: rt.description || 'No description available'
        });
        
        const resourceDetails = createElement('div', {
          className: 'resource-details'
        });
        
        const endpointText = createElement('small', {
          textContent: `Endpoint: ${rt.endpoint}`
        });
        
        resourceDetails.appendChild(endpointText);
        
        if (rt.schemaExtensions) {
          const extensionsText = createElement('small', {
            innerHTML: `<br>Extensions: ${rt.schemaExtensions.map(ext => ext.schema).join(', ')}`
          });
          resourceDetails.appendChild(extensionsText);
        }
        
        resourceItem.appendChild(resourceHeader);
        resourceItem.appendChild(resourceDescription);
        resourceItem.appendChild(resourceDetails);
        resourceList.appendChild(resourceItem);
      });
    } else {
      const noResources = createElement('div', {
        className: 'no-resources',
        textContent: 'No resource types discovered'
      });
      resourceList.appendChild(noResources);
    }
    
    section.appendChild(sectionTitle);
    section.appendChild(resourceList);
    parent.appendChild(section);
  }
  
  /**
   * Render server features section
   * @param {HTMLElement} parent - Parent element
   */
  renderFeaturesSection(parent) {
    const section = createElement('div', {
      className: 'capability-section'
    });
    
    const sectionTitle = createElement('h3', {
      textContent: '⚙️ Server Features'
    });
    
    const featuresGrid = createElement('div', {
      className: 'features-grid'
    });
    
    const features = [
      {
        key: 'patch',
        name: 'Patch Operations',
        desc: 'RFC 7644 §3.5.2',
        maxKey: null
      },
      {
        key: 'bulk',
        name: 'Bulk Operations',
        desc: 'RFC 7644 §3.7',
        maxKey: 'maxOperations'
      },
      {
        key: 'filter',
        name: 'Filtering',
        desc: 'RFC 7644 §3.4.2.2',
        maxKey: 'maxResults'
      },
      {
        key: 'sort',
        name: 'Sorting',
        desc: 'RFC 7644 §3.4.2.3',
        maxKey: null
      },
      {
        key: 'changePassword',
        name: 'Change Password',
        desc: 'RFC 7644 §3.5.1',
        maxKey: null
      },
      {
        key: 'etag',
        name: 'ETags',
        desc: 'RFC 7644 §3.11',
        maxKey: null
      }
    ];
    
    features.forEach(feature => {
      const featureData = this.serverConfig[feature.key];
      const isSupported = featureData?.supported || false;
      const maxValue = feature.maxKey && featureData ? featureData[feature.maxKey] : null;
      
      const featureItem = createElement('div', {
        className: `feature-item ${isSupported ? 'supported' : 'not-supported'}`
      });
      
      const featureIcon = createElement('span', {
        className: 'feature-icon',
        textContent: isSupported ? '✅' : '❌'
      });
      
      const featureName = createElement('span', {
        className: 'feature-name',
        textContent: feature.name
      });
      
      const featureDesc = createElement('span', {
        className: 'feature-desc',
        textContent: feature.desc
      });
      
      if (maxValue) {
        featureDesc.textContent += ` (Max: ${maxValue})`;
      }
      
      featureItem.appendChild(featureIcon);
      featureItem.appendChild(featureName);
      featureItem.appendChild(featureDesc);
      featuresGrid.appendChild(featureItem);
    });
    
    section.appendChild(sectionTitle);
    section.appendChild(featuresGrid);
    parent.appendChild(section);
  }
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Render server capabilities
 * @param {HTMLElement} container - Container element
 * @param {Object} serverConfig - Server configuration
 * @param {Array} resourceTypes - Resource types
 * @param {Array} schemas - Schemas
 */
export function renderServerCapabilities(container, serverConfig, resourceTypes, schemas) {
  return new ServerCapabilitiesRenderer(container, serverConfig, resourceTypes, schemas);
}