// js/user-form.js - Refactored User Form Component

import { RESOURCE_CONFIG, UI_CONFIG, FORM_CONFIG } from './config.js';
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
import { showError, showSuccess, renderJSON } from './ui-components.js';
import { FormComponent } from './components.js';

// ============================================================================
// USER FORM COMPONENT
// ============================================================================

/**
 * User form component extending base form component
 */
class UserFormComponent extends FormComponent {
  /**
   * Create user form component
   * @param {HTMLElement} container - Container element
   * @param {Function} onSubmit - Form submission callback
   * @param {Object} options - Component options
   */
  constructor(container, onSubmit, options = {}) {
    super(container, options);
    this.onSubmit = onSubmit;
    this.schema = options.schema;
    this.userData = options.userData || {};
    
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
    if (this.onSubmit && typeof this.onSubmit !== 'function') {
      throw new Error('onSubmit must be a function');
    }
  }

  /**
   * Render the user form
   */
  render() {
    clearElement(this.container);
    
    const formContainer = createElement('div', {
      className: 'user-form-container'
    });
    
    const form = this.createForm('user-form', UI_CONFIG.CLASSES.FORM);
    
    // Form header
    const header = createElement('div', {
      className: 'form-header'
    });
    
    header.innerHTML = `
      <h2>${this.userData.id ? 'Edit User' : 'Create User'}</h2>
      <p class="form-description">Manage SCIM User attributes</p>
    `;
    
    form.appendChild(header);
    
    // Required fields section
    const requiredSection = createElement('div', {
      className: 'form-section'
    });
    
    const requiredTitle = createElement('h3', {
      textContent: 'Required Fields'
    });
    requiredSection.appendChild(requiredTitle);
    
    // Username field
    const userNameGroup = this.createFieldGroup({
      name: 'userName',
      type: 'string',
      required: true,
      description: 'Unique username for the user'
    }, this.userData.userName);
    requiredSection.appendChild(userNameGroup);
    
    // Display name field
    const displayNameGroup = this.createFieldGroup({
      name: 'displayName',
      type: 'string',
      required: true,
      description: 'Display name for the user'
    }, this.userData.displayName);
    requiredSection.appendChild(displayNameGroup);
    
    form.appendChild(requiredSection);
    
    // Optional fields section
    const optionalSection = createElement('div', {
      className: 'form-section'
    });
    
    const optionalTitle = createElement('h3', {
      textContent: 'Optional Fields'
    });
    optionalSection.appendChild(optionalTitle);
    
    // Email field
    const emailGroup = this.createFieldGroup({
      name: 'email',
      type: 'string',
      required: false,
      description: 'Primary email address'
    }, this.userData.email);
    optionalSection.appendChild(emailGroup);
    
    // Given name field
    const givenNameGroup = this.createFieldGroup({
      name: 'givenName',
      type: 'string',
      required: false,
      description: 'First name'
    }, this.userData.givenName);
    optionalSection.appendChild(givenNameGroup);
    
    // Family name field
    const familyNameGroup = this.createFieldGroup({
      name: 'familyName',
      type: 'string',
      required: false,
      description: 'Last name'
    }, this.userData.familyName);
    optionalSection.appendChild(familyNameGroup);
    
    // Active field
    const activeGroup = this.createFieldGroup({
      name: 'active',
      type: 'boolean',
      required: false,
      description: 'Whether the user is active'
    }, this.userData.active !== undefined ? this.userData.active : true);
    optionalSection.appendChild(activeGroup);
    
    form.appendChild(optionalSection);
    
    // Advanced fields section
    const advancedSection = createElement('div', {
      className: 'form-section'
    });
    
    const advancedTitle = createElement('h3', {
      textContent: 'Advanced Options'
    });
    advancedSection.appendChild(advancedTitle);
    
    // External ID field
    const externalIdGroup = this.createFieldGroup({
      name: 'externalId',
      type: 'string',
      required: false,
      description: 'External identifier'
    }, this.userData.externalId);
    advancedSection.appendChild(externalIdGroup);
    
    form.appendChild(advancedSection);
    
    // Form actions
    const actions = createElement('div', {
      className: 'form-actions'
    });
    
    const submitButton = createElement('button', {
      type: 'submit',
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_PRIMARY}`,
      textContent: this.userData.id ? 'Update User' : 'Create User'
    });
    
    const cancelButton = createElement('button', {
      type: 'button',
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
      textContent: 'Cancel'
    });
    
    addEventListener(cancelButton, 'click', () => {
      if (this.options.onCancel) {
        this.options.onCancel();
      }
    });
    
    actions.appendChild(submitButton);
    actions.appendChild(cancelButton);
    form.appendChild(actions);
    
    formContainer.appendChild(form);
    this.container.appendChild(formContainer);
  }

  /**
   * Bind form events
   */
  bindEvents() {
    const form = this.elements.form;
    if (!form) return;
    
    addEventListener(form, 'submit', (event) => {
      event.preventDefault();
      this.handleSubmit();
    });
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    return await safeAsync(async () => {
      const formData = this.collectFormData();
      
      // Validate required fields
      if (!formData.userName || !formData.displayName) {
        this.showValidationError('Username and Display Name are required.');
        return;
      }
      
      // Build SCIM User data with proper structure
      const userData = {
        schemas: [RESOURCE_CONFIG.USER.SCHEMA]
      };
      
      // Add form data to user data
      Object.assign(userData, formData);
      
      // Handle email as complex attribute if provided
      if (formData.email) {
        userData.emails = [{
          value: formData.email,
          primary: true,
          type: 'work'
        }];
        delete userData.email;
      }
      
      // Handle name as complex attribute if provided
      if (formData.givenName || formData.familyName) {
        userData.name = {};
        if (formData.givenName) userData.name.givenName = formData.givenName;
        if (formData.familyName) userData.name.familyName = formData.familyName;
        delete userData.givenName;
        delete userData.familyName;
      }
      
      // Call onSubmit callback
      if (this.onSubmit) {
        await this.onSubmit(userData);
      }
      
    }, (error) => {
      this.showValidationError(error.message);
    });
  }

  /**
   * Show validation error
   * @param {string} message - Error message
   */
  showValidationError(message) {
    const form = this.elements.form;
    if (!form) return;
    
    // Remove existing error
    const existingError = form.querySelector('.form-error');
    if (existingError) {
      existingError.remove();
    }
    
    // Add new error
    const errorDiv = createElement('div', {
      className: UI_CONFIG.CLASSES.FORM_ERROR,
      textContent: message
    });
    
    form.appendChild(errorDiv);
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    showSuccess(this.container, message);
  }
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Render user form
 * @param {HTMLElement} container - Container element
 * @param {Function} onSubmit - Form submission callback
 * @param {Object} options - Render options
 */
export function renderUserForm(container, onSubmit, options = {}) {
  return safeAsync(() => {
    validateElement(container, 'container');
    validateRequired(onSubmit, 'onSubmit callback');
    
    const userForm = new UserFormComponent(container, onSubmit, options);
    
    return userForm;
  }, async (error) => {
    await showError(container, error);
  });
} 