// js/group-form.js - Refactored Group Form Component

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
import { showError, showSuccess, renderJSON } from './ui-components.js';

// ============================================================================
// SCHEMA ATTRIBUTE PROCESSOR
// ============================================================================

/**
 * Process schema attributes for form rendering
 */
class SchemaAttributeProcessor {
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
      

      
      // Skip read-only fields
      if (attr.readOnly === true) return false;
      if (attr.mutability === 'readOnly') return false;
      
      // Skip complex object types
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
 * Render form fields based on attribute type
 */
class FormFieldRenderer {
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
   * Render field based on type
   * @param {Object} attr - Field attribute
   * @returns {string} HTML for field
   */
  static renderField(attr) {
    switch (attr.type) {
      case 'boolean':
        return this.renderCheckboxField(attr);
      case 'integer':
      case 'decimal':
        return this.renderNumberField(attr);
      case 'string':
      default:
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
// GROUP FORM COMPONENT
// ============================================================================

/**
 * Group form component
 */
class GroupFormComponent {
  /**
   * Create group form component
   * @param {HTMLElement} container - Container element
   * @param {Function} onSubmit - Submit callback
   * @param {Object} options - Component options
   */
  constructor(container, onSubmit, options = {}) {
    this.container = container;
    this.onSubmit = onSubmit;
    this.options = options;
    
    // Handle missing schema with fallback and warning
    this.schema = handleMissingSchema(options.schema, 'Group', this.container);
    
    this.attributes = SchemaAttributeProcessor.getEditableAttributes(this.schema);
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
   * Render the form
   */
  render() {
    clearElement(this.container);
    
    // Create form container
    const formContainer = createElement('div', {
      className: 'form-container'
    });
    
    // Create form
    this.form = createElement('form', {
      id: 'group-create-form',
      className: UI_CONFIG.CLASSES.FORM
    });
    
    // Create header
    const header = createElement('h2', {
      textContent: 'Create Group'
    });
    this.form.appendChild(header);
    
    // Render form fields
    this.renderFormFields();
    
    // Create submit button
    const submitBtn = createElement('button', {
      type: 'submit',
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_PRIMARY}`,
      textContent: 'Create Group'
    });
    this.form.appendChild(submitBtn);
    
    // Create error container
    const errorDiv = createElement('div', {
      id: 'group-form-error',
      className: UI_CONFIG.CLASSES.FORM_ERROR
    });
    this.form.appendChild(errorDiv);
    
    formContainer.appendChild(this.form);
    this.container.appendChild(formContainer);
    
    // Create request/response panel
    this.reqresPanel = createElement('div', {
      id: 'group-create-reqres-panel'
    });
    this.container.appendChild(this.reqresPanel);
  }
  
  /**
   * Render form fields
   */
  renderFormFields() {
    this.attributes.forEach(attr => {
      const fieldHTML = FormFieldRenderer.renderField(attr);
      const tempDiv = createElement('div');
      tempDiv.innerHTML = fieldHTML;
      this.form.appendChild(tempDiv.firstElementChild);
    });
  }
  
  /**
   * Bind form events
   */
  bindEvents() {
    addEventListener(this.form, 'submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }
  
  /**
   * Handle form submission
   */
  async handleSubmit() {
    return await safeAsync(async () => {
      const errorDiv = this.form.querySelector('#group-form-error');
      const groupData = { schemas: [this.schema.id] };
      const errors = [];
      
      // Collect form data
      this.attributes.forEach(attr => {
        const field = this.form.querySelector(`#${attr.name}`);
        if (!field) return;
        
        let value = field.type === 'checkbox' ? field.checked : field.value;
        
        // Validate required fields
        if (attr.required && (!value || (Array.isArray(value) && value.length === 0))) {
          errors.push(`${attr.name} is required`);
        }
        
        // Add non-empty values to group data
        if (value && (!Array.isArray(value) || value.length > 0)) {
          groupData[attr.name] = value;
        }
      });
      
      // Show validation errors
      if (errors.length > 0) {
        errorDiv.textContent = errors.join('; ');
        return;
      }
      
      // Clear error
      errorDiv.textContent = '';
      
      // Submit form
      const result = await this.onSubmit(groupData);
      
      // Show request/response if available
      if (result && result.__req && result.__res) {
        ReqResAccordion.create(result.__req, result.__res, this.reqresPanel);
      }
      
      // Show success message
      showSuccess(this.container, 'Group created successfully!');
      
    }, async (error) => {
      const parsedError = parseError(error);
      await showError(this.container, parsedError);
    });
  }
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Render group form
 * @param {HTMLElement} container - Container element
 * @param {Function} onSubmit - Submit callback
 * @param {Object} options - Form options
 */
export function renderGroupForm(container, onSubmit, options = {}) {
  return new GroupFormComponent(container, onSubmit, options);
} 