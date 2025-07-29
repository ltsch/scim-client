// js/group-edit-form.js

import { renderJSON } from './ui-components.js';

const SYSTEM_FIELDS = ['id', 'externalId', 'meta', 'password', 'schemas', 'scimGatewayData', 'members'];

function getSchemaAttributes(schema) {
  if (!schema || !Array.isArray(schema.attributes)) return [];
  return schema.attributes.filter(attr => !attr.readOnly && attr.mutability !== 'readOnly' && !SYSTEM_FIELDS.includes(attr.name));
}

export function renderGroupEditForm(container, group, onSubmit, options = {}) {
  const { schema } = options;
  const attributes = getSchemaAttributes(schema);
  container.innerHTML = `
    <form id="group-edit-form" class="user-form">
      <h2>Edit Group</h2>
      ${attributes.map(attr => {
        const required = attr.required ? 'required' : '';
        const label = attr.name + (attr.required ? ' *' : '');
        let inputType = 'text';
        let value = group[attr.name];
        if (attr.type === 'boolean') inputType = 'checkbox';
        if (attr.type === 'integer' || attr.type === 'decimal') inputType = 'number';
        if (typeof value === 'object' && value !== null) {
          // Render as expandable JSON below, not as input
          return '';
        }
        if (attr.multiValued && attr.type === 'string') {
          value = Array.isArray(value) ? value.join(', ') : '';
          return `<label>${label}<br><input type="text" id="${attr.name}" ${required} value="${value || ''}" placeholder="comma,separated,values"></label>`;
        }
        if (attr.type === 'boolean') {
          return `<label>${label}<br><input type="checkbox" id="${attr.name}" ${required} ${value ? 'checked' : ''}></label>`;
        }
        return `<label>${label}<br><input type="${inputType}" id="${attr.name}" ${required} value="${value !== undefined ? value : ''}"></label>`;
      }).join('')}
      <button type="submit">Update Group</button>
      <div id="group-edit-form-error" class="form-error"></div>
    </form>
    <div id="group-edit-json-fields"></div>
    <div id="group-edit-readonly-fields"></div>
    <div id="group-edit-reqres-panel"></div>
  `;
  // Render object/array fields as expandable JSON
  const jsonFieldsDiv = container.querySelector('#group-edit-json-fields');
  const jsonFields = (schema && schema.attributes ? schema.attributes.filter(attr => typeof group[attr.name] === 'object' && group[attr.name] !== null && !SYSTEM_FIELDS.includes(attr.name)) : []);
  jsonFields.forEach(attr => {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'json-field';
    fieldDiv.innerHTML = `<label>${attr.name} (view only):</label>`;
    renderJSON(fieldDiv, group[attr.name]);
    jsonFieldsDiv.appendChild(fieldDiv);
  });
  // Render read-only/system fields at the bottom
  const readonlyDiv = container.querySelector('#group-edit-readonly-fields');
  SYSTEM_FIELDS.forEach(field => {
    if (group[field] !== undefined && group[field] !== null) {
      const fieldDiv = document.createElement('div');
      fieldDiv.className = 'readonly-field';
      if (typeof group[field] === 'object') {
        fieldDiv.innerHTML = `<label>${field} (read-only):</label>`;
        renderJSON(fieldDiv, group[field]);
      } else {
        fieldDiv.innerHTML = `<label>${field} (read-only): <span class="readonly-value">${group[field]}</span></label>`;
      }
      readonlyDiv.appendChild(fieldDiv);
    }
  });
  const form = container.querySelector('#group-edit-form');
  const reqresPanel = container.querySelector('#group-edit-reqres-panel');
  function showReqResAccordion(req, res) {
    reqresPanel.innerHTML = '';
    const accordion = document.createElement('div');
    accordion.className = 'reqres-accordion';
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Show Raw Request/Response';
    toggleBtn.className = 'reqres-toggle-btn';
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
  form.onsubmit = (e) => {
    e.preventDefault();
    const errorDiv = form.querySelector('#group-edit-form-error');
    const updatedGroup = { schemas: [schema.id], id: group.id };
    let hasError = false;
    attributes.forEach(attr => {
      let value = form[attr.name].value;
      if (attr.type === 'boolean') value = form[attr.name].checked;
      if (attr.multiValued && attr.type === 'string') {
        value = value.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (attr.required && (!value || (Array.isArray(value) && value.length === 0))) {
        hasError = true;
      }
      if (value && (!Array.isArray(value) || value.length > 0)) {
        updatedGroup[attr.name] = value;
      }
    });
    if (hasError) {
      errorDiv.textContent = 'All required fields must be filled.';
      return;
    }
    errorDiv.textContent = '';
    onSubmit(updatedGroup).then(result => {
      if (result && result.__req && result.__res) {
        showReqResAccordion(result.__req, result.__res);
      }
    });
  };
} 