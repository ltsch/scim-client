// js/group-list.js

import { renderJSON } from './ui-components.js';

function getSchemaAttributes(schema) {
  if (!schema || !Array.isArray(schema.attributes)) return [];
  return schema.attributes.filter(attr => !attr.mutability || attr.mutability !== 'writeOnly');
}

function getCoreGroupColumns(groups, schema) {
  // Prefer id, displayName if present, else first 2 attributes
  const preferred = ['id', 'displayName'];
  const attributes = getSchemaAttributes(schema);
  const available = preferred.filter(col => attributes.some(a => a.name === col));
  if (available.length < 2) {
    for (const attr of attributes) {
      if (!available.includes(attr.name) && available.length < 2) {
        available.push(attr.name);
      }
    }
  }
  return available;
}

export function renderGroupList(container, groups, onSelectGroup, options = {}) {
  const { schema } = options;
  const columns = getCoreGroupColumns(groups, schema);
  if (!Array.isArray(groups) || groups.length === 0) {
    container.innerHTML = '<div>No groups found.</div>';
    return;
  }
  let html = `<table class="data-table group-list-table">
    <thead><tr><th></th>${columns.map(col => `<th>${col}</th>`).join('')}</tr></thead>
    <tbody>`;
  groups.forEach((group, idx) => {
    html += `<tr data-group-id="${group.id}" class="summary-row">
      <td><button class="expand-btn" data-idx="${idx}">+</button></td>
      ${columns.map(col => `<td>${Array.isArray(group[col]) ? group[col].join(', ') : (group[col] ?? '')}</td>`).join('')}
    </tr>`;
    html += `<tr class="details-row hidden" id="details-${idx}"><td colspan="${columns.length + 1}"></td></tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
  // Expand/collapse logic
  container.querySelectorAll('.expand-btn').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-idx');
      const detailsRow = container.querySelector(`#details-${idx}`);
      if (detailsRow.classList.contains('hidden')) {
        detailsRow.classList.remove('hidden');
        btn.textContent = '-';
        const group = groups[idx];
        renderJSON(detailsRow.cells[0], group);
      } else {
        detailsRow.classList.add('hidden');
        btn.textContent = '+';
        detailsRow.cells[0].innerHTML = '';
      }
    };
  });
  // Row click for selection (optional, can be removed if not needed)
  container.querySelectorAll('.summary-row').forEach((row, idx) => {
    row.onclick = (e) => {
      if (e.target.classList.contains('expand-btn')) return;
      const group = groups[idx];
      if (group) onSelectGroup(group);
    };
  });
} 