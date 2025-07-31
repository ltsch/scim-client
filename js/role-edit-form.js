// js/role-edit-form.js - Refactored Role Edit Form

import { RESOURCE_CONFIG, UI_CONFIG, FORM_CONFIG } from './config.js';
import {
  validateElement,
  validateRequired,
  validateFunction,
  escapeHTML,
  createElement,
  addEventListener,
  clearElement,
  parseError,
  safeAsync,
  handleMissingSchema,
  formatReadonlyValue,
  safeRenderJSON,
  debugComplexFields,
  detectComplexFields,
  renderAllFields
} from './utils.js';
import { renderJSON, showError, showSuccess, showLoading } from './ui-components.js';

// ============================================================================
// SCHEMA ATTRIBUTE PROCESSOR
// ============================================================================

/**
 * Process schema attributes for role edit form
 */
class RoleSchemaAttributeProcessor {
  /**
   * Get editable attributes from schema
   * @param {Object} schema - Schema object
   * @returns {Array} Editable attributes
   */
  static getEditableAttributes(schema) {
    if (!schema || !Array.isArray(schema.attributes)) return [];
    
    return schema.attributes.filter(attr => {
      // Skip system fields
      if (FORM_CONFIG.SYSTEM_FIELDS.includes(attr.name)) return false;
      if (attr.name === 'schemas') return false;
      

      
      // Include fields that are not explicitly read-only
      if (attr.readOnly === true) return false;
      if (attr.mutability === 'readOnly') return false;
      
      // Exclude complex object types that should be rendered as JSON
      if (attr.type === 'complex' || attr.type === 'object') return false;
      if (attr.multiValued && attr.type !== 'string') return false;
      
      // Include supported types
      return FORM_CONFIG.SUPPORTED_TYPES.includes(attr.type);
    });
  }
  
  /**
   * Get complex fields from schema and role data
   * @param {Object} schema - Schema object
   * @param {Object} role - Role data
   * @returns {Array} Complex fields
   */
  static getComplexFields(schema, role) {
    if (!schema || !Array.isArray(schema.attributes)) return [];
    
    // Dynamically detect complex fields based on data type
    const complexFields = detectComplexFields(role);
    
    // Debug logging to understand what's happening
    console.log('Complex fields found:', complexFields);
    console.log('Role data keys:', Object.keys(role));
    
    return complexFields;
  }
  
  /**
   * Get readonly fields from role data
   * @param {Object} role - Role data
   * @returns {Array} Readonly fields
   */
  static getReadonlyFields(role) {
    return Object.keys(role).filter(key => 
      !FORM_CONFIG.SYSTEM_FIELDS.includes(key) && 
      key !== 'schemas'
    );
  }
}

// ============================================================================
// FORM FIELD RENDERER
// ============================================================================

/**
 * Render form fields for role edit form
 */
class RoleFormFieldRenderer {
  /**
   * Render text field
   * @param {Object} attr - Field attribute
   * @param {*} value - Field value
   * @returns {string} HTML for text field
   */
  static renderTextField(attr, value) {
    const required = attr.required ? 'required' : '';
    const label = attr.name + (attr.required ? ' *' : '');
    const escapedValue = escapeHTML(value !== undefined && value !== null ? value : '');
    
    return `
      <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
        <label for="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_LABEL}">${escapeHTML(label)}</label>
        <input type="text" id="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_CONTROL}" value="${escapedValue}" ${required}>
      </div>
    `;
  }
  
  /**
   * Render textarea field
   * @param {Object} attr - Field attribute
   * @param {*} value - Field value
   * @returns {string} HTML for textarea field
   */
  static renderTextareaField(attr, value) {
    const required = attr.required ? 'required' : '';
    const label = attr.name + (attr.required ? ' *' : '');
    const escapedValue = escapeHTML(value !== undefined && value !== null ? value : '');
    
    return `
      <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
        <label for="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_LABEL}">${escapeHTML(label)}</label>
        <textarea id="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_CONTROL}" rows="3" ${required}>${escapedValue}</textarea>
      </div>
    `;
  }
  
