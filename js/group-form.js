// js/group-form.js

const SYSTEM_FIELDS = ['id', 'externalId', 'meta', 'password', 'schemas', 'scimGatewayData', 'members'];

function getSchemaAttributes(schema) {
  if (!schema || !Array.isArray(schema.attributes)) return [];
  return schema.attributes.filter(attr => !attr.readOnly && attr.mutability !== 'readOnly' && !SYSTEM_FIELDS.includes(attr.name));
}

export function renderGroupForm(container, onSubmit, options = {}) {
  const { schema } = options;
  const attributes = getSchemaAttributes(schema);
  container.innerHTML = `
    <form id="group-create-form" class="user-form">
      <h2>Create Group</h2>
      ${attributes.map(attr => {
        const required = attr.required ? 'required' : '';
        const label = attr.name + (attr.required ? ' *' : '');
        let inputType = 'text';
        if (typeof attr.type === 'object' || attr.multiValued || attr.type === 'complex') {
          // Hide object/array/complex fields from create form
          return '';
        }
        if (attr.type === 'boolean') inputType = 'checkbox';
        if (attr.type === 'integer' || attr.type === 'decimal') inputType = 'number';
        return `<label>${label}<br><input type="${inputType}" id="${attr.name}" ${required}></label>`;
      }).join('')}
      <button type="submit">Create Group</button>
      <div id="group-form-error" style="color:#b00;margin-top:1em;"></div>
    </form>
    <div id="group-create-reqres-panel"></div>
  `;
  const form = container.querySelector('#group-create-form');
  const reqresPanel = container.querySelector('#group-create-reqres-panel');
  function showReqResAccordion(req, res) {
    reqresPanel.innerHTML = '';
    const accordion = document.createElement('div');
    accordion.className = 'reqres-accordion';
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Show Raw Request/Response';
    toggleBtn.className = 'reqres-toggle-btn';
    toggleBtn.style.marginBottom = '0.5em';
    const panel = document.createElement('div');
    panel.style.display = 'none';
    panel.style.background = '#fafafa';
    panel.style.border = '1px solid #ddd';
    panel.style.padding = '1em';
    panel.style.overflowX = 'auto';
    accordion.appendChild(toggleBtn);
    accordion.appendChild(panel);
    toggleBtn.onclick = () => {
      if (panel.style.display === 'none') {
        panel.style.display = 'block';
        toggleBtn.textContent = 'Hide Raw Request/Response';
        panel.innerHTML = '';
        window.renderJSON(panel, { request: req, response: res });
      } else {
        panel.style.display = 'none';
        toggleBtn.textContent = 'Show Raw Request/Response';
      }
    };
    reqresPanel.appendChild(accordion);
  }
  form.onsubmit = (e) => {
    e.preventDefault();
    const errorDiv = form.querySelector('#group-form-error');
    const groupData = { schemas: [schema.id] };
    let hasError = false;
    attributes.forEach(attr => {
      let value = form[attr.name].value;
      if (attr.type === 'boolean') value = form[attr.name].checked;
      if (attr.required && (!value || (Array.isArray(value) && value.length === 0))) {
        hasError = true;
      }
      if (value && (!Array.isArray(value) || value.length > 0)) {
        groupData[attr.name] = value;
      }
    });
    if (hasError) {
      errorDiv.textContent = 'All required fields must be filled.';
      return;
    }
    errorDiv.textContent = '';
    // onSubmit is async, so wrap to capture req/res
    onSubmit(groupData).then(result => {
      if (result && result.__req && result.__res) {
        showReqResAccordion(result.__req, result.__res);
      }
    });
  };
} 