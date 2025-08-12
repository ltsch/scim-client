// js/role-list.js - Refactored Role List Component

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
import { renderRoleCreateModal } from './role-create-modal.js';

// ============================================================================
// ROLE LIST COMPONENT
// ============================================================================

/**
 * Role list component extending base list component
 */
class RoleListComponent extends BaseListComponent {
  /**
   * Create role list component
   * @param {HTMLElement} container - Container element
   * @param {Array} roles - Roles data
   * @param {Function} onSelectRole - Role selection callback
   * @param {Object} options - Component options
   */
  constructor(container, roles, onSelectRole, options = {}) {
    super(container, roles, onSelectRole, options);
    this.schema = options.schema;
    this.client = options.client;
  }

  /**
   * Get columns to display
   * @returns {Array} Column names
   */
  getColumns() {
    return RESOURCE_CONFIG.ROLE.PREFERRED_COLUMNS;
  }

  /**
   * Get search fields
   * @returns {Array} Search field names
   */
  getSearchFields() {
    return RESOURCE_CONFIG.ROLE.SEARCH_FIELDS;
  }

  /**
   * Get common attributes
   * @returns {Array} Common attribute names
   */
  getCommonAttributes() {
    return RESOURCE_CONFIG.ROLE.COMMON_ATTRIBUTES;
  }

  /**
   * Get role display name
   * @param {Object} role - Role object
   * @returns {string} Display name
   */
  getItemDisplayName(role) {
    return role.displayName || role.id || 'Unknown Role';
  }

  /**
   * Render role details
   * @param {HTMLElement} container - Container element
   * @param {Object} role - Role object
   */
  renderItemDetails(container, role) {
    const details = createElement('div', {
      className: 'role-details'
    });
    
    const header = createElement('div', {
      className: 'role-details-header'
    });
    
    header.innerHTML = `
      <h3>${escapeHTML(this.getItemDisplayName(role))}</h3>
      <div class="role-id">ID: ${escapeHTML(role.id)}</div>
    `;
    
    const content = createElement('div', {
      className: 'role-details-content'
    });
    
    // Render role data as JSON
    renderJSON(content, role);
    
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
        
      default:
        return super.formatCellValue(value, column);
    }
  }
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Render role list
 * @param {HTMLElement} container - Container element
 * @param {SCIMClient} client - SCIM client
 * @param {Object} options - Render options
 */
export async function renderRoleList(container, client, options = {}) {
  return await safeAsync(async () => {
    validateElement(container, 'container');
    validateRequired(client, 'SCIM client');
    
    showLoading(container, 'Loading roles...');
    
    try {
      // Load roles
      const roles = await client.getRoles();
      
      // Get role schema if available
      let schema = null;
      try {
        const schemas = await client.getSchemas();
        schema = schemas.find(s => s.id === RESOURCE_CONFIG.ROLE.SCHEMA);
      } catch (error) {
        console.warn('Failed to load role schema:', error);
      }
      
      // Create and render role list component
      const roleList = new RoleListComponent(container, roles, (role, action) => {
        handleRoleAction(role, action, client, container);
      }, {
        ...options,
        schema,
        client,
        title: 'Roles',
        onCreate: () => {
          if (options.onCreate) {
            options.onCreate();
          } else {
            // Default create handler
            renderRoleCreateModal(container, async (roleData) => {
              const result = await client.createRole(roleData);
              // Re-render the role list after creation
              await renderRoleList(container, client, options);
              return result;
            }, { schema });
          }
        },
        onEdit: (role) => {
          if (options.onEdit) {
            options.onEdit(role);
          }
        },
        onViewJSON: (role) => {
          const roleName = role.displayName || role.id;
          createJSONViewerModal(container, `Role JSON: ${roleName}`, role);
        },
        onDelete: async (role) => {
          if (options.onDelete) {
            await options.onDelete(role);
          } else {
            await handleRoleDelete(role, client, container);
          }
        }
      });
      
      await roleList.render();
      
    } catch (error) {
      // Handle case where Roles endpoint doesn't exist
      if (error.message && error.message.includes('not found')) {
        clearElement(container);
        
        const message = createElement('div', {
          className: 'no-roles-message',
          innerHTML: `
            <div class="info-box">
              <h3>Roles Not Available</h3>
              <p>This SCIM server does not support Roles management.</p>
              <p>The server may not implement the Roles endpoint or it may be disabled.</p>
              <p>You can still manage Users, Groups, and Entitlements.</p>
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
 * Handle role actions
 * @param {Object} role - Role object
 * @param {string} action - Action type
 * @param {SCIMClient} client - SCIM client
 * @param {HTMLElement} container - Container element
 */
async function handleRoleAction(role, action, client, container) {
  return await safeAsync(async () => {
    switch (action) {
      case 'edit':
        // Import and render role edit form
        const { renderRoleEditForm } = await import('./role-edit-form.js');
        await renderRoleEditForm(container, role, async (formData) => {
          return await client.updateRole(formData);
        });
        break;
        
      case 'delete':
        await handleRoleDelete(role, client, container);
        break;
        
      default:
        console.warn('Unknown role action:', action);
    }
  }, async (error) => {
    await showError(container, error);
  });
}

/**
 * Handle role deletion
 * @param {Object} role - Role object
 * @param {SCIMClient} client - SCIM client
 * @param {HTMLElement} container - Container element
 */
async function handleRoleDelete(role, client, container) {
  return await safeAsync(async () => {
    const roleName = role.displayName || role.id;
    
    if (!confirm(`Are you sure you want to delete role "${roleName}"?`)) {
      return;
    }
    
    showLoading(container, `Deleting role "${roleName}"...`);
    
    await client.deleteRole(role.id);
    
    // Re-render the role list
    await renderRoleList(container, client);
    
  }, async (error) => {
    await showError(container, error);
  });
}