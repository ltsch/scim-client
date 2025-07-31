// js/role-form.js - Refactored Role Form Component

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
  safeAsync
} from './utils.js';
import { showError, showLoading, showSuccess, renderJSON } from './ui-components.js';

// ============================================================================
// ROLE FORM COMPONENT
// ============================================================================

/**
 * Role form component
 */
class RoleFormComponent {
  /**
   * Create role form component
   * @param {HTMLElement} container - Container element
   * @param {Object} client - SCIM client
   * @param {HTMLElement} mainPanel - Main panel for navigation
   * @param {HTMLElement} reqResPanel - Request/response panel
   */
  constructor(container, client, mainPanel, reqResPanel) {
    this.container = container;
    this.client = client;
    this.mainPanel = mainPanel;
    this.reqResPanel = reqResPanel;
    this.form = null;
    
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
    validateElement(this.mainPanel, 'mainPanel');
    
    if (!this.client) {
      throw new Error('SCIM client is required');
    }
  }
  
  /**
   * Render the form
   */
  render() {
    clearElement(this.container);
    
    // Create section header
    const header = createElement('div', {
      className: 'section-header'
    });
    
    const title = createElement('h2', {
      textContent: 'Create Role'
    });
    
    const backBtn = createElement('button', {
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
      innerHTML: '<i class="fas fa-arrow-left"></i> Back to Roles'
    });
    
    header.appendChild(title);
    header.appendChild(backBtn);
    this.container.appendChild(header);
    
    // Create form container
    const formContainer = createElement('div', {
      className: 'form-container'
    });
    
    // Create form
    this.form = createElement('form', {
      id: 'role-form',
      className: 'resource-form'
    });
    
    // Create form fields
    this.renderFormFields();
    
    // Create form actions
    this.renderFormActions();
    
    formContainer.appendChild(this.form);
    this.container.appendChild(formContainer);
  }
  
  /**
   * Render form fields
   */
  renderFormFields() {
    // Display Name field
    const displayNameGroup = createElement('div', {
      className: UI_CONFIG.CLASSES.FORM_GROUP
    });
    
    const displayNameLabel = createElement('label', {
      htmlFor: 'displayName',
      textContent: 'Display Name *'
    });
    
    const displayNameInput = createElement('input', {
      type: 'text',
      id: 'displayName',
      name: 'displayName',
      required: true,
      placeholder: 'e.g., Administrator',
      className: UI_CONFIG.CLASSES.FORM_CONTROL
    });
    
    displayNameGroup.appendChild(displayNameLabel);
    displayNameGroup.appendChild(displayNameInput);
    this.form.appendChild(displayNameGroup);
    
    // Type field
    const typeGroup = createElement('div', {
      className: UI_CONFIG.CLASSES.FORM_GROUP
    });
    
    const typeLabel = createElement('label', {
      htmlFor: 'type',
      textContent: 'Type'
    });
    
    const typeInput = createElement('input', {
      type: 'text',
      id: 'type',
      name: 'type',
      placeholder: 'e.g., System, Application, Custom',
      className: UI_CONFIG.CLASSES.FORM_CONTROL
    });
    
    typeGroup.appendChild(typeLabel);
    typeGroup.appendChild(typeInput);
    this.form.appendChild(typeGroup);
    
    // Description field
    const descriptionGroup = createElement('div', {
      className: UI_CONFIG.CLASSES.FORM_GROUP
    });
    
    const descriptionLabel = createElement('label', {
      htmlFor: 'description',
      textContent: 'Description'
    });
    
    const descriptionTextarea = createElement('textarea', {
      id: 'description',
      name: 'description',
      rows: '3',
      placeholder: 'Description of this role',
      className: UI_CONFIG.CLASSES.FORM_CONTROL
    });
    
    descriptionGroup.appendChild(descriptionLabel);
    descriptionGroup.appendChild(descriptionTextarea);
    this.form.appendChild(descriptionGroup);
    
    // Schemas field
    const schemasGroup = createElement('div', {
      className: UI_CONFIG.CLASSES.FORM_GROUP
    });
    
    const schemasLabel = createElement('label', {
      htmlFor: 'schemas',
      textContent: 'Schemas'
    });
    
    const schemasInput = createElement('input', {
      type: 'text',
      id: 'schemas',
      name: 'schemas',
      value: RESOURCE_CONFIG.ROLE.SCHEMA,
      placeholder: 'Schema URN',
      className: UI_CONFIG.CLASSES.FORM_CONTROL
    });
    
    schemasGroup.appendChild(schemasLabel);
    schemasGroup.appendChild(schemasInput);
    this.form.appendChild(schemasGroup);
  }
  
