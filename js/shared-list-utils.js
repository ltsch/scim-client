// js/shared-list-utils.js - Shared List Utilities

import { LIST_CONFIG, UI_CONFIG } from './config.js';
import { 
  validateElement, 
  validateRequired,
  escapeHTML,
  createElement,
  addEventListener,
  clearElement,
  parseError,
  safeAsync,
  getNestedProperty,
  debounce
} from './utils.js';
import { showError, showLoading, createJSONViewerModal } from './ui-components.js';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate container element
 * @param {HTMLElement} container - Container to validate
 * @throws {Error} If validation fails
 */
export function validateContainer(container) {
  validateElement(container, 'container');
}

/**
 * Validate data array
 * @param {Array} data - Data to validate
 * @throws {Error} If validation fails
 */
export function validateData(data) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }
}

/**
 * Validate schema object
 * @param {Object} schema - Schema to validate
 * @throws {Error} If validation fails
 */
export function validateSchema(schema) {
  if (schema && typeof schema !== 'object') {
    throw new Error('Schema must be an object');
  }
}

/**
 * Validate callback function
 * @param {Function} callback - Callback to validate
 * @throws {Error} If validation fails
 */
export function validateCallback(callback) {
  if (callback && typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }
}

// ============================================================================
// SCHEMA UTILITIES
// ============================================================================

/**
 * Get schema attributes excluding write-only ones
 * @param {Object} schema - Schema object
 * @returns {Array} Filtered attributes
 */
export function getSchemaAttributes(schema) {
  if (!schema || !Array.isArray(schema.attributes)) return [];
  return schema.attributes.filter(attr => !attr.mutability || attr.mutability !== 'writeOnly');
}

/**
 * Get core columns for display
 * @param {Array} data - Data array
 * @param {Object} schema - Schema object
 * @param {Array} preferredColumns - Preferred column names
 * @returns {Array} Column names to display
 */
export function getCoreColumns(data, schema, preferredColumns) {
  const attributes = getSchemaAttributes(schema);
  const available = preferredColumns.filter(col => 
    attributes.some(a => a.name === col)
  );
  
  if (available.length < LIST_CONFIG.MAX_COLUMNS) {
    for (const attr of attributes) {
      if (!available.includes(attr.name) && available.length < LIST_CONFIG.MAX_COLUMNS) {
        available.push(attr.name);
      }
    }
  }
  return available;
}

// ============================================================================
// SCIM FILTER BUILDER
// ============================================================================

/**
 * SCIM Filter Builder for constructing query filters
 */
export class SCIMFilterBuilder {
  /**
   * Create filter builder
   * @param {Array} searchFields - Fields to search in
   */
  constructor(searchFields = []) {
    this.filters = [];
    this.searchTerm = '';
    this.sortBy = '';
    this.sortOrder = 'ascending';
    this.searchFields = searchFields;
  }

  /**
   * Add a filter condition
   * @param {string} attribute - Attribute name
   * @param {string} operator - Filter operator
   * @param {string} value - Filter value
   */
  addFilter(attribute, operator, value) {
    if (attribute && value) {
      this.filters.push({ attribute, operator, value });
    }
  }

  /**
   * Set search term
   * @param {string} term - Search term
   */
  setSearchTerm(term) {
    this.searchTerm = term;
  }

  /**
   * Set sorting parameters
   * @param {string} attribute - Sort attribute
   * @param {string} order - Sort order
   */
  setSorting(attribute, order = 'ascending') {
    this.sortBy = attribute;
    this.sortOrder = order;
  }

  /**
   * Build filter string for SCIM query
   * @returns {string} Filter string
   */
  buildFilterString() {
    const conditions = [];

    if (this.searchTerm && this.searchFields.length > 0) {
      const searchConditions = this.searchFields.map(field => 
        `${field} co "${this.searchTerm}"`
      );
      conditions.push(`(${searchConditions.join(' or ')})`);
    }

    this.filters.forEach(filter => {
      conditions.push(`${filter.attribute} ${filter.operator} "${filter.value}"`);
    });

    return conditions.length > 0 ? conditions.join(' and ') : '';
  }

