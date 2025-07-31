// js/components.js - Unified Component System

import { UI_CONFIG, FORM_CONFIG } from './config.js';
import { 
  validateElement, 
  validateFunction, 
  escapeHTML, 
  createElement, 
  addEventListener, 
  removeEventListener,
  clearElement,
  parseError,
  safeAsync,
  eventManager
} from './utils.js';

// ============================================================================
// BASE COMPONENT CLASS
// ============================================================================

/**
 * Base component class for all UI components
 * Provides common functionality like lifecycle management, error handling, and DOM manipulation
 */
export class Component {
  /**
   * Create a new component
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Component options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.state = {};
    this.elements = {};
    this.listenerIds = [];
    this.isDestroyed = false;
    
    this.validate();
    this.initialize();
  }
  
  /**
   * Validate component configuration
   * @throws {Error} If validation fails
   */
  validate() {
    validateElement(this.container, 'container');
    
    if (this.options.onError && typeof this.options.onError !== 'function') {
      throw new Error('onError must be a function');
    }
  }
  
  /**
   * Initialize the component
   */
  initialize() {
    try {
      this.render();
      this.bindEvents();
      this.mount();
    } catch (error) {
      this.handleError(error);
    }
  }
  
  /**
   * Render the component (override in subclasses)
   */
  render() {
    // Override in subclasses
  }
  
  /**
   * Bind event listeners (override in subclasses)
   */
  bindEvents() {
    // Override in subclasses
  }
  
  /**
   * Mount the component
   */
  mount() {
    // Override in subclasses if needed
  }
  
  /**
   * Set component state and re-render
   * @param {Object} newState - New state to merge
   */
  setState(newState) {
    if (this.isDestroyed) return;
    
    this.state = { ...this.state, ...newState };
    this.render();
  }
  
  /**
   * Handle errors consistently
   * @param {Error} error - Error to handle
   */
  handleError(error) {
    const parsedError = parseError(error);
    console.error('Component error:', parsedError);
    
    if (this.options.onError) {
      this.options.onError(parsedError);
    }
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    if (this.isDestroyed) return;
    
    try {
      this.container.innerHTML = `
        <div class="${UI_CONFIG.CLASSES.ERROR_MESSAGE}">
          <strong>Error:</strong> ${escapeHTML(message)}
        </div>
      `;
    } catch (error) {
      console.error('Failed to show error:', error);
    }
  }
  
  /**
   * Add event listener with tracking
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   * @returns {string} Listener ID for cleanup
   */
  addEventListener(element, event, handler, options = {}) {
    const listenerId = `${this.constructor.name}-${event}-${Date.now()}`;
    eventManager.addListener(element, event, handler, options, listenerId);
    this.listenerIds.push(listenerId);
    return listenerId;
  }
  
  /**
   * Remove event listener by ID
   * @param {string} listenerId - Listener ID
   */
  removeEventListener(listenerId) {
    eventManager.removeListener(listenerId);
    const index = this.listenerIds.indexOf(listenerId);
    if (index > -1) {
      this.listenerIds.splice(index, 1);
    }
  }
  
  /**
   * Clean up component resources
   */
  destroy() {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    // Remove all tracked event listeners
    for (const listenerId of this.listenerIds) {
      eventManager.removeListener(listenerId);
    }
    this.listenerIds = [];
    
    // Clear container
    if (this.container) {
      clearElement(this.container);
    }
    
    // Clear references
    this.container = null;
    this.elements = {};
    this.state = {};
  }
}

// ============================================================================
// MODAL COMPONENT
// ============================================================================

/**
 * Base modal component
 */
export class ModalComponent extends Component {
  constructor(container, options = {}) {
    super(container, options);
  }
  
  /**
   * Create modal overlay and container
   */
  createModal() {
    this.modalOverlay = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_OVERLAY
    });
    
    this.modalContainer = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_CONTAINER
    });
    
    this.modalOverlay.appendChild(this.modalContainer);
    document.body.appendChild(this.modalOverlay);
    
    this.elements.overlay = this.modalOverlay;
    this.elements.container = this.modalContainer;
  }
  
  /**
   * Close the modal
   */
  close() {
    if (this.modalOverlay && this.modalOverlay.parentNode) {
      this.modalOverlay.parentNode.removeChild(this.modalOverlay);
    }
    this.destroy();
  }
  
  /**
   * Bind modal events (close on outside click, escape key)
   */
  bindModalEvents() {
    // Close on overlay click
    this.addEventListener(this.modalOverlay, 'click', (event) => {
      if (event.target === this.modalOverlay) {
        this.close();
      }
    });
    
    // Close on escape key
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Store for cleanup
    this.escapeHandler = handleEscape;
  }
  
  /**
   * Override destroy to clean up escape handler
   */
  destroy() {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    
    super.destroy();
  }
}

