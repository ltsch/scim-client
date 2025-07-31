// js/group-list.js - Refactored Group List Component

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

// ============================================================================
// GROUP FILTER UI COMPONENT
// ============================================================================

/**
 * Group-specific filter UI component
 */
class GroupFilterUI {
  /**
   * Create group filter UI
   * @param {HTMLElement} container - Container element
   * @param {Object} schema - Group schema
   * @param {Function} onFilterChange - Filter change callback
   */
  constructor(container, schema, onFilterChange) {
    this.container = container;
    this.schema = schema;
    this.onFilterChange = onFilterChange;
    this.filterBuilder = new SCIMFilterBuilder(RESOURCE_CONFIG.GROUP.SEARCH_FIELDS);
    this.activeFilters = [];
    
    this.validate();
    this.render();
    this.bindEvents();
  }

  /**
   * Validate component configuration
   * @throws {Error} If validation fails
   */
  validate() {
    validateContainer(this.container);
    if (this.onFilterChange && typeof this.onFilterChange !== 'function') {
      throw new Error('onFilterChange must be a function');
    }
  }

  /**
   * Render filter UI
   */
  render() {
    const filterContainer = createElement('div', {
      className: 'filter-container'
    });
    
    const header = createElement('div', {
      className: 'filter-header'
    });
    
    header.innerHTML = `
      <h4>Advanced Filters</h4>
      <button type="button" class="${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}" id="toggle-filters">Hide Filters</button>
    `;
    
    const controls = createElement('div', {
      id: 'filter-controls',
      className: 'filter-controls'
    });
    
    const filterRow = createElement('div', {
      className: 'filter-row'
    });
    
    // Attribute select
    const attributeSelect = createElement('select', {
      id: 'filter-attribute',
      className: UI_CONFIG.CLASSES.FORM_CONTROL
    });
    
    const defaultOption = createElement('option', {
      value: '',
      textContent: 'Select field...'
    });
    attributeSelect.appendChild(defaultOption);
    
    RESOURCE_CONFIG.GROUP.COMMON_ATTRIBUTES.forEach(attr => {
      const option = createElement('option', {
        value: attr,
        textContent: attr
      });
      attributeSelect.appendChild(option);
    });
    
    // Operator select
    const operatorSelect = createElement('select', {
      id: 'filter-operator',
      className: UI_CONFIG.CLASSES.FORM_CONTROL
    });
    
    Object.entries(RESOURCE_CONFIG.GROUP.FILTER_OPERATORS || {}).forEach(([value, label]) => {
      const option = createElement('option', {
        value: value,
        textContent: label
      });
      operatorSelect.appendChild(option);
    });
    
    // Value input
    const valueInput = createElement('input', {
      type: 'text',
      id: 'filter-value',
      className: UI_CONFIG.CLASSES.FORM_CONTROL,
      placeholder: 'Value...'
    });
    
    // Add button
    const addButton = createElement('button', {
      type: 'button',
      id: 'add-filter',
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
      textContent: 'Add'
    });
    
    filterRow.appendChild(attributeSelect);
    filterRow.appendChild(operatorSelect);
    filterRow.appendChild(valueInput);
    filterRow.appendChild(addButton);
    
    // Active filters
    const activeFilters = createElement('div', {
      id: 'active-filters',
      className: 'active-filters'
    });
    
    controls.appendChild(filterRow);
    controls.appendChild(activeFilters);
    
    filterContainer.appendChild(header);
    filterContainer.appendChild(controls);
    this.container.appendChild(filterContainer);
  }

  /**
   * Bind filter events
   */
  bindEvents() {
    const addButton = document.getElementById('add-filter');
    const toggleButton = document.getElementById('toggle-filters');
    
    if (addButton) {
      addEventListener(addButton, 'click', () => {
        this.addFilter();
      });
    }
    
    if (toggleButton) {
      addEventListener(toggleButton, 'click', () => {
        this.toggleFilters();
      });
    }
  }

  /**
   * Add a new filter
   */
  addFilter() {
    const attributeSelect = document.getElementById('filter-attribute');
    const operatorSelect = document.getElementById('filter-operator');
    const valueInput = document.getElementById('filter-value');
    
    if (!attributeSelect || !operatorSelect || !valueInput) return;
    
    const attribute = attributeSelect.value;
    const operator = operatorSelect.value;
    const value = valueInput.value.trim();
    
    if (!attribute || !operator || !value) {
      alert('Please fill in all filter fields');
      return;
    }
    
    this.filterBuilder.addFilter(attribute, operator, value);
    this.activeFilters.push({ attribute, operator, value });
    
    this.updateFilterDisplay();
    this.applyFilters();
    
    // Clear inputs
    attributeSelect.value = '';
    operatorSelect.value = '';
    valueInput.value = '';
  }