  /**
   * Build query parameters object
   * @returns {Object} Query parameters
   */
  buildQueryParams() {
    const params = {};
    
    const filterString = this.buildFilterString();
    if (filterString) {
      params.filter = filterString;
    }
    
    if (this.sortBy) {
      params.sortBy = this.sortBy;
      params.sortOrder = this.sortOrder;
    }
    
    return params;
  }

  /**
   * Clear all filters and search
   */
  clear() {
    this.filters = [];
    this.searchTerm = '';
    this.sortBy = '';
    this.sortOrder = 'ascending';
  }
}

// ============================================================================
// BASE LIST COMPONENT
// ============================================================================

/**
 * Base list component for displaying SCIM resources
 */
export class BaseListComponent {
  /**
   * Create base list component
   * @param {HTMLElement} container - Container element
   * @param {Array} data - Data array
   * @param {Function} onSelectItem - Item selection callback
   * @param {Object} options - Component options
   */
  constructor(container, data, onSelectItem, options = {}) {
    this.container = container;
    this.data = data;
    this.onSelectItem = onSelectItem;
    this.options = options;
    this.filterBuilder = new SCIMFilterBuilder(this.getSearchFields());
    this.currentPage = 1;
    this.itemsPerPage = options.itemsPerPage || LIST_CONFIG.PAGE_SIZE;
    
    this.validate();
  }

  /**
   * Validate component configuration
   * @throws {Error} If validation fails
   */
  validate() {
    validateContainer(this.container);
    validateData(this.data);
    validateCallback(this.onSelectItem);
  }

  /**
   * Get columns to display (override in subclasses)
   * @returns {Array} Column names
   */
  getColumns() {
    return ['id', 'displayName'];
  }

  /**
   * Get search fields (override in subclasses)
   * @returns {Array} Search field names
   */
  getSearchFields() {
    return ['displayName'];
  }

  /**
   * Get common attributes (override in subclasses)
   * @returns {Array} Common attribute names
   */
  getCommonAttributes() {
    return ['id', 'displayName'];
  }

  /**
   * Get item display name (override in subclasses)
   * @param {Object} item - Data item
   * @returns {string} Display name
   */
  getItemDisplayName(item) {
    return item.displayName || item.id || 'Unknown';
  }

  /**
   * Render the list component
   */
  render() {
    return safeAsync(async () => {
      clearElement(this.container);
      
      // Render header
      this.renderHeader();
      
      // Render filter UI
      this.renderFilterUI();
      
      // Render results info
      this.renderResultsInfo();
      
      // Render table
      this.renderTable();
      
      // Bind events
      this.bindTableEvents();
    }, async (error) => {
      await showError(this.container, error);
    });
  }

