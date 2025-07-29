// js/entitlement-edit-form.js

import { renderJSON, showLoading, showError } from './ui-components.js';

export async function renderEntitlementEditForm(container, client, entitlementId, mainPanel, reqResPanel) {
  if (!container) return;

  container.innerHTML = `
    <div class="section-header">
      <h2>Edit Entitlement</h2>
      <button class="btn btn-secondary" onclick="window.navigateToEntitlements()">
        <i class="fas fa-arrow-left"></i> Back to Entitlements
      </button>
    </div>
    <div class="loading-spinner" id="entitlement-edit-loading">
      <div class="spinner"></div>
      <p>Loading entitlement...</p>
    </div>
    <div class="form-container hidden" id="entitlement-edit-form">
      <form id="entitlement-edit-form-element" class="resource-form">
        <div class="form-group">
          <label for="displayName">Display Name *</label>
          <input type="text" id="displayName" name="displayName" required>
        </div>
        
        <div class="form-group">
          <label for="type">Type *</label>
          <select id="type" name="type" required>
            <option value="">Select type...</option>
            <option value="License">License</option>
            <option value="Profile">Profile</option>
            <option value="Permission">Permission</option>
            <option value="Application">Application</option>
          </select>
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
            <i class="fas fa-save"></i> Update Entitlement
          </button>
          <button type="button" class="btn btn-secondary" onclick="window.navigateToEntitlements()">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;

  // Make navigation function globally available
  window.navigateToEntitlements = () => {
    const event = new CustomEvent('navigate', { 
      detail: { section: 'entitlements' } 
    });
    document.dispatchEvent(event);
  };

  try {
    showLoading('entitlement-edit-loading', 'entitlement-edit-form');
    
    const response = await client.getEntitlement(entitlementId);
    
    if (!response.ok) {
      showError('entitlement-edit-form', 'Failed to load entitlement', response.data);
      return;
    }

    const entitlement = response.data;

    // Populate form fields
    document.getElementById('displayName').value = entitlement.displayName || '';
    document.getElementById('type').value = entitlement.type || '';
    document.getElementById('description').value = entitlement.description || '';
    document.getElementById('schemas').value = entitlement.schemas ? entitlement.schemas.join(', ') : '';

    // Show form
    document.getElementById('entitlement-edit-loading').classList.add('hidden');
    document.getElementById('entitlement-edit-form').classList.remove('hidden');

    // Handle form submission
    document.getElementById('entitlement-edit-form-element').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const entitlementData = {
        schemas: [formData.get('schemas') || 'urn:okta:scim:schemas:core:1.0:Entitlement'],
        displayName: formData.get('displayName'),
        type: formData.get('type'),
        description: formData.get('description') || undefined
      };

      // Remove undefined values
      Object.keys(entitlementData).forEach(key => {
        if (entitlementData[key] === undefined) {
          delete entitlementData[key];
        }
      });

      try {
        showLoading('entitlement-edit-form-element', null);
        
        const updateResponse = await client.updateEntitlement(entitlementId, entitlementData);
        
        if (updateResponse.ok) {
          alert('Entitlement updated successfully!');
          window.navigateToEntitlements();
        } else {
          showError('entitlement-edit-form-element', 'Failed to update entitlement', updateResponse.data);
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
                  <div class="json-viewer" data-json='${JSON.stringify(entitlementData)}'></div>
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
        showError('entitlement-edit-form-element', 'Error updating entitlement', error);
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
    showError('entitlement-edit-form', 'Error loading entitlement', error);
  }
}