// js/user-list.js

import { renderJSON } from './ui-components.js';

function getSchemaAttributes(schema) {
  if (!schema || !Array.isArray(schema.attributes)) return [];
  return schema.attributes.filter(attr => !attr.mutability || attr.mutability !== 'writeOnly');
}

function getCoreUserColumns(users, schema) {
  // Prefer id, userName, displayName if present, else first 3 attributes
  const preferred = ['id', 'userName', 'displayName'];
  const attributes = getSchemaAttributes(schema);
  const available = preferred.filter(col => attributes.some(a => a.name === col));
  if (available.length < 3) {
    // Add more columns from schema if needed
    for (const attr of attributes) {
      if (!available.includes(attr.name) && available.length < 3) {
        available.push(attr.name);
      }
    }
  }
  return available;
}

// SCIM Filter Builder
class SCIMFilterBuilder {
  constructor() {
    this.filters = [];
    this.searchTerm = '';
    this.sortBy = '';
    this.sortOrder = 'ascending';
  }

  // Add a filter condition
  addFilter(attribute, operator, value) {
    if (attribute && value) {
      this.filters.push({ attribute, operator, value });
    }
  }

  // Set search term for general search
  setSearchTerm(term) {
    this.searchTerm = term;
  }

  // Set sorting
  setSorting(attribute, order = 'ascending') {
    this.sortBy = attribute;
    this.sortOrder = order;
  }

  // Build SCIM filter string
  buildFilterString() {
    const conditions = [];

    // Add search term as OR condition across common fields
    if (this.searchTerm) {
      const searchFields = ['userName', 'displayName', 'name.givenName', 'name.familyName', 'emails.value'];
      const searchConditions = searchFields.map(field => 
        `${field} sw "${this.searchTerm}"`
      );
      conditions.push(`(${searchConditions.join(' or ')})`);
    }

    // Add specific filters
    this.filters.forEach(filter => {
      let condition = '';
      switch (filter.operator) {
        case 'eq':
          condition = `${filter.attribute} eq "${filter.value}"`;
          break;
        case 'ne':
          condition = `${filter.attribute} ne "${filter.value}"`;
          break;
        case 'sw':
          condition = `${filter.attribute} sw "${filter.value}"`;
          break;
        case 'ew':
          condition = `${filter.attribute} ew "${filter.value}"`;
          break;
        case 'co':
          condition = `${filter.attribute} co "${filter.value}"`;
          break;
        case 'gt':
          condition = `${filter.attribute} gt "${filter.value}"`;
          break;
        case 'lt':
          condition = `${filter.attribute} lt "${filter.value}"`;
          break;
        case 'ge':
          condition = `${filter.attribute} ge "${filter.value}"`;
          break;
        case 'le':
          condition = `${filter.attribute} le "${filter.value}"`;
          break;
        default:
          condition = `${filter.attribute} eq "${filter.value}"`;
      }
      conditions.push(condition);
    });

    return conditions.length > 0 ? conditions.join(' and ') : '';
  }

  // Build query parameters for SCIM request
  buildQueryParams() {
    const params = {};
    
    const filterString = this.buildFilterString();
    if (filterString) {
      params.filter = filterString;
    }

    if (this.sortBy) {
      params.sortBy = this.sortBy;
      params.sortOrder = this.sortOrder;
    }

    return params;
  }

  // Clear all filters
  clear() {
    this.filters = [];
    this.searchTerm = '';
    this.sortBy = '';
    this.sortOrder = 'ascending';
  }
}