  /**
   * Render component header
   */
  renderHeader() {
    const header = createElement('div', {
      className: 'list-header'
    });
    
    const title = createElement('h2', {
      textContent: this.options.title || 'Resource List'
    });
    
    const actions = createElement('div', {
      className: 'list-actions'
    });
    
    // Add search and sort controls
    this.renderSearchAndSortControls(actions);
    
    if (this.options.onCreate) {
      const createBtn = createElement('button', {
        className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_PRIMARY}`,
        textContent: 'Create New'
      });
      
      addEventListener(createBtn, 'click', () => {
        this.options.onCreate();
      });
      
      actions.appendChild(createBtn);
    }
    
    header.appendChild(title);
    header.appendChild(actions);
    this.container.appendChild(header);
  }

  /**
   * Render search and sort controls
   * @param {HTMLElement} actionsContainer - Actions container
   */
  renderSearchAndSortControls(actionsContainer) {
    const searchSortContainer = createElement('div', {
      className: 'search-sort-container'
    });
    
    // Search input and button
    const searchContainer = createElement('div', {
      className: 'search-container'
    });
    
    const searchInput = createElement('input', {
      type: 'text',
      placeholder: 'Search...',
      className: UI_CONFIG.CLASSES.FORM_CONTROL,
      id: 'search-input'
    });
    
    const searchButton = createElement('button', {
      type: 'button',
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
      textContent: 'Search'
    });
    
    // Simple search on Enter key or button click
    const performSearch = async () => {
      const searchTerm = searchInput.value.trim();
      await this.handleSearch(searchTerm);
    };
    
    addEventListener(searchInput, 'keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
    
    addEventListener(searchButton, 'click', performSearch);
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchButton);
    searchSortContainer.appendChild(searchContainer);
    
    // Sort controls
    const sortContainer = createElement('div', {
      className: 'sort-container'
    });
    
    const sortSelect = createElement('select', {
      className: UI_CONFIG.CLASSES.FORM_CONTROL,
      id: 'sort-select'
    });
    
    // Add default option
    const defaultOption = createElement('option', {
      value: '',
      textContent: 'Sort by...'
    });
    sortSelect.appendChild(defaultOption);
    
    // Add sortable columns
    const sortableColumns = this.getSortableColumns();
    sortableColumns.forEach(column => {
      const option = createElement('option', {
        value: column,
        textContent: this.formatColumnHeader(column)
      });
      sortSelect.appendChild(option);
    });
    
    addEventListener(sortSelect, 'change', (e) => {
      this.handleSort(e.target.value);
    });
    
    const sortOrderSelect = createElement('select', {
      className: UI_CONFIG.CLASSES.FORM_CONTROL,
      id: 'sort-order-select'
    });
    
    const ascOption = createElement('option', {
      value: 'ascending',
      textContent: 'Asc'
    });
    const descOption = createElement('option', {
      value: 'descending',
      textContent: 'Desc'
    });
    
    sortOrderSelect.appendChild(ascOption);
    sortOrderSelect.appendChild(descOption);
    
    addEventListener(sortOrderSelect, 'change', (e) => {
      const sortBy = document.getElementById('sort-select').value;
      if (sortBy) {
        this.handleSort(sortBy, e.target.value);
      }
    });
    
    sortContainer.appendChild(sortSelect);
    sortContainer.appendChild(sortOrderSelect);
    searchSortContainer.appendChild(sortContainer);
    
    actionsContainer.appendChild(searchSortContainer);
  }

  /**
   * Get sortable columns (override in subclasses)
   * @returns {Array} Sortable column names
   */
  getSortableColumns() {
    return this.getColumns();
  }

  /**
   * Handle search (override in subclasses)
   * @param {string} searchTerm - Search term
   */
  async handleSearch(searchTerm) {
    // Override in subclasses
  }

  /**
   * Handle sort (override in subclasses)
   * @param {string} sortBy - Sort field
   * @param {string} sortOrder - Sort order
   */
  async handleSort(sortBy, sortOrder = 'ascending') {
    // Override in subclasses
  }

  /**
   * Render filter UI (override in subclasses)
   */
  renderFilterUI() {
    // Override in subclasses for custom filter UI
  }

  /**
   * Render results information
   */
  renderResultsInfo() {
    const info = createElement('div', {
      className: 'results-info'
    });
    
    const total = this.data.length;
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, total);
    
    info.innerHTML = `
      <span>Showing ${start}-${end} of ${total} items</span>
    `;
    
    this.container.appendChild(info);
  }

  /**
   * Render data table
   */
  renderTable() {
    const tableContainer = createElement('div', {
      className: 'table-container'
    });
    
    const table = createElement('table', {
      className: UI_CONFIG.CLASSES.TABLE
    });
    
    // Create header
    const thead = createElement('thead');
    const headerRow = createElement('tr', {
      className: UI_CONFIG.CLASSES.TABLE_HEADER
    });
    
    const columns = this.getColumns();
    columns.forEach(column => {
      const th = createElement('th', {
        textContent: this.formatColumnHeader(column)
      });
      headerRow.appendChild(th);
    });
    
    // Add actions column
    const actionsTh = createElement('th', {
      textContent: 'Actions'
    });
    headerRow.appendChild(actionsTh);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = createElement('tbody');
    const paginatedData = this.getPaginatedData();
    
    paginatedData.forEach(item => {
      const row = this.createTableRow(item, columns);
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
    
    // Add pagination
    const pagination = this.createPagination();
    if (pagination) {
      tableContainer.appendChild(pagination);
    }
    
    this.container.appendChild(tableContainer);
  }

  /**
   * Format column header
   * @param {string} column - Column name
   * @returns {string} Formatted header
   */
  formatColumnHeader(column) {
    return column.replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Create table row
   * @param {Object} item - Data item
   * @param {Array} columns - Column names
   * @returns {HTMLElement} Table row
   */
  createTableRow(item, columns) {
    const row = createElement('tr', {
      className: UI_CONFIG.CLASSES.TABLE_ROW
    });
    
    columns.forEach(column => {
      const cell = createElement('td', {
        className: UI_CONFIG.CLASSES.TABLE_CELL
      });
      
      const value = this.getFieldValue(item, column);
      cell.textContent = this.formatCellValue(value, column);
      
      row.appendChild(cell);
    });
    
    // Add actions cell
    const actionsCell = createElement('td', {
      className: UI_CONFIG.CLASSES.TABLE_CELL
    });
    
    const actions = this.createItemActions(item);
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);
    
    return row;
  }

  /**
   * Get field value from nested object
   * @param {Object} item - Data item
   * @param {string} field - Field path
   * @returns {*} Field value
   */
  getFieldValue(item, field) {
    return getNestedProperty(item, field, '');
  }

  /**
   * Format cell value for display
   * @param {*} value - Cell value
   * @param {string} column - Column name
   * @returns {string} Formatted value
   */
  formatCellValue(value, column) {
    if (value === null || value === undefined) return '';
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return String(value);
  }

  /**
   * Create item action buttons
   * @param {Object} item - Data item
   * @returns {HTMLElement} Actions container
   */
  createItemActions(item) {
    const actions = createElement('div', {
      className: 'item-actions'
    });
    
    if (this.options.onEdit) {
      const editBtn = createElement('button', {
        className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
        textContent: 'Edit'
      });
      
      addEventListener(editBtn, 'click', () => {
        this.options.onEdit(item);
      });
      
      actions.appendChild(editBtn);
    }
    
    // Add View JSON button for all items
    const jsonBtn = createElement('button', {
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
      textContent: 'View JSON'
    });
    
    addEventListener(jsonBtn, 'click', () => {
      if (this.options.onViewJSON) {
        this.options.onViewJSON(item);
      }
    });
    
    actions.appendChild(jsonBtn);
    
    if (this.options.onDelete) {
      const deleteBtn = createElement('button', {
        className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_DANGER}`,
        textContent: 'Delete'
      });
      
      addEventListener(deleteBtn, 'click', () => {
        if (confirm(`Are you sure you want to delete ${this.getItemDisplayName(item)}?`)) {
          this.options.onDelete(item);
        }
      });
      
      actions.appendChild(deleteBtn);
    }
    
