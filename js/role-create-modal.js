// js/role-create-modal.js - Refactored Role Create Modal

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
  handleMissingSchema
} from './utils.js';
import { renderJSON, showError, showSuccess } from './ui-components.js';

// ============================================================================
// SCHEMA ATTRIBUTE PROCESSOR
// ============================================================================

/**
 * Process schema attributes for role create modal
 */
class RoleCreateSchemaAttributeProcessor {
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
}

// ============================================================================
// FORM FIELD RENDERER
// ============================================================================

/**
 * Render form fields for role create modal
 */
class RoleCreateFormFieldRenderer {
  /**
   * Render text field
   * @param {Object} attr - Field attribute
   * @returns {string} HTML for text field
   */
  static renderTextField(attr) {
    const required = attr.required ? 'required' : '';
    const label = attr.name + (attr.required ? ' *' : '');
    
    return `
      <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
        <label for="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_LABEL}">${escapeHTML(label)}</label>
        <input type="text" id="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_CONTROL}" ${required}>
      </div>
    `;
  }
  
  /**
   * Render textarea field
   * @param {Object} attr - Field attribute
   * @returns {string} HTML for textarea field
   */
  static renderTextareaField(attr) {
    const required = attr.required ? 'required' : '';
    const label = attr.name + (attr.required ? ' *' : '');
    
    return `
      <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
        <label for="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_LABEL}">${escapeHTML(label)}</label>
        <textarea id="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_CONTROL}" rows="3" ${required}></textarea>
      </div>
    `;
  }
  
  /**
   * Render number field
   * @param {Object} attr - Field attribute
   * @returns {string} HTML for number field
   */
  static renderNumberField(attr) {
    const required = attr.required ? 'required' : '';
    const label = attr.name + (attr.required ? ' *' : '');
    
    return `
      <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
        <label for="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_LABEL}">${escapeHTML(label)}</label>
        <input type="number" id="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_CONTROL}" ${required}>
      </div>
    `;
  }
  
  /**
   * Render checkbox field
   * @param {Object} attr - Field attribute
   * @returns {string} HTML for checkbox field
   */
  static renderCheckboxField(attr) {
    const required = attr.required ? 'required' : '';
    const label = attr.name + (attr.required ? ' *' : '');
    
    return `
      <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
        <label class="${UI_CONFIG.CLASSES.FORM_LABEL} ${UI_CONFIG.CLASSES.FORM_CHECKBOX_LABEL}">
          <input type="checkbox" id="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_CHECKBOX}" ${required}>
          <span class="${UI_CONFIG.CLASSES.FORM_CHECKBOX_TEXT}">${escapeHTML(label)}</span>
        </label>
      </div>
    `;
  }
  
  /**
   * Render multi-valued field
   * @param {Object} attr - Field attribute
   * @returns {string} HTML for multi-valued field
   */
  static renderMultiValuedField(attr) {
    const required = attr.required ? 'required' : '';
    const label = attr.name + (attr.required ? ' *' : '');
    
    return `
      <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
        <label for="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_LABEL}">${escapeHTML(label)}</label>
        <input type="text" id="${attr.name}" class="${UI_CONFIG.CLASSES.FORM_CONTROL}" ${required}>
        <small>Separate multiple values with commas</small>
      </div>
    `;
  }
  
