// js/user-list.js - Refactored User List Component

import { RESOURCE_CONFIG, UI_CONFIG } from './config.js';
import { 
  validateElement, 
  validateRequired,
  escapeHTML,
  createElement,
  addEventListener,
  clearElement,
  parseError,
  safeAsync,
  debounce,
  fetchSchemaForResource
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
import { renderUserCreateModal } from './user-create-modal.js';

// ============================================================================
// USER LIST COMPONENT
// ============================================================================

/**
 * User list component extending base list component
 */
class UserListComponent extends BaseListComponent {
  /**
   * Create user list component
   * @param {HTMLElement} container - Container element
   * @param {Array} users - Users data
   * @param {Function} onSelectUser - User selection callback
   * @param {Object} options - Component options
   */
  constructor(container, users, onSelectUser, options = {}) {
    super(container, users, onSelectUser, options);
    this.schema = options.schema;
    this.client = options.client;
  }

  /**
   * Get columns to display
   * @returns {Array} Column names
   */
  getColumns() {
    return RESOURCE_CONFIG.USER.PREFERRED_COLUMNS;
  }

  /**
   * Get search fields
   * @returns {Array} Search field names
   */
  getSearchFields() {
    return RESOURCE_CONFIG.USER.SEARCH_FIELDS;
  }

  /**
   * Get common attributes
   * @returns {Array} Common attribute names
   */
  getCommonAttributes() {
    return RESOURCE_CONFIG.USER.COMMON_ATTRIBUTES;
  }

  /**
   * Get user display name
   * @param {Object} user - User object
   * @returns {string} Display name
   */
  getItemDisplayName(user) {
    return user.displayName || user.userName || user.id || 'Unknown User';
  }

  /**
   * Render filter UI
   */
  renderFilterUI() {
    // Disable complex filter UI - using simple search/sort in header instead
    // if (!this.schema || !this.client) return;
    
    // const filterContainer = createElement('div', {
    //   className: 'user-filter-container'
    // });
    
    // this.userFilterUI = new UserFilterUI(filterContainer, this.schema, (queryParams) => {
    //   this.handleFilterChange(queryParams);
    // });
    
    // this.container.appendChild(filterContainer);
  }

  /**
   * Handle filter changes
   * @param {Object} queryParams - Query parameters
   */
  async handleFilterChange(queryParams) {
    return await safeAsync(async () => {
      if (!this.client) return;
      
      showLoading(this.container, 'Loading filtered users...');
      
      const users = await this.client.getUsers(queryParams);
      this.data = users;
      this.currentPage = 1;
      
      await this.render();
    }, async (error) => {
      await showError(this.container, error);
    });
  }

  /**
   * Get sortable columns
   * @returns {Array} Sortable column names
   */
  getSortableColumns() {
    return ['userName', 'displayName', 'id', 'active'];
  }

  /**
   * Handle search
   * @param {string} searchTerm - Search term
   */
  async handleSearch(searchTerm) {
    return await safeAsync(async () => {
      if (!this.client) return;
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        // If search is empty or too short, reload all users
        const users = await this.client.getUsers();
        this.data = users;
        this.currentPage = 1;
        await this.render();
        return;
      }
      
      showLoading(this.container, 'Searching users...');
      
      // Build search filter
      this.filterBuilder.setSearchTerm(searchTerm.trim());
      const queryParams = this.filterBuilder.buildQueryParams();
      
      const users = await this.client.getUsers(queryParams);
      this.data = users;
      this.currentPage = 1;
      
      await this.render();
    }, async (error) => {
      await showError(this.container, error);
    });
  }

  /**
   * Handle sort
   * @param {string} sortBy - Sort field
   * @param {string} sortOrder - Sort order
   */
  async handleSort(sortBy, sortOrder = 'ascending') {
    return await safeAsync(async () => {
      if (!this.client || !sortBy) return;
      
      showLoading(this.container, 'Sorting users...');
      
      // Build sort parameters
      this.filterBuilder.setSorting(sortBy, sortOrder);
      const queryParams = this.filterBuilder.buildQueryParams();
      
      const users = await this.client.getUsers(queryParams);
      this.data = users;
      this.currentPage = 1;
      
      await this.render();
    }, async (error) => {
      await showError(this.container, error);
    });
  }

  /**
   * Render user details
   * @param {HTMLElement} container - Container element
   * @param {Object} user - User object
   */
  renderItemDetails(container, user) {
    const details = createElement('div', {
      className: 'user-details'
    });
    
    const header = createElement('div', {
      className: 'user-details-header'
    });
    
    header.innerHTML = `
      <h3>${escapeHTML(this.getItemDisplayName(user))}</h3>
      <div class="user-id">ID: ${escapeHTML(user.id)}</div>
    `;
    
    const content = createElement('div', {
      className: 'user-details-content'
    });
    
    // Display common user attributes
    const commonAttributes = this.getCommonAttributes();
    commonAttributes.forEach(attr => {
      const value = this.getFieldValue(user, attr);
      if (value !== undefined && value !== null) {
        const field = createElement('div', {
          className: 'user-detail-field'
        });
        
        field.innerHTML = `
          <strong>${escapeHTML(attr)}:</strong> 
          <span>${escapeHTML(this.formatCellValue(value, attr))}</span>
        `;
        
        content.appendChild(field);
      }
    });
    
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
    if (value === null || value === undefined) {
      return '';
    }
    
    if (column === 'emails' && Array.isArray(value)) {
      return value.map(email => email.value || email).join(', ');
    }
    
    if (column === 'active') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Render user list
 * @param {HTMLElement} container - Container element
 * @param {SCIMClient} client - SCIM client
 * @param {Object} options - Render options
 */
export async function renderUserList(container, client, options = {}) {
  return await safeAsync(async () => {
    validateElement(container, 'container');
    validateRequired(client, 'SCIM client');
    
    showLoading(container, 'Loading users...');
    
    try {
      // Load users
      const users = await client.getUsers();
      
      // Get user schema if available
      let schema = null;
      try {
        const schemas = await client.getSchemas();
        schema = schemas.find(s => s.id === RESOURCE_CONFIG.USER.SCHEMA);
      } catch (error) {
        console.warn('Failed to load user schema:', error);
      }
      
      // Create and render user list component
      const userList = new UserListComponent(container, users, (user, action) => {
        handleUserAction(user, action, client, container);
      }, {
        ...options,
        schema,
        client,
        title: 'Users',
        onCreate: () => {
          if (options.onCreate) {
            options.onCreate();
          } else {
            // Default create handler
            renderUserCreateModal(container, async (userData) => {
              const result = await client.createUser(userData);
              // Re-render the user list after creation
              await renderUserList(container, client, options);
              return result;
            }, { schema });
          }
        },
        onEdit: (user) => {
          if (options.onEdit) {
            options.onEdit(user);
          }
        },
        onViewJSON: (user) => {
          const userName = user.displayName || user.userName || user.id;
          createJSONViewerModal(container, `User JSON: ${userName}`, user);
        },
        onDelete: async (user) => {
          if (options.onDelete) {
            await options.onDelete(user);
          } else {
            await handleUserDelete(user, client, container);
          }
        }
      });
      
      await userList.render();
      
    } catch (error) {
      // Handle case where Users endpoint doesn't exist
      if (error.message && error.message.includes('not found')) {
        clearElement(container);
        
        const message = createElement('div', {
          className: 'no-users-message',
          innerHTML: `
            <div class="info-box">
              <h3>Users Not Available</h3>
              <p>This SCIM server does not support Users management.</p>
              <p>The server may not implement the Users endpoint or it may be disabled.</p>
              <p>You can still manage Groups, Roles, and Entitlements.</p>
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
 * Handle user actions
 * @param {Object} user - User object
 * @param {string} action - Action type
 * @param {SCIMClient} client - SCIM client
 * @param {HTMLElement} container - Container element
 */
async function handleUserAction(user, action, client, container) {
  return await safeAsync(async () => {
    switch (action) {
      case 'edit':
        // Import and render user edit form
        const { renderUserEditForm } = await import('./user-edit-form.js');
        
        // Fetch User schema from server
        const userSchema = await fetchSchemaForResource(client, 'User');
        
        await renderUserEditForm(container, user, async (formData) => {
          return await client.updateUser(formData);
        }, { schema: userSchema });
        break;
        
      case 'delete':
        await handleUserDelete(user, client, container);
        break;
        
      default:
        console.warn('Unknown user action:', action);
    }
  }, async (error) => {
    await showError(container, error);
  });
}

/**
 * Handle user deletion
 * @param {Object} user - User object
 * @param {SCIMClient} client - SCIM client
 * @param {HTMLElement} container - Container element
 */
async function handleUserDelete(user, client, container) {
  return await safeAsync(async () => {
    const userName = user.displayName || user.userName || user.id;
    
    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) {
      return;
    }
    
    showLoading(container, `Deleting user "${userName}"...`);
    
    await client.deleteUser(user.id);
    
    // Re-render the user list
    await renderUserList(container, client);
    
  }, async (error) => {
    await showError(container, error);
  });
} 