    return actions;
  }

  /**
   * Get paginated data
   * @returns {Array} Paginated data
   */
  getPaginatedData() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.data.slice(start, end);
  }

  /**
   * Create pagination controls
   * @returns {HTMLElement|null} Pagination container
   */
  createPagination() {
    const totalPages = Math.ceil(this.data.length / this.itemsPerPage);
    if (totalPages <= 1) return null;
    
    const pagination = createElement('div', {
      className: 'pagination'
    });
    
    // Previous button
    if (this.currentPage > 1) {
      const prevBtn = createElement('button', {
        className: UI_CONFIG.CLASSES.BTN_SECONDARY,
        textContent: 'Previous'
      });
      
      addEventListener(prevBtn, 'click', () => {
        this.currentPage--;
        this.render();
      });
      
      pagination.appendChild(prevBtn);
    }
    
    // Page info
    const pageInfo = createElement('span', {
      textContent: `Page ${this.currentPage} of ${totalPages}`
    });
    pagination.appendChild(pageInfo);
    
    // Next button
    if (this.currentPage < totalPages) {
      const nextBtn = createElement('button', {
        className: UI_CONFIG.CLASSES.BTN_SECONDARY,
        textContent: 'Next'
      });
      
      addEventListener(nextBtn, 'click', () => {
        this.currentPage++;
        this.render();
      });
      
      pagination.appendChild(nextBtn);
    }
    
    return pagination;
  }

  /**
   * Bind table events
   */
  bindTableEvents() {
    // Override in subclasses for custom event handling
  }

  /**
   * Render item details (override in subclasses)
   * @param {HTMLElement} container - Container element
   * @param {Object} item - Data item
   */
  renderItemDetails(container, item) {
    // Override in subclasses for custom detail rendering
    const details = createElement('div', {
      className: 'item-details'
    });
    
    details.innerHTML = `
      <h3>${escapeHTML(this.getItemDisplayName(item))}</h3>
      <pre>${escapeHTML(JSON.stringify(item, null, 2))}</pre>
    `;
    
    container.appendChild(details);
  }
} 