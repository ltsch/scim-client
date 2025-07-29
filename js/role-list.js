// js/role-list.js

import { renderJSON, showLoading, showError } from './ui-components.js';

export async function renderRoleList(container, client, mainPanel, reqResPanel) {
  if (!container) return;

  container.innerHTML = `
    <div class="section-header">
      <h2>Roles</h2>
      <button class="btn btn-primary" onclick="window.createRole()">
        <i class="fas fa-plus"></i> Create Role
      </button>
    </div>
    <div class="loading-spinner" id="role-loading">
      <div class="spinner"></div>
      <p>Loading roles...</p>
    </div>
    <div class="content-area hidden" id="role-content">
      <div class="summary-stats" id="role-stats"></div>
      <div class="resource-list" id="role-list"></div>
    </div>
  `;

  // Make createRole globally available
  window.createRole = () => {
    const event = new CustomEvent('navigate', { 
      detail: { section: 'roles', action: 'create' } 
    });
    document.dispatchEvent(event);
  };

  try {
    showLoading('role-loading', 'role-content');
    
    const response = await client.getRoles();
    
    if (!response.ok) {
      showError('role-content', 'Failed to load roles', response.data);
      return;
    }

    const roles = response.data.Resources || [];
    const totalResults = response.data.totalResults || roles.length;
    const itemsPerPage = response.data.itemsPerPage || 100;

    // Update stats
    const statsContainer = document.getElementById('role-stats');
    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${totalResults}</div>
        <div class="stat-label">Total Roles</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${roles.length}</div>
        <div class="stat-label">Loaded</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${itemsPerPage}</div>
        <div class="stat-label">Per Page</div>
      </div>
    `;

    // Render role list
    const listContainer = document.getElementById('role-list');
    if (roles.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-user-tag"></i>
          <h3>No Roles Found</h3>
          <p>No roles are currently configured on this SCIM server.</p>
          <button class="btn btn-primary" onclick="window.createRole()">
            Create First Role
          </button>
        </div>
      `;
    } else {
      listContainer.innerHTML = `
        <div class="resource-grid">
          ${roles.map(role => `
            <div class="resource-card" onclick="window.viewRole('${role.id}')">
              <div class="resource-header">
                <h3>${role.displayName || role.id}</h3>
                <span class="resource-type">${role.type || 'Role'}</span>
              </div>
              <div class="resource-body">
                <p class="resource-description">${role.description || 'No description'}</p>
                <div class="resource-meta">
                  <span class="meta-item">
                    <i class="fas fa-id-badge"></i> ${role.id}
                  </span>
                  ${role.active !== undefined ? `
                    <span class="meta-item ${role.active ? 'active' : 'inactive'}">
                      <i class="fas fa-circle"></i> ${role.active ? 'Active' : 'Inactive'}
                    </span>
                  ` : ''}
                </div>
              </div>
              <div class="resource-actions">
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.editRole('${role.id}')">
                  <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); window.deleteRole('${role.id}')">
                  <i class="fas fa-trash"></i> Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Make functions globally available
    window.viewRole = (id) => {
      const event = new CustomEvent('navigate', { 
        detail: { section: 'roles', action: 'view', id } 
      });
      document.dispatchEvent(event);
    };

    window.editRole = (id) => {
      const event = new CustomEvent('navigate', { 
        detail: { section: 'roles', action: 'edit', id } 
      });
      document.dispatchEvent(event);
    };

    window.deleteRole = async (id) => {
      if (!confirm('Are you sure you want to delete this role?')) return;
      
      try {
        const response = await client.deleteRole(id);
        if (response.ok) {
          // Refresh the list
          renderRoleList(container, client, mainPanel, reqResPanel);
        } else {
          alert(`Failed to delete role: ${response.data.error || 'Unknown error'}`);
        }
      } catch (error) {
        alert(`Error deleting role: ${error.message}`);
      }
    };

    // Show content
    document.getElementById('role-loading').classList.add('hidden');
    document.getElementById('role-content').classList.remove('hidden');

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
    showError('role-content', 'Failed to load roles', error);
  }
}