// Render filter UI
function renderFilterUI(container, schema, onFilterChange) {
  const filterContainer = document.createElement('div');
  filterContainer.className = 'filter-container';
  
  const attributes = getSchemaAttributes(schema);
  const commonAttributes = ['userName', 'displayName', 'name.givenName', 'name.familyName', 'emails.value', 'active'];
  
  let html = `
    <div class="filter-section">
      <h3>Search & Filter Users</h3>
      
      <!-- General Search -->
      <div class="form-group">
        <label for="user-search">General Search</label>
        <input type="text" id="user-search" class="form-control" 
               placeholder="Search across userName, displayName, name, email..." />
        <small class="form-text">Searches across common user fields</small>
      </div>
      
      <!-- Specific Filters -->
      <div class="filter-controls">
        <div class="form-group">
          <label for="filter-attribute">Filter by Attribute</label>
          <select id="filter-attribute" class="form-control">
            <option value="">Select attribute...</option>
            ${commonAttributes.map(attr => `<option value="${attr}">${attr}</option>`).join('')}
            ${attributes.filter(attr => !commonAttributes.includes(attr.name)).map(attr => 
              `<option value="${attr.name}">${attr.name}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label for="filter-operator">Operator</label>
          <select id="filter-operator" class="form-control">
            <option value="eq">Equals (eq)</option>
            <option value="ne">Not Equals (ne)</option>
            <option value="sw">Starts With (sw)</option>
            <option value="ew">Ends With (ew)</option>
            <option value="co">Contains (co)</option>
            <option value="gt">Greater Than (gt)</option>
            <option value="lt">Less Than (lt)</option>
            <option value="ge">Greater or Equal (ge)</option>
            <option value="le">Less or Equal (le)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="filter-value">Value</label>
          <input type="text" id="filter-value" class="form-control" placeholder="Enter filter value..." />
        </div>
        
        <button type="button" id="add-filter" class="btn btn-secondary">Add Filter</button>
      </div>
      
      <!-- Active Filters Display -->
      <div id="active-filters" class="active-filters">
        <h4>Active Filters</h4>
        <div id="filter-list"></div>
        <button type="button" id="clear-filters" class="btn btn-danger btn-sm">Clear All Filters</button>
      </div>
      
      <!-- Sort Options -->
      <div class="sort-controls">
        <div class="form-group">
          <label for="sort-by">Sort By</label>
          <select id="sort-by" class="form-control">
            <option value="">No sorting</option>
            <option value="userName">User Name</option>
            <option value="displayName">Display Name</option>
            <option value="name.familyName">Last Name</option>
            <option value="name.givenName">First Name</option>
            <option value="emails.value">Email</option>
            <option value="active">Active Status</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="sort-order">Sort Order</label>
          <select id="sort-order" class="form-control">
            <option value="ascending">Ascending</option>
            <option value="descending">Descending</option>
          </select>
        </div>
      </div>
      
      <!-- Apply Filters Button -->
      <div class="filter-actions">
        <button type="button" id="apply-filters" class="btn btn-primary">Apply Filters</button>
        <button type="button" id="reset-filters" class="btn btn-secondary">Reset</button>
      </div>
    </div>
  `;
  
  filterContainer.innerHTML = html;
  container.appendChild(filterContainer);
  
  // Initialize filter builder
  const filterBuilder = new SCIMFilterBuilder();
  let activeFilters = [];
  
  // Event listeners
  const searchInput = filterContainer.querySelector('#user-search');
  const attributeSelect = filterContainer.querySelector('#filter-attribute');
  const operatorSelect = filterContainer.querySelector('#filter-operator');
  const valueInput = filterContainer.querySelector('#filter-value');
  const addFilterBtn = filterContainer.querySelector('#add-filter');
  const applyFiltersBtn = filterContainer.querySelector('#apply-filters');
  const resetFiltersBtn = filterContainer.querySelector('#reset-filters');
  const clearFiltersBtn = filterContainer.querySelector('#clear-filters');
  const filterList = filterContainer.querySelector('#filter-list');
  const sortBySelect = filterContainer.querySelector('#sort-by');
  const sortOrderSelect = filterContainer.querySelector('#sort-order');
  
  // Search input handler
  searchInput.addEventListener('input', (e) => {
    filterBuilder.setSearchTerm(e.target.value);
  });
  
  // Add filter handler
  addFilterBtn.addEventListener('click', () => {
    const attribute = attributeSelect.value;
    const operator = operatorSelect.value;
    const value = valueInput.value;
    
    if (attribute && value) {
      const filter = { attribute, operator, value, id: Date.now() };
      activeFilters.push(filter);
      filterBuilder.addFilter(attribute, operator, value);
      updateFilterDisplay();
      
      // Clear inputs
      attributeSelect.value = '';
      valueInput.value = '';
    }
  });
  
  // Apply filters handler
  applyFiltersBtn.addEventListener('click', () => {
    const sortBy = sortBySelect.value;
    const sortOrder = sortOrderSelect.value;
    
    if (sortBy) {
      filterBuilder.setSorting(sortBy, sortOrder);
    }
    
    onFilterChange(filterBuilder.buildQueryParams());
  });
  
  // Reset filters handler
  resetFiltersBtn.addEventListener('click', () => {
    filterBuilder.clear();
    activeFilters = [];
    searchInput.value = '';
    attributeSelect.value = '';
    valueInput.value = '';
    sortBySelect.value = '';
    sortOrderSelect.value = 'ascending';
    updateFilterDisplay();
    onFilterChange({});
  });
  
  // Clear filters handler
  clearFiltersBtn.addEventListener('click', () => {
    activeFilters = [];
    filterBuilder.filters = [];
    updateFilterDisplay();
  });
  
  // Update filter display
  function updateFilterDisplay() {
    if (activeFilters.length === 0) {
      filterList.innerHTML = '<p>No active filters</p>';
      return;
    }
    
    filterList.innerHTML = activeFilters.map(filter => `
      <div class="filter-item">
        <span class="filter-text">${filter.attribute} ${filter.operator} "${filter.value}"</span>
        <button type="button" class="btn btn-sm btn-danger remove-filter" data-id="${filter.id}">×</button>
      </div>
    `).join('');
    
    // Add remove handlers
    filterList.querySelectorAll('.remove-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        const filterId = parseInt(btn.dataset.id);
        activeFilters = activeFilters.filter(f => f.id !== filterId);
        filterBuilder.filters = activeFilters.map(f => ({ attribute: f.attribute, operator: f.operator, value: f.value }));
        updateFilterDisplay();
      });
    });
  }
  
  updateFilterDisplay();
}

export function renderUserList(container, users, onSelectUser, options = {}) {
  const { schema, client, onFilterChange } = options;
  const columns = getCoreUserColumns(users, schema);
  
  // Clear container
  container.innerHTML = '';
  
  // Add filter UI if client is provided
  if (client && onFilterChange) {
    renderFilterUI(container, schema, onFilterChange);
  }
  
  // Add results info
  const resultsInfo = document.createElement('div');
  resultsInfo.className = 'results-info';
  container.appendChild(resultsInfo);
  
  if (!Array.isArray(users) || users.length === 0) {
    resultsInfo.innerHTML = '<div class="no-results">No users found.</div>';
    return;
  }
  
  resultsInfo.innerHTML = `<div class="results-count">Showing ${users.length} user(s)</div>`;
  
  // Create table with Actions column
  let html = `<table class="data-table user-list-table">
    <thead><tr><th></th>${columns.map(col => `<th>${col}</th>`).join('')}<th>Actions</th></tr></thead>
    <tbody>`;
  
  users.forEach((user, idx) => {
    html += `<tr data-user-id="${user.id}" class="summary-row">
      <td><button class="expand-btn" data-idx="${idx}">+</button></td>
      ${columns.map(col => `<td>${Array.isArray(user[col]) ? user[col].join(', ') : (user[col] ?? '')}</td>`).join('')}
      <td class="actions-cell">
        <button class="btn btn-secondary btn-sm edit-user-btn" data-user-id="${user.id}" data-user-index="${idx}">Edit</button>
        <button class="btn btn-danger btn-sm delete-user-btn" data-user-id="${user.id}" data-user-index="${idx}">Delete</button>
      </td>
    </tr>`;
    html += `<tr class="details-row hidden" id="details-${idx}"><td colspan="${columns.length + 2}"></td></tr>`;
  });
  
  html += '</tbody></table>';
  
  const tableContainer = document.createElement('div');
  tableContainer.innerHTML = html;
  container.appendChild(tableContainer);
  
  // Expand/collapse logic
  tableContainer.querySelectorAll('.expand-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = btn.getAttribute('data-idx');
      const detailsRow = tableContainer.querySelector(`#details-${idx}`);
      if (detailsRow.classList.contains('hidden')) {
        detailsRow.classList.remove('hidden');
        btn.textContent = '-';
        const user = users[idx];
        renderJSON(detailsRow.cells[0], user);
      } else {
        detailsRow.classList.add('hidden');
        btn.textContent = '+';
        detailsRow.cells[0].innerHTML = '';
      }
    };
  });
  
  // Edit button handlers
  tableContainer.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const userId = btn.getAttribute('data-user-id');
      const userIndex = parseInt(btn.getAttribute('data-user-index'));
      const user = users[userIndex];
      if (user) onSelectUser(user, 'edit');
    };
  });
  
  // Delete button handlers
  tableContainer.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const userId = btn.getAttribute('data-user-id');
      const userIndex = parseInt(btn.getAttribute('data-user-index'));
      const user = users[userIndex];
      if (user && confirm(`Are you sure you want to delete user "${user.userName || user.displayName || user.id}"?`)) {
        onSelectUser(user, 'delete');
      }
    };
  });
  
  // Row click for selection (edit/delete) - keep for backward compatibility
  tableContainer.querySelectorAll('.summary-row').forEach((row, idx) => {
    row.onclick = (e) => {
      if (e.target.classList.contains('expand-btn') || 
          e.target.classList.contains('edit-user-btn') || 
          e.target.classList.contains('delete-user-btn')) return;
      const user = users[idx];
      if (user) onSelectUser(user, 'edit');
    };
  });
} 