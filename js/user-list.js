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

export function renderUserList(container, users, onSelectUser, options = {}) {
  const { schema } = options;
  const columns = getCoreUserColumns(users, schema);
  if (!Array.isArray(users) || users.length === 0) {
    container.innerHTML = '<div>No users found.</div>';
    return;
  }
  let html = `<table class="user-list-table">
    <thead><tr><th></th>${columns.map(col => `<th>${col}</th>`).join('')}</tr></thead>
    <tbody>`;
  users.forEach((user, idx) => {
    html += `<tr data-user-id="${user.id}" class="summary-row">
      <td><button class="expand-btn" data-idx="${idx}">+</button></td>
      ${columns.map(col => `<td>${Array.isArray(user[col]) ? user[col].join(', ') : (user[col] ?? '')}</td>`).join('')}
    </tr>`;
    html += `<tr class="details-row" id="details-${idx}" style="display:none;"><td colspan="${columns.length + 1}"></td></tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
  // Expand/collapse logic
  container.querySelectorAll('.expand-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = btn.getAttribute('data-idx');
      const detailsRow = container.querySelector(`#details-${idx}`);
      if (detailsRow.style.display === 'none') {
        detailsRow.style.display = '';
        btn.textContent = '-';
        const user = users[idx];
        renderJSON(detailsRow.cells[0], user);
      } else {
        detailsRow.style.display = 'none';
        btn.textContent = '+';
        detailsRow.cells[0].innerHTML = '';
      }
    };
  });
  // Row click for selection (edit/delete)
  container.querySelectorAll('.summary-row').forEach((row, idx) => {
    row.onclick = (e) => {
      if (e.target.classList.contains('expand-btn')) return;
      const user = users[idx];
      if (user) onSelectUser(user);
    };
  });
} 