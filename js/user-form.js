// js/user-form.js

const SYSTEM_FIELDS = ['id', 'externalId', 'meta', 'password', 'schemas', 'scimGatewayData'];

function getSchemaAttributes(schema) {
  if (!schema || !Array.isArray(schema.attributes)) return [];
  return schema.attributes.filter(attr => !attr.readOnly && attr.mutability !== 'readOnly' && !SYSTEM_FIELDS.includes(attr.name));
}

export function renderUserForm(container, onSubmit, options = {}) {
  const { schema } = options;
  
  // For lightweight client, focus on essential attributes only
  container.innerHTML = `
    <form id="user-create-form" class="user-form">
      <h2>Create User (Basic)</h2>
      <p class="form-description">Lightweight form for essential SCIM User attributes. Complex attributes are handled automatically.</p>
      
      <div class="form-section">
        <h3>Required Fields</h3>
        <label>Username *<br><input type="text" id="userName" required placeholder="johndoe"></label>
        <label>Display Name *<br><input type="text" id="displayName" required placeholder="John Doe"></label>
      </div>
      
      <div class="form-section">
        <h3>Optional Fields</h3>
        <label>Email<br><input type="email" id="email" placeholder="john.doe@example.com"></label>
        <label>Given Name<br><input type="text" id="givenName" placeholder="John"></label>
        <label>Family Name<br><input type="text" id="familyName" placeholder="Doe"></label>
        <label><input type="checkbox" id="active" checked> Active</label>
      </div>
      
      <div class="form-section">
        <h3>Advanced Options</h3>
        <label>External ID<br><input type="text" id="externalId" placeholder="Optional external identifier"></label>
      </div>
      
      <button type="submit">Create User</button>
      <div id="user-form-error" class="form-error"></div>
    </form>
    <div id="user-create-reqres-panel"></div>
  `;
  
  const form = container.querySelector('#user-create-form');
  const reqresPanel = container.querySelector('#user-create-reqres-panel');
  
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
    const errorDiv = form.querySelector('#user-form-error');
    
    // Build SCIM User data with proper structure
    const userData = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"]
    };
    
    // Required fields
    const userName = form.userName.value.trim();
    const displayName = form.displayName.value.trim();
    
    if (!userName || !displayName) {
      errorDiv.textContent = 'Username and Display Name are required.';
      return;
    }
    
    userData.userName = userName;
    userData.displayName = displayName;
    
    // Optional fields
    const email = form.email.value.trim();
    const givenName = form.givenName.value.trim();
    const familyName = form.familyName.value.trim();
    const active = form.active.checked;
    const externalId = form.externalId.value.trim();
    
    // Add email if provided (proper SCIM structure)
    if (email) {
      userData.emails = [{
        value: email,
        primary: true
      }];
    }
    
    // Add name if provided (proper SCIM structure)
    if (givenName || familyName) {
      userData.name = {};
      if (givenName) userData.name.givenName = givenName;
      if (familyName) userData.name.familyName = familyName;
      userData.name.formatted = `${givenName || ''} ${familyName || ''}`.trim();
    }
    
    // Add other fields
    userData.active = active;
    if (externalId) userData.externalId = externalId;
    
    errorDiv.textContent = '';
    
    // Submit with request/response capture
    onSubmit(userData).then(result => {
      if (result && result.__req && result.__res) {
        showReqResAccordion(result.__req, result.__res);
      }
    }).catch(error => {
      errorDiv.textContent = `Error: ${error.message}`;
    });
  };
} 