  /**
   * Render number field
   * @param {Object} attr - Field attribute
   * @param {*} value - Field value
   * @returns {string} HTML for number field
   */
  static renderNumberField(attr, value) {
    const required = attr.required ? 'required' : '';
    const label = attr.name + (attr.required ? ' *' : '');
    const escapedValue = escapeHTML(value !== undefined && value !== null ? value : '');
    
    return `
      <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
        <label for="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_LABEL}">${escapeHTML(label)}</label>
        <input type="number" id="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_CONTROL}" value="${escapedValue}" ${required}>
      </div>
    `;
  }
  
  /**
   * Render checkbox field
   * @param {Object} attr - Field attribute
   * @param {*} value - Field value
   * @returns {string} HTML for checkbox field
   */
  static renderCheckboxField(attr, value) {
    const required = attr.required ? 'required' : '';
    const label = attr.name + (attr.required ? ' *' : '');
    const checked = value === true ? 'checked' : '';
    
    return `
      <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
        <label class="${UI_CONFIG.CLASSES.FORM_LABEL} ${UI_CONFIG.CLASSES.FORM_CHECKBOX_LABEL}">
          <input type="checkbox" id="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_CHECKBOX}" ${checked} ${required}>
          <span class="${UI_CONFIG.CLASSES.FORM_CHECKBOX_TEXT}">${escapeHTML(label)}</span>
        </label>
      </div>
    `;
  }
  
  /**
   * Render multi-valued field
   * @param {Object} attr - Field attribute
   * @param {*} value - Field value
   * @returns {string} HTML for multi-valued field
   */
  static renderMultiValuedField(attr, value) {
    const required = attr.required ? 'required' : '';
    const label = attr.name + (attr.required ? ' *' : '');
    const escapedValue = Array.isArray(value) ? value.join(', ') : escapeHTML(value || '');
    
    return `
      <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
        <label for="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_LABEL}">${escapeHTML(label)}</label>
        <input type="text" id="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_CONTROL}" value="${escapedValue}" ${required}>
        <small>Separate multiple values with commas</small>
      </div>
    `;
  }
  
  /**
   * Render field based on type
   * @param {Object} attr - Field attribute
   * @param {*} value - Field value
   * @returns {string} HTML for field
   */
  static renderField(attr, value) {
    if (attr.multiValued) {
      return this.renderMultiValuedField(attr, value);
    }
    
    switch (attr.type) {
      case 'boolean':
        return this.renderCheckboxField(attr, value);
      case 'integer':
      case 'decimal':
        return this.renderNumberField(attr, value);
      case 'string':
      default:
        // Use textarea for description fields
        if (attr.name === 'description') {
          return this.renderTextareaField(attr, value);
        }
        return this.renderTextField(attr, value);
    }
  }
}

// ============================================================================
// REQUEST/RESPONSE ACCORDION
// ============================================================================

/**
 * Create request/response accordion
 */
class ReqResAccordion {
  /**
   * Create accordion for request/response display
   * @param {Object} req - Request data
   * @param {Object} res - Response data
   * @param {HTMLElement} container - Container element
   */
  static create(req, res, container) {
    clearElement(container);
    
    const accordion = createElement('div', {
      className: UI_CONFIG.CLASSES.REQRES_ACCORDION
    });
    
    const toggleBtn = createElement('button', {
      className: UI_CONFIG.CLASSES.REQRES_TOGGLE_BTN,
      textContent: 'Show Raw Request/Response'
    });
    
    const panel = createElement('div', {
      className: UI_CONFIG.CLASSES.REQRES_PANEL
    });
    
    accordion.appendChild(toggleBtn);
    accordion.appendChild(panel);
    
    addEventListener(toggleBtn, 'click', () => {
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        toggleBtn.textContent = 'Hide Raw Request/Response';
        clearElement(panel);
        renderJSON(panel, { request: req, response: res });
      } else {
        panel.classList.add('hidden');
        toggleBtn.textContent = 'Show Raw Request/Response';
      }
    });
    
    container.appendChild(accordion);
  }
}

// ============================================================================
// ROLE EDIT FORM RENDERER
// ============================================================================

/**
 * Role edit form renderer
 */
class RoleEditFormRenderer {
  /**
   * Create role edit form renderer
   * @param {HTMLElement} container - Container element
   * @param {Object} role - Role data
   * @param {Function} onSubmit - Submit callback
   * @param {Object} options - Component options
   */
  constructor(container, role, onSubmit, options = {}) {
    this.container = container;
    this.role = role;
    this.onSubmit = onSubmit;
    this.options = options;
    
    // Handle missing schema with fallback and warning
    this.schema = handleMissingSchema(options.schema, 'Role', this.container);
    
    // No longer need separate field arrays - we'll use detectComplexFields dynamically
    this.modalOverlay = null;
    this.modalContainer = null;
    this.form = null;
    
    this.validate();
    this.render();
    this.bindFormEvents();
  }
  