// ============================================================================
// FORM COMPONENT
// ============================================================================

/**
 * Base form component
 */
export class FormComponent extends Component {
  constructor(container, options = {}) {
    super(container, options);
    this.formData = {};
    this.validationErrors = {};
  }
  
  /**
   * Create form element
   * @param {string} id - Form ID
   * @param {string} className - Form class name
   * @returns {HTMLFormElement} Form element
   */
  createForm(id, className = UI_CONFIG.CLASSES.FORM) {
    const form = createElement('form', {
      id: id,
      className: className
    });
    
    this.elements.form = form;
    return form;
  }
  
  /**
   * Create form field group
   * @param {Object} attr - Field attribute
   * @param {*} value - Field value
   * @returns {HTMLElement} Field group element
   */
  createFieldGroup(attr, value) {
    const group = createElement('div', {
      className: UI_CONFIG.CLASSES.FORM_GROUP
    });
    
    const label = createElement('label', {
      className: UI_CONFIG.CLASSES.FORM_LABEL,
      htmlFor: attr.name,
      textContent: this.getFieldLabel(attr)
    });
    
    const control = this.createFieldControl(attr, value);
    
    group.appendChild(label);
    group.appendChild(control);
    
    return group;
  }
  
  /**
   * Create field control based on type
   * @param {Object} attr - Field attribute
   * @param {*} value - Field value
   * @returns {HTMLElement} Control element
   */
  createFieldControl(attr, value) {
    const escapedValue = escapeHTML(value !== undefined && value !== null ? value : '');
    const required = attr.required ? 'required' : '';
    
    switch (attr.type) {
      case 'boolean':
        return this.createCheckboxControl(attr, value, required);
        
      case 'integer':
      case 'decimal':
        return this.createNumberControl(attr, escapedValue, required);
        
      default:
        return this.createTextControl(attr, escapedValue, required);
    }
  }
  
  /**
   * Create text input control
   * @param {Object} attr - Field attribute
   * @param {string} value - Field value
   * @param {string} required - Required attribute
   * @returns {HTMLElement} Text input
   */
  createTextControl(attr, value, required) {
    const input = createElement('input', {
      type: 'text',
      id: attr.name,
      name: attr.name,
      className: UI_CONFIG.CLASSES.FORM_CONTROL,
      value: value,
      required: required
    });
    
    if (attr.multiValued) {
      input.placeholder = 'comma,separated,values';
    }
    
    return input;
  }
  
  /**
   * Create number input control
   * @param {Object} attr - Field attribute
   * @param {string} value - Field value
   * @param {string} required - Required attribute
   * @returns {HTMLElement} Number input
   */
  createNumberControl(attr, value, required) {
    return createElement('input', {
      type: 'number',
      id: attr.name,
      name: attr.name,
      className: UI_CONFIG.CLASSES.FORM_CONTROL,
      value: value,
      required: required
    });
  }
  
  /**
   * Create checkbox control
   * @param {Object} attr - Field attribute
   * @param {*} value - Field value
   * @param {string} required - Required attribute
   * @returns {HTMLElement} Checkbox container
   */
  createCheckboxControl(attr, value, required) {
    const container = createElement('div', {
      className: UI_CONFIG.CLASSES.FORM_CHECKBOX_LABEL
    });
    
    const checkbox = createElement('input', {
      type: 'checkbox',
      id: attr.name,
      name: attr.name,
      className: UI_CONFIG.CLASSES.FORM_CHECKBOX,
      checked: value ? 'checked' : '',
      required: required
    });
    
    const text = createElement('span', {
      className: UI_CONFIG.CLASSES.FORM_CHECKBOX_TEXT,
      textContent: this.getFieldLabel(attr)
    });
    
    container.appendChild(checkbox);
    container.appendChild(text);
    
    return container;
  }
  
  /**
   * Get field label
   * @param {Object} attr - Field attribute
   * @returns {string} Field label
   */
  getFieldLabel(attr) {
    return attr.name + (attr.required ? ' *' : '');
  }
  
