// js/role-edit-form.js

import { renderJSON, showLoading, showError } from './ui-components.js';

export async function renderRoleEditForm(container, client, roleId, mainPanel, reqResPanel) {
  if (!container) return;

  container.innerHTML = `
    <div class="section-header">
      <h2>Edit Role</h2>
      <button class="btn btn-secondary" onclick="window.navigateToRoles()">
        <i class="fas fa-arrow-left"></i> Back to Roles
      </button>
    </div>
    <div class="loading-spinner" id="role-edit-loading">
      <div class="spinner"></div>
      <p>Loading role...</p>
    </div>
    <div class="form-container" id="role-edit-form" style="display: none;">
      <form id="role-edit-form-element" class="resource-form">
        <div class="form-group">
          <label for="displayName">Display Name *</label>
          <input type="text" id="displayName" name="displayName" required>
        </div>
        
        <div class="form-group">
          <label for="type">Type</label>
          <input type="text" id="type" name="type">
        </div>
        
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" rows="3"></textarea>
        </div>
        
        <div class="form-group">
          <label for="schemas">Schemas</label>
          <input type="text" id="schemas" name="schemas">
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Update Role
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

  try {
    showLoading('role-edit-loading', 'role-edit-form');
    
    const response = await client.getRole(roleId);
    
    if (!response.ok) {
      showError('role-edit-form', 'Failed to load role', response.data);
      return;
    }

    const role = response.data;

    // Populate form fields
    document.getElementById('displayName').value = role.displayName || '';
    document.getElementById('type').value = role.type || '';
    document.getElementById('description').value = role.description || '';
    document.getElementById('schemas').value = role.schemas ? role.schemas.join(', ') : '';

    // Show form
    document.getElementById('role-edit-loading').style.display = 'none';
    document.getElementById('role-edit-form').style.display = 'block';

    // Handle form submission
    document.getElementById('role-edit-form-element').addEventListener('submit', async (e) => {
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
        showLoading('role-edit-form-element', null);
        
        const updateResponse = await client.updateRole(roleId, roleData);
        
        if (updateResponse.ok) {
          alert('Role updated successfully!');
          window.navigateToRoles();
        } else {
          showError('role-edit-form-element', 'Failed to update role', updateResponse.data);
        }

        // Update request/response panel
        if (reqResPanel) {
          reqResPanel.innerHTML = `
            <div class="req-res-panel">
              <h3>Request/Response</h3>
              <div class="req-res-content">
                <div class="request-section">
                  <h4>Request</h4>
                  <pre><code>PUT ${updateResponse.requestInfo.url}</code></pre>
                  <div class="json-viewer" data-json='${JSON.stringify(roleData)}'></div>
                </div>
                <div class="response-section">
                  <h4>Response (${updateResponse.status})</h4>
                  <div class="json-viewer" data-json='${JSON.stringify(updateResponse.data)}'></div>
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
        showError('role-edit-form-element', 'Error updating role', error);
      }
    });

    // Update request/response panel for initial load
    if (reqResPanel) {
      reqResPanel.innerHTML = `
        <div class="req-res-panel">
          <h3>Request/Response</h3>
          <div class="req-res-content">
            <div class="request-section">
              <h4>Request</h4>
              <pre><code>GET ${response.requestInfo.url}</code></pre>
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
    showError('role-edit-form', 'Error loading role', error);
  }
}