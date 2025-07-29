// js/entitlement-form.js

import { renderJSON, showLoading, showError } from './ui-components.js';

export async function renderEntitlementForm(container, client, mainPanel, reqResPanel) {
  if (!container) return;

  container.innerHTML = `
    <div class="section-header">
      <h2>Create Entitlement</h2>
      <button class="btn btn-secondary" onclick="window.navigateToEntitlements()">
        <i class="fas fa-arrow-left"></i> Back to Entitlements
      </button>
    </div>
    <div class="form-container">
      <form id="entitlement-form" class="resource-form">
        <div class="form-group">
          <label for="displayName">Display Name *</label>
          <input type="text" id="displayName" name="displayName" required 
                 placeholder="e.g., Office 365 License">
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
          <textarea id="description" name="description" rows="3" 
                    placeholder="Description of this entitlement"></textarea>
        </div>
        
        <div class="form-group">
          <label for="schemas">Schemas</label>
          <input type="text" id="schemas" name="schemas" 
                 value="urn:okta:scim:schemas:core:1.0:Entitlement"
                 placeholder="Schema URN">
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-save"></i> Create Entitlement
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

  // Handle form submission
  document.getElementById('entitlement-form').addEventListener('submit', async (e) => {
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
      showLoading('entitlement-form', null);
      
      const response = await client.createEntitlement(entitlementData);
      
      if (response.ok) {
        alert('Entitlement created successfully!');
        window.navigateToEntitlements();
      } else {
        showError('entitlement-form', 'Failed to create entitlement', response.data);
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
                <div class="json-viewer" data-json='${JSON.stringify(entitlementData)}'></div>
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
      showError('entitlement-form', 'Error creating entitlement', error);
    }
  });
}