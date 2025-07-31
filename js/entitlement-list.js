// js/entitlement-list.js - Refactored Entitlement List Component

import { RESOURCE_CONFIG, UI_CONFIG } from './config.js';
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
import { showError, showLoading, renderJSON, createJSONViewerModal } from './ui-components.js';
import { 
  BaseListComponent, 
  SCIMFilterBuilder, 
  getCoreColumns, 
  getSchemaAttributes,
  validateContainer,
  validateData
} from './shared-list-utils.js';

// ============================================================================
// ENTITLEMENT LIST COMPONENT
// ============================================================================

/**
 * Entitlement list component extending base list component
 */
class EntitlementListComponent extends BaseListComponent {
  /**
   * Create entitlement list component
   * @param {HTMLElement} container - Container element
   * @param {Array} entitlements - Entitlements data
   * @param {Function} onSelectEntitlement - Entitlement selection callback
   * @param {Object} options - Component options
   */
  constructor(container, entitlements, onSelectEntitlement, options = {}) {
    super(container, entitlements, onSelectEntitlement, options);
    this.schema = options.schema;
    this.client = options.client;
  }

  /**
   * Get columns to display
   * @returns {Array} Column names
   */
  getColumns() {
    return RESOURCE_CONFIG.ENTITLEMENT.PREFERRED_COLUMNS;
  }

  /**
   * Get search fields
   * @returns {Array} Search field names
   */
  getSearchFields() {
    return RESOURCE_CONFIG.ENTITLEMENT.SEARCH_FIELDS;
  }

  /**
   * Get common attributes
   * @returns {Array} Common attribute names
   */
  getCommonAttributes() {
    return RESOURCE_CONFIG.ENTITLEMENT.COMMON_ATTRIBUTES;
  }

  /**
   * Get entitlement display name
   * @param {Object} entitlement - Entitlement object
   * @returns {string} Display name
   */
  getItemDisplayName(entitlement) {
    return entitlement.displayName || entitlement.id || 'Unknown Entitlement';
  }

  /**
   * Render entitlement details
   * @param {HTMLElement} container - Container element
   * @param {Object} entitlement - Entitlement object
   */
  renderItemDetails(container, entitlement) {
    const details = createElement('div', {
      className: 'entitlement-details'
    });
    
    const header = createElement('div', {
      className: 'entitlement-details-header'
    });
    
    header.innerHTML = `
      <h3>${escapeHTML(this.getItemDisplayName(entitlement))}</h3>
      <div class="entitlement-id">ID: ${escapeHTML(entitlement.id)}</div>
    `;
    
    const content = createElement('div', {
      className: 'entitlement-details-content'
    });
    
    // Render entitlement data as JSON
    renderJSON(content, entitlement);
    
    details.appendChild(header);
    details.appendChild(content);
    container.appendChild(details);
  }

  /**
   * Format cell value for display
   * @param {*} value - Cell value
   * @param {string} column - Column name
   * @returns {string} Formatted value
   */
  formatCellValue(value, column) {
    if (value === null || value === undefined) return '';
    
    switch (column) {
      case 'description':
        if (typeof value === 'string' && value.length > 50) {
          return value.substring(0, 50) + '...';
        }
        return String(value);
        
      case 'active':
        return value ? 'Active' : 'Inactive';
        
      default:
        return super.formatCellValue(value, column);
    }
  }
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Render entitlement list
 * @param {HTMLElement} container - Container element
 * @param {SCIMClient} client - SCIM client
 * @param {Object} options - Render options
 */
export async function renderEntitlementList(container, client, options = {}) {
  return await safeAsync(async () => {
    validateElement(container, 'container');
    validateRequired(client, 'SCIM client');
    
    showLoading(container, 'Loading entitlements...');
    
    try {
      // Load entitlements
      const entitlements = await client.getEntitlements();
      
      // Get entitlement schema if available
      let schema = null;
      try {
        const schemas = await client.getSchemas();
        schema = schemas.find(s => s.id === RESOURCE_CONFIG.ENTITLEMENT.SCHEMA);
      } catch (error) {
        console.warn('Failed to load entitlement schema:', error);
      }
      
      // Create and render entitlement list component
      const entitlementList = new EntitlementListComponent(container, entitlements, (entitlement, action) => {
        handleEntitlementAction(entitlement, action, client, container);
      }, {
        ...options,
        schema,
        client,
        title: 'Entitlements',
        onCreate: () => {
          if (options.onCreate) {
            options.onCreate();
          }
        },
        // Removed onEdit option to disable edit functionality
        onViewJSON: (entitlement) => {
          const entitlementName = entitlement.displayName || entitlement.id;
          createJSONViewerModal(container, `Entitlement JSON: ${entitlementName}`, entitlement);
        },
        onDelete: async (entitlement) => {
          if (options.onDelete) {
            await options.onDelete(entitlement);
          } else {
            await handleEntitlementDelete(entitlement, client, container);
          }
        }
      });
      
      await entitlementList.render();
      
    } catch (error) {
      // Handle case where Entitlements endpoint doesn't exist
      if (error.message && error.message.includes('not found')) {
        clearElement(container);
        
        const message = createElement('div', {
          className: 'no-entitlements-message',
          innerHTML: `
            <div class="info-box">
              <h3>Entitlements Not Available</h3>
              <p>This SCIM server does not support Entitlements management.</p>
              <p>The server may not implement the Entitlements endpoint or it may be disabled.</p>
              <p>You can still manage Users, Groups, and Roles.</p>
            </div>
          `
        });
        
        container.appendChild(message);
      } else {
        // Re-throw other errors
        throw error;
      }
    }
    
  }, async (error) => {
    await showError(container, error);
  });
}

/**
 * Handle entitlement actions
 * @param {Object} entitlement - Entitlement object
 * @param {string} action - Action type
 * @param {SCIMClient} client - SCIM client
 * @param {HTMLElement} container - Container element
 */
async function handleEntitlementAction(entitlement, action, client, container) {
  return await safeAsync(async () => {
    switch (action) {
      case 'delete':
        await handleEntitlementDelete(entitlement, client, container);
        break;
        
      default:
        console.warn('Unknown entitlement action:', action);
    }
  }, async (error) => {
    await showError(container, error);
  });
}

/**
 * Handle entitlement deletion
 * @param {Object} entitlement - Entitlement object
 * @param {SCIMClient} client - SCIM client
 * @param {HTMLElement} container - Container element
 */
async function handleEntitlementDelete(entitlement, client, container) {
  return await safeAsync(async () => {
    const entitlementName = entitlement.displayName || entitlement.id;
    
    if (!confirm(`Are you sure you want to delete entitlement "${entitlementName}"?`)) {
      return;
    }
    
    showLoading(container, `Deleting entitlement "${entitlementName}"...`);
    
    await client.deleteEntitlement(entitlement.id);
    
    // Re-render the entitlement list
    await renderEntitlementList(container, client);
    
  }, async (error) => {
    await showError(container, error);
  });
}