  /**
   * Render field based on type
   * @param {Object} attr - Field attribute
   * @returns {string} HTML for field
   */
  static renderField(attr) {
    if (attr.multiValued) {
      return this.renderMultiValuedField(attr);
    }
    
    switch (attr.type) {
      case 'boolean':
        return this.renderCheckboxField(attr);
      case 'integer':
      case 'decimal':
        return this.renderNumberField(attr);
      case 'string':
      default:
        // Use textarea for description fields
        if (attr.name === 'description') {
          return this.renderTextareaField(attr);
        }
        return this.renderTextField(attr);
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
// ROLE CREATE MODAL RENDERER
// ============================================================================

/**
 * Role create modal renderer
 */
class RoleCreateModalRenderer {
  /**
   * Create role create modal renderer
   * @param {HTMLElement} container - Container element
   * @param {Function} onSubmit - Submit callback
   * @param {Object} options - Component options
   */
  constructor(container, onSubmit, options = {}) {
    this.container = container;
    this.onSubmit = onSubmit;
    this.options = options;
    
    // Handle missing schema with fallback and warning
    this.schema = handleMissingSchema(options.schema, 'Role', this.container);
    
    this.attributes = RoleCreateSchemaAttributeProcessor.getEditableAttributes(this.schema);
    this.modalOverlay = null;
    this.modalContainer = null;
    this.form = null;
    this.reqresPanel = null;
    
    this.validate();
    this.render();
    this.bindEvents();
  }
  
  /**
   * Validate component configuration
   * @throws {Error} If validation fails
   */
  validate() {
    validateElement(this.container, 'container');
    validateFunction(this.onSubmit, 'onSubmit');
    
    // Schema validation is now handled in constructor with fallback
  }
  
  /**
   * Render the modal
   */
  render() {
    this.createModal();
    this.renderFormFields();
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
      textContent: 'Create Role'
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
      id: 'role-create-form',
      className: UI_CONFIG.CLASSES.FORM
    });
    
    body.appendChild(this.form);
    
    // Create request/response panel
    this.reqresPanel = createElement('div', {
      id: 'role-create-reqres-panel'
    });
    body.appendChild(this.reqresPanel);
    
    const footer = createElement('div', {
      className: UI_CONFIG.CLASSES.MODAL_FOOTER
    });
    
    const submitBtn = createElement('button', {
      type: 'submit',
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_PRIMARY}`,
      textContent: 'Create Role'
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
   * Render form fields
   */
  renderFormFields() {
    this.attributes.forEach(attr => {
      const fieldHTML = RoleCreateFormFieldRenderer.renderField(attr);
      const tempDiv = createElement('div');
      tempDiv.innerHTML = fieldHTML;
      this.form.appendChild(tempDiv.firstElementChild);
    });
  }
  
  /**
   * Bind form events
   */
  bindEvents() {
    // Form submission
    addEventListener(this.form, 'submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    
    // Close button
    const closeBtn = this.modalOverlay.querySelector(`.${UI_CONFIG.CLASSES.MODAL_CLOSE}`);
    addEventListener(closeBtn, 'click', () => {
      this.close();
    });
    
    // Cancel button
    const cancelBtn = this.modalOverlay.querySelector('.modal-footer button:last-child');
    addEventListener(cancelBtn, 'click', () => {
      this.close();
    });
    
    // Close on overlay click
    addEventListener(this.modalOverlay, 'click', (event) => {
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
  }
  
  /**
   * Close the modal
   */
  close() {
    if (this.modalOverlay && this.modalOverlay.parentNode) {
      this.modalOverlay.parentNode.removeChild(this.modalOverlay);
    }
  }
  
  /**
   * Handle form submission
   */
  async handleSubmit() {
    return await safeAsync(async () => {
      const roleData = { schemas: [this.schema.id] };
      const errors = [];
      
      // Collect form data
      this.attributes.forEach(attr => {
        const field = this.form.querySelector(`#${attr.name}`);
        if (!field) return;
        
        let value = field.type === 'checkbox' ? field.checked : field.value;
        
        // Handle multi-valued fields
        if (attr.multiValued && typeof value === 'string') {
          value = value.split(',').map(v => v.trim()).filter(v => v);
        }
        
        // Validate required fields
        if (attr.required && (!value || (Array.isArray(value) && value.length === 0))) {
          errors.push(`${attr.name} is required`);
        }
        
        // Add non-empty values to role data
        if (value && (!Array.isArray(value) || value.length > 0)) {
          roleData[attr.name] = value;
        }
      });
      
      // Show validation errors
      if (errors.length > 0) {
        await showError(this.form, errors.join('; '));
        return;
      }
      
      // Submit form
      const result = await this.onSubmit(roleData);
      
      // Show request/response if available
      if (result && result.__req && result.__res) {
        ReqResAccordion.create(result.__req, result.__res, this.reqresPanel);
      }
      
      // Show success message
      showSuccess(this.container, 'Role created successfully!');
      
      // Close modal
      this.close();
      
    }, async (error) => {
      const parsedError = parseError(error);
      await showError(this.form, parsedError);
    });
  }
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Render role create modal
 * @param {HTMLElement} container - Container element
 * @param {Function} onSubmit - Submit callback
 * @param {Object} options - Modal options
 */
export function renderRoleCreateModal(container, onSubmit, options = {}) {
  return new RoleCreateModalRenderer(container, onSubmit, options);
} 