  /**
   * Remove a filter
   * @param {number} index - Filter index
   */
  removeFilter(index) {
    this.activeFilters.splice(index, 1);
    this.filterBuilder.filters.splice(index, 1);
    
    this.updateFilterDisplay();
    this.applyFilters();
  }

  /**
   * Toggle filter visibility
   */
  toggleFilters() {
    const controls = document.getElementById('filter-controls');
    const toggleButton = document.getElementById('toggle-filters');
    
    if (!controls || !toggleButton) return;
    
    const isVisible = controls.style.display !== 'none';
    controls.style.display = isVisible ? 'none' : 'block';
    toggleButton.textContent = isVisible ? 'Show Filters' : 'Hide Filters';
  }

  /**
   * Update filter display
   */
  updateFilterDisplay() {
    const activeFiltersContainer = document.getElementById('active-filters');
    if (!activeFiltersContainer) return;
    
    clearElement(activeFiltersContainer);
    
    this.activeFilters.forEach((filter, index) => {
      const filterTag = createElement('span', {
        className: 'filter-tag'
      });
      
      filterTag.innerHTML = `
        ${escapeHTML(filter.attribute)} ${escapeHTML(filter.operator)} "${escapeHTML(filter.value)}"
        <button type="button" class="remove-filter" data-index="${index}">×</button>
      `;
      
      addEventListener(filterTag.querySelector('.remove-filter'), 'click', () => {
        this.removeFilter(index);
      });
      
      activeFiltersContainer.appendChild(filterTag);
    });
  }

  /**
   * Apply filters
   */
  applyFilters() {
    if (this.onFilterChange) {
      const queryParams = this.filterBuilder.buildQueryParams();
      this.onFilterChange(queryParams);
    }
  }
}

// ============================================================================
// GROUP LIST COMPONENT
// ============================================================================

/**
 * Group list component extending base list component
 */
class GroupListComponent extends BaseListComponent {
  /**
   * Create group list component
   * @param {HTMLElement} container - Container element
   * @param {Array} groups - Groups data
   * @param {Function} onSelectGroup - Group selection callback
   * @param {Object} options - Component options
   */
  constructor(container, groups, onSelectGroup, options = {}) {
    super(container, groups, onSelectGroup, options);
    this.schema = options.schema;
    this.client = options.client;
    this.filterBuilder = new SCIMFilterBuilder(RESOURCE_CONFIG.GROUP.SEARCH_FIELDS);
  }

  /**
   * Get columns to display
   * @returns {Array} Column names
   */
  getColumns() {
    return RESOURCE_CONFIG.GROUP.PREFERRED_COLUMNS;
  }

  /**
   * Get search fields
   * @returns {Array} Search field names
   */
  getSearchFields() {
    return RESOURCE_CONFIG.GROUP.SEARCH_FIELDS;
  }

  /**
   * Get common attributes
   * @returns {Array} Common attribute names
   */
  getCommonAttributes() {
    return RESOURCE_CONFIG.GROUP.COMMON_ATTRIBUTES;
  }

  /**
   * Get sortable columns
   * @returns {Array} Sortable column names
   */
  getSortableColumns() {
    return ['displayName', 'id', 'description'];
  }

  /**
   * Get group display name
   * @param {Object} group - Group object
   * @returns {string} Display name
   */
  getItemDisplayName(group) {
    return group.displayName || group.id || 'Unknown Group';
  }

  /**
   * Render filter UI
   */
  renderFilterUI() {
    // Disable complex filter UI - using simple search/sort in header instead
    // The old GroupFilterUI was too complex for the minimalist approach
  }

  /**
   * Handle search
   * @param {string} searchTerm - Search term
   */
  async handleSearch(searchTerm) {
    return await safeAsync(async () => {
      if (!this.client) return;

      if (!searchTerm || searchTerm.trim().length < 2) {
        const groups = await this.client.getGroups();
        this.data = groups;
        this.currentPage = 1;
        await this.render();
        return;
      }

      showLoading(this.container, 'Searching groups...');
      this.filterBuilder.setSearchTerm(searchTerm.trim());
      const queryParams = this.filterBuilder.buildQueryParams();
      const groups = await this.client.getGroups(queryParams);
      this.data = groups;
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

      showLoading(this.container, 'Sorting groups...');
      this.filterBuilder.setSorting(sortBy, sortOrder);
      const queryParams = this.filterBuilder.buildQueryParams();
      const groups = await this.client.getGroups(queryParams);
      this.data = groups;
      this.currentPage = 1;
      await this.render();
    }, async (error) => {
      await showError(this.container, error);
    });
  }

  /**
   * Handle filter changes
   * @param {Object} queryParams - Query parameters
   */
  async handleFilterChange(queryParams) {
    return await safeAsync(async () => {
      if (!this.client) return;
      
      showLoading(this.container, 'Loading filtered groups...');
      
      const groups = await this.client.getGroups(queryParams);
      this.data = groups;
      this.currentPage = 1;
      
      await this.render();
    }, async (error) => {
      await showError(this.container, error);
    });
  }

