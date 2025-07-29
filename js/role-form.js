// js/role-form.js

import { renderJSON, showLoading, showError } from './ui-components.js';

export async function renderRoleForm(container, client, mainPanel, reqResPanel) {
  if (!container) return;

  container.innerHTML = `
    <div class="section-header">
      <h2>Create Role</h2>
      <button class="btn btn-secondary" onclick="window.navigateToRoles()">
        <i class="fas fa-arrow-left"></i> Back to Roles
      </button>
    </div>
    <div class="form-container">
      <form id="role-form" class="resource-form">
        <div class="form-group">
          <label for="displayName">Display Name *</label>
          <input type="text" id="displayName" name="displayName" required 
                 placeholder="e.g., Administrator">
        </div>
        
        <div class="form-group">
          <label for="type">Type</label>
          <input type="text" id="type" name="type" 
                 placeholder="e.g., System, Application, Custom">
        </div>
        
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" rows="3" 
                    placeholder="Description of this role"></textarea>
        </div>
        
        <div class="form-group">
          <label for="schemas">Schemas</label>
          <input type="text" id="schemas" name="schemas" 
                 value="urn:ietf:params:scim:schemas:core:2.0:Role"
                 placeholder="Schema URN">
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Create Role
          </button>
          <button type="button" class="btn btn-secondary" onclick="window.navigateToRoles()">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;

  // Make navigation function globally available
  window.navigateToRoles = () => {
    const event = new CustomEvent('navigate', { 
      detail: { section: 'roles' } 
    });
    document.dispatchEvent(event);
  };

  // Handle form submission
  document.getElementById('role-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const roleData = {
      schemas: [formData.get('schemas') || 'urn:ietf:params:scim:schemas:core:2.0:Role'],
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

    try {
      showLoading('role-form', null);
      
      const response = await client.createRole(roleData);
      
      if (response.ok) {
        alert('Role created successfully!');
        window.navigateToRoles();
      } else {
        showError('role-form', 'Failed to create role', response.data);
      }

      // Update request/response panel
      if (reqResPanel) {
        reqResPanel.innerHTML = `
          <div class="req-res-panel">
            <h3>Request/Response</h3>
            <div class="req-res-content">
              <div class="request-section">
                <h4>Request</h4>
                <pre><code>POST ${response.requestInfo.url}</code></pre>
                <div class="json-viewer" data-json='${JSON.stringify(roleData)}'></div>
              </div>
              <div class="response-section">
                <h4>Response (${response.status})</h4>
                <div class="json-viewer" data-json='${JSON.stringify(response.data)}'></div>
              </div>
            </div>
          </div>
        `;
        
        // Initialize JSON viewer
        if (window.$ && window.$.fn.jsonViewer) {
          $('.json-viewer').each(function() {
            $(this).jsonViewer(JSON.parse($(this).attr('data-json')));
          });
        }
      }

    } catch (error) {
      showError('role-form', 'Error creating role', error);
    }
  });
}