  /**
   * Collect form data
   * @returns {Object} Form data
   */
  collectFormData() {
    if (!this.elements.form) return {};
    
    const formData = {};
    const form = this.elements.form;
    
    // Get all form inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      let value;
      
      if (input.type === 'checkbox') {
        value = input.checked;
      } else {
        value = input.value;
      }
      
      if (value !== undefined && value !== '') {
        formData[input.name] = value;
      }
    });
    
    return formData;
  }
  
  /**
   * Validate form data
   * @param {Object} formData - Form data to validate
   * @param {Array} attributes - Schema attributes
   * @returns {boolean} True if valid
   */
  validateFormData(formData, attributes) {
    this.validationErrors = {};
    
    attributes.forEach(attr => {
      if (attr.required && (!formData[attr.name] || formData[attr.name] === '')) {
        this.validationErrors[attr.name] = `${attr.name} is required`;
      }
    });
    
    return Object.keys(this.validationErrors).length === 0;
  }
  
  /**
   * Show validation errors
   */
  showValidationErrors() {
    if (!this.elements.form) return;
    
    // Clear existing errors
    const existingErrors = this.elements.form.querySelectorAll(`.${UI_CONFIG.CLASSES.FORM_ERROR}`);
    existingErrors.forEach(error => error.remove());
    
    // Show new errors
    Object.entries(this.validationErrors).forEach(([fieldName, message]) => {
      const field = this.elements.form.querySelector(`[name="${fieldName}"]`);
      if (field) {
        const errorDiv = createElement('div', {
          className: UI_CONFIG.CLASSES.FORM_ERROR,
          textContent: message
        });
        field.parentNode.appendChild(errorDiv);
      }
    });
  }
}

// ============================================================================
// LIST COMPONENT
// ============================================================================

/**
 * Base list component
 */
export class ListComponent extends Component {
  constructor(container, options = {}) {
    super(container, options);
    this.data = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.itemsPerPage = options.itemsPerPage || 50;
  }
  
  /**
   * Set list data
   * @param {Array} data - List data
   */
  setData(data) {
    this.data = Array.isArray(data) ? data : [];
    this.filteredData = [...this.data];
    this.currentPage = 1;
    this.render();
  }
  
  /**
   * Filter list data
   * @param {string} searchTerm - Search term
   * @param {Array} searchFields - Fields to search in
   */
  filterData(searchTerm, searchFields) {
    if (!searchTerm || searchTerm.length < 2) {
      this.filteredData = [...this.data];
      return;
    }
    
    const term = searchTerm.toLowerCase();
    this.filteredData = this.data.filter(item => {
      return searchFields.some(field => {
        const value = this.getFieldValue(item, field);
        return value && value.toLowerCase().includes(term);
      });
    });
    
    this.currentPage = 1;
    this.render();
  }
  
  /**
   * Get field value from nested object
   * @param {Object} item - Data item
   * @param {string} field - Field path
   * @returns {*} Field value
   */
  getFieldValue(item, field) {
    if (!item || typeof item !== 'object') return null;
    
    return field.split('.').reduce((obj, key) => {
      return obj && typeof obj === 'object' ? obj[key] : null;
    }, item);
  }
  
  /**
   * Create table element
   * @param {Array} columns - Table columns
   * @returns {HTMLElement} Table element
   */
  createTable(columns) {
    const table = createElement('table', {
      className: UI_CONFIG.CLASSES.TABLE
    });
    
    // Create header
    const thead = createElement('thead');
    const headerRow = createElement('tr', {
      className: UI_CONFIG.CLASSES.TABLE_HEADER
    });
    
    columns.forEach(column => {
      const th = createElement('th', {
        textContent: column.label || column.key
      });
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = createElement('tbody');
    table.appendChild(tbody);
    
    this.elements.table = table;
    this.elements.tbody = tbody;
    
    return table;
  }
  
  /**
   * Create table row
   * @param {Object} item - Data item
   * @param {Array} columns - Table columns
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
      
      const value = this.getFieldValue(item, column.key);
      cell.textContent = this.formatCellValue(value, column);
      
      row.appendChild(cell);
    });
    
    return row;
  }
  
  /**
   * Format cell value for display
   * @param {*} value - Cell value
   * @param {Object} column - Column definition
   * @returns {string} Formatted value
   */
  formatCellValue(value, column) {
    if (value === null || value === undefined) return '';
    
    if (column.formatter && typeof column.formatter === 'function') {
      return column.formatter(value);
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    return String(value);
  }
  
  /**
   * Get paginated data
   * @returns {Array} Paginated data
   */
  getPaginatedData() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredData.slice(start, end);
  }
  
  /**
   * Create pagination controls
   * @returns {HTMLElement} Pagination container
   */
  createPagination() {
    const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
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
      
      this.addEventListener(prevBtn, 'click', () => {
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
      
      this.addEventListener(nextBtn, 'click', () => {
        this.currentPage++;
        this.render();
      });
      
      pagination.appendChild(nextBtn);
    }
    
    return pagination;
  }
}

// ============================================================================
// EXPORT ALL COMPONENTS
// ============================================================================

export default {
  Component,
  ModalComponent,
  FormComponent,
  ListComponent
}; 