  /**
   * Validate component configuration
   * @throws {Error} If validation fails
   */
  validate() {
    validateElement(this.container, 'container');
    validateFunction(this.onSubmit, 'onSubmit');
    
    if (!this.role) {
      throw new Error('Role data is required');
    }
    
    // Schema validation is now handled in constructor with fallback
  }
  
  /**
   * Render the form
   */
  render() {
    this.createModal();
    this.renderAllFields();
  }
  
  /**
   * Create modal structure
   */
  createModal() {
    this.modalOverlay = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_OVERLAY
    });
    
    this.modalContainer = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_CONTAINER
    });
    
    const header = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_HEADER
    });
    
    const title = createElement('h2', {
      textContent: `Edit Role: ${escapeHTML(this.role.displayName || this.role.id)}`
    });
    
    const closeBtn = createElement('button', {
      className: UI_CONFIG.CLASSES.MODAL_CLOSE,
      textContent: '×'
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    const body = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_BODY
    });
    
    this.form = createElement('form', {
      id: 'role-edit-form',
      className: UI_CONFIG.CLASSES.FORM
    });
    
    body.appendChild(this.form);
    
    const footer = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_FOOTER
    });
    
    const submitBtn = createElement('button', {
      type: 'submit',
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_PRIMARY}`,
      textContent: 'Save Changes'
    });
    
    const cancelBtn = createElement('button', {
      type: 'button',
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
      textContent: 'Cancel'
    });
    
    footer.appendChild(submitBtn);
    footer.appendChild(cancelBtn);
    
    this.modalContainer.appendChild(header);
    this.modalContainer.appendChild(body);
    this.modalContainer.appendChild(footer);
    this.modalOverlay.appendChild(this.modalContainer);
    document.body.appendChild(this.modalOverlay);
  }
  
  /**
   * Render all fields using the centralized renderAllFields function
   */
  renderAllFields() {
    renderAllFields(this.form, this.role, this.schema, {
      systemFields: FORM_CONFIG.SYSTEM_FIELDS,
      readonly: true // Edit forms are readonly for now
    });
  }
  
  /**
   * Bind form events
   */
  bindFormEvents() {
    addEventListener(this.form, 'submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    
    // Setup modal manager
    this.modalManager = new ModalManager(this.modalOverlay);
  }
  
  /**
   * Handle form submission
   */
  async handleSubmit() {
    return await safeAsync(async () => {
      // Since this is now a readonly form, just close the modal
      this.modalManager.close();
    }, async (error) => {
      const parsedError = parseError(error);
      await showError(this.form, parsedError);
    });
  }
}

// ============================================================================
// MODAL MANAGER (Reused from user-edit-form.js)
// ============================================================================

/**
 * Modal manager for role edit form
 */
class ModalManager {
  /**
   * Create modal manager
   * @param {HTMLElement} modalOverlay - Modal overlay element
   */
  constructor(modalOverlay) {
    this.modalOverlay = modalOverlay;
    this.setupEventListeners();
  }
  
  /**
   * Setup modal event listeners
   */
  setupEventListeners() {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Close on overlay click
    addEventListener(this.modalOverlay, 'click', (event) => {
      if (event.target === this.modalOverlay) {
        this.close();
      }
    });
    
    // Close button
    const closeBtn = this.modalOverlay.querySelector(`.${UI_CONFIG.CLASSES.MODAL_CLOSE}`);
    if (closeBtn) {
      addEventListener(closeBtn, 'click', () => {
        this.close();
      });
    }
  }
  
  /**
   * Close the modal
   */
  close() {
    if (this.modalOverlay && this.modalOverlay.parentNode) {
      this.modalOverlay.parentNode.removeChild(this.modalOverlay);
    }
  }
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Render role edit form
 * @param {HTMLElement} container - Container element
 * @param {Object} role - Role data
 * @param {Function} onSubmit - Submit callback
 * @param {Object} options - Form options
 */
export function renderRoleEditForm(container, role, onSubmit, options = {}) {
  return new RoleEditFormRenderer(container, role, onSubmit, options);
}