  /**
   * Render group details
   * @param {HTMLElement} container - Container element
   * @param {Object} group - Group object
   */
  renderItemDetails(container, group) {
    const details = createElement('div', {
      className: 'group-details'
    });
    
    const header = createElement('div', {
      className: 'group-details-header'
    });
    
    header.innerHTML = `
      <h3>${escapeHTML(this.getItemDisplayName(group))}</h3>
      <div class="group-id">ID: ${escapeHTML(group.id)}</div>
    `;
    
    const content = createElement('div', {
      className: 'group-details-content'
    });
    
    // Display common attributes instead of raw JSON
    const commonAttrs = ['displayName', 'description', 'members'];
    commonAttrs.forEach(attr => {
      if (group[attr] !== undefined) {
        const attrDiv = createElement('div', {
          className: 'group-attr'
        });
        
        const label = createElement('strong', {
          textContent: `${attr}: `
        });
        
        const value = createElement('span', {
          textContent: this.formatCellValue(group[attr], attr)
        });
        
        attrDiv.appendChild(label);
        attrDiv.appendChild(value);
        content.appendChild(attrDiv);
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
    if (value === null || value === undefined) return '';
    
    switch (column) {
      case 'members':
        if (Array.isArray(value)) {
          return `${value.length} member(s)`;
        }
        return String(value);
        
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
 * Render group list
 * @param {HTMLElement} container - Container element
 * @param {SCIMClient} client - SCIM client
 * @param {Object} options - Render options
 */
export async function renderGroupList(container, client, options = {}) {
  return await safeAsync(async () => {
    validateElement(container, 'container');
    validateRequired(client, 'SCIM client');
    
    showLoading(container, 'Loading groups...');
    
    try {
      // Load groups
      const groups = await client.getGroups();
      
      // Get group schema if available
      let schema = null;
      try {
        const schemas = await client.getSchemas();
        schema = schemas.find(s => s.id === RESOURCE_CONFIG.GROUP.SCHEMA);
      } catch (error) {
        console.warn('Failed to load group schema:', error);
      }
      
      // Create and render group list component
      const groupList = new GroupListComponent(container, groups, (group, action) => {
        handleGroupAction(group, action, client, container);
      }, {
        ...options,
        schema,
        client,
        title: 'Groups',
        onCreate: () => {
          if (options.onCreate) {
            options.onCreate();
          }
        },
        onEdit: (group) => {
          if (options.onEdit) {
            options.onEdit(group);
          }
        },
        onViewJSON: (group) => {
          const groupName = group.displayName || group.id;
          createJSONViewerModal(container, `Group JSON: ${groupName}`, group);
        },
        onDelete: async (group) => {
          if (options.onDelete) {
            await options.onDelete(group);
          } else {
            await handleGroupDelete(group, client, container);
          }
        }
      });
      
      await groupList.render();
      
    } catch (error) {
      // Handle case where Groups endpoint doesn't exist
      if (error.message && error.message.includes('not found')) {
        clearElement(container);
        
        const message = createElement('div', {
          className: 'no-groups-message',
          innerHTML: `
            <div class="info-box">
              <h3>Groups Not Available</h3>
              <p>This SCIM server does not support Groups management.</p>
              <p>The server may not implement the Groups endpoint or it may be disabled.</p>
              <p>You can still manage Users, Roles, and Entitlements.</p>
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
 * Handle group actions
 * @param {Object} group - Group object
 * @param {string} action - Action type
 * @param {SCIMClient} client - SCIM client
 * @param {HTMLElement} container - Container element
 */
async function handleGroupAction(group, action, client, container) {
  return await safeAsync(async () => {
    switch (action) {
      case 'edit':
        // Import and render group edit form
        const { renderGroupEditForm } = await import('./group-edit-form.js');
        
        // Fetch Group schema from server
        const groupSchema = await fetchSchemaForResource(client, 'Group');
        
        await renderGroupEditForm(container, group, async (formData) => {
          return await client.updateGroup(formData);
        }, { schema: groupSchema });
        break;
        
      case 'delete':
        await handleGroupDelete(group, client, container);
        break;
        
      default:
        console.warn('Unknown group action:', action);
    }
  }, async (error) => {
    await showError(container, error);
  });
}

/**
 * Handle group deletion
 * @param {Object} group - Group object
 * @param {SCIMClient} client - SCIM client
 * @param {HTMLElement} container - Container element
 */
async function handleGroupDelete(group, client, container) {
  return await safeAsync(async () => {
    const groupName = group.displayName || group.id;
    
    if (!confirm(`Are you sure you want to delete group "${groupName}"?`)) {
      return;
    }
    
    showLoading(container, `Deleting group "${groupName}"...`);
    
    await client.deleteGroup(group.id);
    
    // Re-render the group list
    await renderGroupList(container, client);
    
  }, async (error) => {
    await showError(container, error);
  });
} 