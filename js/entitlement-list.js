// js/entitlement-list.js

import { renderJSON, showLoading, showError } from './ui-components.js';

export async function renderEntitlementList(container, client, mainPanel, reqResPanel) {
  if (!container) return;

  container.innerHTML = `
    <div class="section-header">
      <h2>Entitlements</h2>
      <button class="btn btn-primary" onclick="window.createEntitlement()">
        <i class="fas fa-plus"></i> Create Entitlement
      </button>
    </div>
    <div class="loading-spinner" id="entitlement-loading">
      <div class="spinner"></div>
      <p>Loading entitlements...</p>
    </div>
    <div class="content-area hidden" id="entitlement-content">
      <div class="summary-stats" id="entitlement-stats"></div>
      <div class="resource-list" id="entitlement-list"></div>
    </div>
  `;

  // Make createEntitlement globally available
  window.createEntitlement = () => {
    const event = new CustomEvent('navigate', { 
      detail: { section: 'entitlements', action: 'create' } 
    });
    document.dispatchEvent(event);
  };

  try {
    showLoading('entitlement-loading', 'entitlement-content');
    
    const response = await client.getEntitlements();
    
    if (!response.ok) {
      showError('entitlement-content', 'Failed to load entitlements', response.data);
      return;
    }

    const entitlements = response.data.Resources || [];
    const totalResults = response.data.totalResults || entitlements.length;
    const itemsPerPage = response.data.itemsPerPage || 100;

    // Update stats
    const statsContainer = document.getElementById('entitlement-stats');
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${totalResults}</div>
        <div class="stat-label">Total Entitlements</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${entitlements.length}</div>
        <div class="stat-label">Loaded</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${itemsPerPage}</div>
        <div class="stat-label">Per Page</div>
      </div>
    `;

    // Render entitlement list
    const listContainer = document.getElementById('entitlement-list');
    if (entitlements.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-key"></i>
          <h3>No Entitlements Found</h3>
          <p>No entitlements are currently configured on this SCIM server.</p>
          <button class="btn btn-primary" onclick="window.createEntitlement()">
            Create First Entitlement
          </button>
        </div>
      `;
    } else {
      listContainer.innerHTML = `
        <div class="resource-grid">
          ${entitlements.map(entitlement => `
            <div class="resource-card" onclick="window.viewEntitlement('${entitlement.id}')">
              <div class="resource-header">
                <h3>${entitlement.displayName || entitlement.id}</h3>
                <span class="resource-type">${entitlement.type || 'Entitlement'}</span>
              </div>
              <div class="resource-body">
                <p class="resource-description">${entitlement.description || 'No description'}</p>
                <div class="resource-meta">
                  <span class="meta-item">
                    <i class="fas fa-id-badge"></i> ${entitlement.id}
                  </span>
                  ${entitlement.active !== undefined ? `
                    <span class="meta-item ${entitlement.active ? 'active' : 'inactive'}">
                      <i class="fas fa-circle"></i> ${entitlement.active ? 'Active' : 'Inactive'}
                    </span>
                  ` : ''}
                </div>
              </div>
              <div class="resource-actions">
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.editEntitlement('${entitlement.id}')">
                  <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); window.deleteEntitlement('${entitlement.id}')">
                  <i class="fas fa-trash"></i> Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Make functions globally available
    window.viewEntitlement = (id) => {
      const event = new CustomEvent('navigate', { 
        detail: { section: 'entitlements', action: 'view', id } 
      });
      document.dispatchEvent(event);
    };

    window.editEntitlement = (id) => {
      const event = new CustomEvent('navigate', { 
        detail: { section: 'entitlements', action: 'edit', id } 
      });
      document.dispatchEvent(event);
    };

    window.deleteEntitlement = async (id) => {
      if (!confirm('Are you sure you want to delete this entitlement?')) return;
      
      try {
        const response = await client.deleteEntitlement(id);
        if (response.ok) {
          // Refresh the list
          renderEntitlementList(container, client, mainPanel, reqResPanel);
        } else {
          alert(`Failed to delete entitlement: ${response.data.error || 'Unknown error'}`);
        }
      } catch (error) {
        alert(`Error deleting entitlement: ${error.message}`);
      }
    };

    // Show content
    document.getElementById('entitlement-loading').classList.add('hidden');
    document.getElementById('entitlement-content').classList.remove('hidden');

    // Update request/response panel
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
    showError('entitlement-content', 'Failed to load entitlements', error);
  }
}