  /**
   * Render form actions
   */
  renderFormActions() {
    const actionsGroup = createElement('div', {
      className: 'form-actions'
    });
    
    const submitBtn = createElement('button', {
      type: 'submit',
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_PRIMARY}`,
      innerHTML: '<i class="fas fa-save"></i> Create Role'
    });
    
    const cancelBtn = createElement('button', {
      type: 'button',
      className: `${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}`,
      textContent: 'Cancel'
    });
    
    actionsGroup.appendChild(submitBtn);
    actionsGroup.appendChild(cancelBtn);
    this.form.appendChild(actionsGroup);
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
    
    // Back button
    const backBtn = this.container.querySelector('.section-header button');
    addEventListener(backBtn, 'click', () => {
      this.navigateToRoles();
    });
    
    // Cancel button
    const cancelBtn = this.form.querySelector('.form-actions button:last-child');
    addEventListener(cancelBtn, 'click', () => {
      this.navigateToRoles();
    });
  }
  
  /**
   * Navigate to roles section
   */
  navigateToRoles() {
    const event = new CustomEvent('navigate', { 
      detail: { section: 'roles' } 
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Handle form submission
   */
  async handleSubmit() {
    return await safeAsync(async () => {
      const formData = new FormData(this.form);
      const roleData = {
        schemas: [formData.get('schemas') || RESOURCE_CONFIG.ROLE.SCHEMA],
        displayName: formData.get('displayName'),
        type: formData.get('type') || undefined,
        description: formData.get('description') || undefined
      };
      
      // Remove undefined values
      Object.keys(roleData).forEach(key => {
        if (roleData[key] === undefined) {
          delete roleData[key];
        }
      });
      
      // Show loading state
      showLoading(this.form, 'Creating role...');
      
      // Create role
      const response = await this.client.createRole(roleData);
      
      if (response.ok) {
        showSuccess(this.container, 'Role created successfully!');
        this.navigateToRoles();
      } else {
        await showError(this.form, 'Failed to create role', response.data);
      }
      
      // Update request/response panel
      if (this.reqResPanel) {
        this.updateReqResPanel(response, roleData);
      }
      
    }, async (error) => {
      await showError(this.form, 'Error creating role', error);
    });
  }
  
  /**
   * Update request/response panel
   * @param {Object} response - Response object
   * @param {Object} roleData - Role data
   */
  updateReqResPanel(response, roleData) {
    clearElement(this.reqResPanel);
    
    const reqResPanel = createElement('div', {
      className: 'req-res-panel'
    });
    
    const title = createElement('h3', {
      textContent: 'Request/Response'
    });
    
    const content = createElement('div', {
      className: 'req-res-content'
    });
    
    // Request section
    const requestSection = createElement('div', {
      className: 'request-section'
    });
    
    const requestTitle = createElement('h4', {
      textContent: 'Request'
    });
    
    const requestUrl = createElement('pre', {
      innerHTML: `<code>POST ${response.requestInfo?.url || 'N/A'}</code>`
    });
    
    const requestData = createElement('div', {
      className: UI_CONFIG.CLASSES.JSON_VIEWER,
      'data-json': JSON.stringify(roleData)
    });
    
    requestSection.appendChild(requestTitle);
    requestSection.appendChild(requestUrl);
    requestSection.appendChild(requestData);
    
    // Response section
    const responseSection = createElement('div', {
      className: 'response-section'
    });
    
    const responseTitle = createElement('h4', {
      textContent: `Response (${response.status || 'N/A'})`
    });
    
    const responseData = createElement('div', {
      className: UI_CONFIG.CLASSES.JSON_VIEWER,
      'data-json': JSON.stringify(response.data || {})
    });
    
    responseSection.appendChild(responseTitle);
    responseSection.appendChild(responseData);
    
    content.appendChild(requestSection);
    content.appendChild(responseSection);
    
    reqResPanel.appendChild(title);
    reqResPanel.appendChild(content);
    this.reqResPanel.appendChild(reqResPanel);
    
    // Initialize JSON viewer if available
    if (window.$ && window.$.fn.jsonViewer) {
      $('.json-viewer').each(function() {
        $(this).jsonViewer(JSON.parse($(this).attr('data-json')));
      });
    }
  }
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Render role form
 * @param {HTMLElement} container - Container element
 * @param {Object} client - SCIM client
 * @param {HTMLElement} mainPanel - Main panel for navigation
 * @param {HTMLElement} reqResPanel - Request/response panel
 */
export async function renderRoleForm(container, client, mainPanel, reqResPanel) {
  if (!container) return;
  
  return new RoleFormComponent(container, client, mainPanel, reqResPanel);
}