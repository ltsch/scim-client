// js/user-create-modal.js

import { renderJSON } from './ui-components.js';

const SYSTEM_FIELDS = ['id', 'externalId', 'meta', 'password', 'schemas', 'scimGatewayData'];

function getSchemaAttributes(schema) {
  if (!schema || !Array.isArray(schema.attributes)) return [];
  return schema.attributes.filter(attr => !attr.readOnly && attr.mutability !== 'readOnly' && !SYSTEM_FIELDS.includes(attr.name));
}

export function renderUserCreateModal(container, onSubmit, options = {}) {
  const { schema } = options;
  const attributes = getSchemaAttributes(schema);
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  
  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-container';
  
  // Create modal content
  modalContainer.innerHTML = `
    <div class="modal-header">
      <h2>Create User</h2>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="user-create-form" class="user-form">
        ${attributes.map(attr => {
          const required = attr.required ? 'required' : '';
          const label = attr.name + (attr.required ? ' *' : '');
          let inputType = 'text';
          if (typeof attr.type === 'object' || attr.multiValued || attr.type === 'complex') {
            // Hide object/array/complex fields from create form
            return '';
          }
          if (attr.type === 'boolean') inputType = 'checkbox';
          if (attr.type === 'integer' || attr.type === 'decimal') inputType = 'number';
          return `<label>${label}<br><input type="${inputType}" id="${attr.name}" ${required}></label>`;
        }).join('')}
        <div id="user-create-form-error" class="form-error"></div>
      </form>
      <div id="user-create-reqres-panel"></div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button type="submit" form="user-create-form" class="btn btn-primary">Create User</button>
    </div>
  `;
  
  // Append modal to body
  modalOverlay.appendChild(modalContainer);
  document.body.appendChild(modalOverlay);
  
  const form = modalContainer.querySelector('#user-create-form');
  const reqresPanel = modalContainer.querySelector('#user-create-reqres-panel');
  
  function showReqResAccordion(req, res) {
    reqresPanel.innerHTML = '';
    const accordion = document.createElement('div');
    accordion.className = 'reqres-accordion';
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Show Raw Request/Response';
    toggleBtn.className = 'reqres-toggle-btn';
    const panel = document.createElement('div');
    panel.className = 'reqres-panel';
    accordion.appendChild(toggleBtn);
    accordion.appendChild(panel);
    toggleBtn.onclick = () => {
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        toggleBtn.textContent = 'Hide Raw Request/Response';
        panel.innerHTML = `<pre class="json-viewer">${escapeHTML(typeof req === 'object' ? JSON.stringify(req, null, 2) : String(req))}\n\n${escapeHTML(typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res))}</pre>`;
      } else {
        panel.classList.add('hidden');
        toggleBtn.textContent = 'Show Raw Request/Response';
      }
    };
    reqresPanel.appendChild(accordion);
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }
  
  // Handle form submission
  form.onsubmit = async (e) => {
    e.preventDefault();
    const errorDiv = form.querySelector('#user-create-form-error');
    const userData = { schemas: [schema.id] };
    let hasError = false;
    
    attributes.forEach(attr => {
      const input = form[attr.name];
      if (!input) return; // Skip attributes with no input (e.g., objects/arrays)
      let value = input.value;
      if (attr.type === 'boolean') value = input.checked;
      if (attr.multiValued && attr.type === 'string') {
        value = value.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (attr.required && (!value || (Array.isArray(value) && value.length === 0))) {
        hasError = true;
      }
      if (value && (!Array.isArray(value) || value.length > 0)) {
        userData[attr.name] = value;
      }
    });
    
    if (hasError) {
      errorDiv.textContent = 'All required fields must be filled.';
      return;
    }
    
    errorDiv.textContent = '';
    
    try {
      const result = await onSubmit(userData);
      if (result && result.__req && result.__res) {
        showReqResAccordion(result.__req, result.__res);
      }
      // Close modal on successful submission
      if (result && result.__res && result.__res.ok) {
        modalOverlay.remove();
      }
    } catch (error) {
      errorDiv.textContent = `Error: ${error.message}`;
    }
  };
  
  // Close modal when clicking outside
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
  
  // Close modal on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modalOverlay.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
} 