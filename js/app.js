// js/app.js

import { SCIMClient } from './scim-client.js';
import { renderJSON, showLoading, showError } from './ui-components.js';
import { renderUserList } from './user-list.js';
import { renderGroupList } from './group-list.js';
import { renderUserForm } from './user-form.js';
import { renderUserEditForm } from './user-edit-form.js';
import { renderUserCreateModal } from './user-create-modal.js';
import { renderGroupForm } from './group-form.js';
import { renderGroupEditForm } from './group-edit-form.js';
import { renderGroupCreateModal } from './group-create-modal.js';
import { renderEntitlementList } from './entitlement-list.js';
import { renderEntitlementForm } from './entitlement-form.js';
import { renderEntitlementEditForm } from './entitlement-edit-form.js';
import { renderRoleList } from './role-list.js';
import { renderRoleForm } from './role-form.js';
import { renderRoleEditForm } from './role-edit-form.js';

const CONFIG_KEYS = {
  SCIM_ENDPOINT: 'scim_endpoint',
  API_KEY: 'scim_api_key',
  IS_VALIDATED: 'scim_config_validated',
  USE_CORS_PROXY: 'use_cors_proxy'
};

// The CORS proxy is always available via the /proxy/ route
// This works for both local and remote access since Nginx handles the routing
export const LOCAL_CORS_PROXY = '/proxy/';

export function withCorsProxy(endpoint, useProxy) {
  if (!useProxy) return endpoint;
  
  if (endpoint.startsWith('/proxy/')) return endpoint;
  // Use the nginx proxy path which will forward to the Python CORS proxy
  return '/proxy/' + endpoint.replace(/^https?:\/\//, 'https://');
}

// Try to load from .env (for local dev with Vite/Parcel/etc.), fallback to localStorage
async function loadEnvConfig() {
  const useProxy = localStorage.getItem(CONFIG_KEYS.USE_CORS_PROXY) === 'true';
  if (window.ENV) {
    // If using a bundler that injects ENV
    return {
      endpoint: withCorsProxy(window.ENV.SCIM_ENDPOINT, useProxy),
      apiKey: window.ENV.SCIM_API_KEY,
      useProxy
    };
  }
  // Try to load from localStorage
  return {
    endpoint: localStorage.getItem(CONFIG_KEYS.SCIM_ENDPOINT) || '',
    apiKey: localStorage.getItem(CONFIG_KEYS.API_KEY) || '',
    useProxy
  };
}

function saveConfig(endpoint, apiKey, useProxy) {
  // Store the original endpoint (without proxy) in localStorage
  if (endpoint.startsWith(LOCAL_CORS_PROXY)) {
    endpoint = endpoint.slice(LOCAL_CORS_PROXY.length);
  }
  localStorage.setItem(CONFIG_KEYS.SCIM_ENDPOINT, endpoint);
  localStorage.setItem(CONFIG_KEYS.API_KEY, apiKey);
  localStorage.setItem(CONFIG_KEYS.IS_VALIDATED, 'false');
  localStorage.setItem(CONFIG_KEYS.USE_CORS_PROXY, useProxy ? 'true' : 'false');
}

function setValidated(valid) {
  localStorage.setItem(CONFIG_KEYS.IS_VALIDATED, valid ? 'true' : 'false');
}

function getValidated() {
  return localStorage.getItem(CONFIG_KEYS.IS_VALIDATED) === 'true';
}

async function validateSCIMConfig(endpoint, apiKey, useProxy) {
  try {
    const url = withCorsProxy(endpoint.replace(/\/$/, ''), useProxy) + '/ServiceProviderConfig';
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/scim+json'
      }
    });
    const ct = res.headers.get('content-type') || '';
    const body = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
    const valid = res.ok && (ct.includes('application/scim+json') || ct.includes('application/json'));
    if (!valid) {
      return {
        valid: false,
        status: res.status,
        statusText: res.statusText,
        contentType: ct,
        body
      };
    }
    return { valid: true };
  } catch (e) {
    return {
      valid: false,
      error: e.message
    };
  }
}

function renderConfigForm(container, { endpoint, apiKey, useProxy = false, error = '' }) {
  if (!container) container = document.getElementById('app');
  
  // Handle null/undefined values to show blank instead of "null" text
  const endpointValue = endpoint || '';
  const apiKeyValue = apiKey || '';
  
  container.innerHTML = `
    <div class="container">
      <h1>SCIM Client Test Harness</h1>
      <form id="scim-config-form" class="resource-form">
        <div class="form-group">
          <label class="form-label">
            SCIM Endpoint URL
          </label>
          <input type="url" id="scim-endpoint" value="${endpointValue}" required placeholder="https://scim.example.com/v2" class="form-control form-control-wide">
        </div>
        <div class="form-group">
          <label class="form-label">
            API Key
          </label>
          <input type="text" id="scim-api-key" value="${apiKeyValue}" required placeholder="API Key" class="form-control form-control-wide">
        </div>
        <div class="form-group">
          <label class="form-label">
            <input type="checkbox" id="use-cors-proxy" ${useProxy ? 'checked' : ''} class="form-control">
            Use CORS proxy (/proxy/)
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Validate & Save</button>
          <button type="button" id="clear-all-data-btn" class="btn btn-secondary">Clear All Locally Cached Data</button>
        </div>
                      ${error ? `<div class="alert alert-danger error-display">${error}</div>` : ''}
            </form>
    </div>
  `;
  container.querySelector('#scim-config-form').onsubmit = async (e) => {
    e.preventDefault();
    const endpoint = container.querySelector('#scim-endpoint').value.trim();
    const apiKey = container.querySelector('#scim-api-key').value.trim();
    const useProxy = container.querySelector('#use-cors-proxy').checked;
    const result = await validateSCIMConfig(endpoint, apiKey, useProxy);
    if (result.valid) {
      saveConfig(endpoint, apiKey, useProxy);
      setValidated(true);
      renderApp();
    } else {
      let errorMsg = 'Validation failed.';
      if (result.error) {
        errorMsg += `\nError: ${result.error}`;
      } else {
        errorMsg += `\nStatus: ${result.status} ${result.statusText}`;
        errorMsg += `\nContent-Type: ${result.contentType}`;
        errorMsg += `\nResponse Body: ${typeof result.body === 'object' ? JSON.stringify(result.body, null, 2) : result.body}`;
      }
      renderConfigForm(container, { endpoint, apiKey, useProxy, error: errorMsg });
    }
  };
  // Move clear all data button logic here for clarity
  const clearBtn = container.querySelector('#clear-all-data-btn');
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (confirm('Are you sure you want to clear all SCIM client data? This cannot be undone.')) {
        clearAllScimData();
      }
    };
  }
}

let currentSection = 'users';

// Global metadata state
let scimMetadata = {
  serviceProviderConfig: null,
  resourceTypes: null,
  schemas: null,
  loading: true,
  error: null
};

const METADATA_CACHE_KEYS = {
  serviceProviderConfig: 'scim_serviceProviderConfig',
  resourceTypes: 'scim_resourceTypes',
  schemas: 'scim_schemas',
  cacheTime: 'scim_metadata_cache_time'
};
const METADATA_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function loadMetadataFromCache() {
  const cacheTime = parseInt(localStorage.getItem(METADATA_CACHE_KEYS.cacheTime), 10);
  if (!cacheTime || Date.now() - cacheTime > METADATA_CACHE_TTL_MS) return null;
  const svc = localStorage.getItem(METADATA_CACHE_KEYS.serviceProviderConfig);
  const rtypes = localStorage.getItem(METADATA_CACHE_KEYS.resourceTypes);
  const schemas = localStorage.getItem(METADATA_CACHE_KEYS.schemas);
  if (svc && rtypes && schemas) {
    return {
      serviceProviderConfig: JSON.parse(svc),
      resourceTypes: JSON.parse(rtypes),
      schemas: JSON.parse(schemas)
    };
  }
  return null;
}

function saveMetadataToCache({ serviceProviderConfig, resourceTypes, schemas }) {
  localStorage.setItem(METADATA_CACHE_KEYS.serviceProviderConfig, JSON.stringify(serviceProviderConfig));
  localStorage.setItem(METADATA_CACHE_KEYS.resourceTypes, JSON.stringify(resourceTypes));
  localStorage.setItem(METADATA_CACHE_KEYS.schemas, JSON.stringify(schemas));
  localStorage.setItem(METADATA_CACHE_KEYS.cacheTime, Date.now().toString());
}

// Optimized fetchScimMetadata: use cache first if available, then refresh in background
async function fetchScimMetadata(client) {
  console.log('fetchScimMetadata: Starting metadata fetch');
  scimMetadata.loading = true;
  scimMetadata.error = null;
  let usedCache = false;
  
  // 1. Try cache first
  const cached = loadMetadataFromCache();
  if (cached) {
    console.log('fetchScimMetadata: Using cached metadata');
    scimMetadata.serviceProviderConfig = cached.serviceProviderConfig;
    scimMetadata.resourceTypes = cached.resourceTypes;
    scimMetadata.schemas = cached.schemas;
    scimMetadata.loading = false;
    scimMetadata.error = null;
    usedCache = true;
    
    // Start background refresh with minimum delay
    (async () => {
      console.log('fetchScimMetadata: Starting background refresh');
      // Add a minimum delay to allow time for server to be ready
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      try {
        const svc = await client.getServiceProviderConfig();
        const rtypes = await client._fetch('/ResourceTypes');
        const schemas = await client._fetch('/Schemas');
        
        if (svc.ok && rtypes.ok && schemas.ok) {
          console.log('fetchScimMetadata: Background refresh successful');
          // Only update if changed
          if (
            JSON.stringify(svc.data) !== JSON.stringify(cached.serviceProviderConfig) ||
            JSON.stringify(rtypes.data.Resources) !== JSON.stringify(cached.resourceTypes) ||
            JSON.stringify(schemas.data.Resources) !== JSON.stringify(cached.schemas)
          ) {
            console.log('fetchScimMetadata: Updating cache with fresh data');
            scimMetadata.serviceProviderConfig = svc.data;
            scimMetadata.resourceTypes = rtypes.data.Resources;
            scimMetadata.schemas = schemas.data.Resources;
            saveMetadataToCache({
              serviceProviderConfig: scimMetadata.serviceProviderConfig,
              resourceTypes: scimMetadata.resourceTypes,
              schemas: scimMetadata.schemas
            });
          }
        } else {
          console.warn('fetchScimMetadata: Background refresh failed', {
            svc: svc.ok ? 'OK' : `FAILED (${svc.status})`,
            rtypes: rtypes.ok ? 'OK' : `FAILED (${rtypes.status})`,
            schemas: schemas.ok ? 'OK' : `FAILED (${schemas.status})`
          });
        }
      } catch (e) {
        console.error('fetchScimMetadata: Background refresh error', e);
      }
    })();
    return;
  }
  
  // 2. If no cache, fetch fresh with retry logic and minimum delay
  console.log('fetchScimMetadata: No cache available, fetching fresh metadata');
  let freshOk = false;
  let retryCount = 0;
  const maxRetries = 3; // Increased retries
  const minDelay = 2000; // Minimum 2 second delay for first attempt
  
  // Add initial delay to allow server time to be ready
  console.log('fetchScimMetadata: Adding initial delay to allow server time to be ready');
  await new Promise(resolve => setTimeout(resolve, minDelay));
  
  while (!freshOk && retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        console.log(`fetchScimMetadata: Retry attempt ${retryCount}/${maxRetries}`);
        // Progressive delay: 1s, 2s, 3s
        const retryDelay = 1000 * retryCount;
        console.log(`fetchScimMetadata: Waiting ${retryDelay}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      console.log(`fetchScimMetadata: Attempt ${retryCount + 1} - fetching metadata`);
      const svc = await client.getServiceProviderConfig();
      const rtypes = await client._fetch('/ResourceTypes');
      const schemas = await client._fetch('/Schemas');
      
      console.log('fetchScimMetadata: Fresh fetch results', {
        attempt: retryCount + 1,
        svc: svc.ok ? 'OK' : `FAILED (${svc.status})`,
        rtypes: rtypes.ok ? 'OK' : `FAILED (${rtypes.status})`,
        schemas: schemas.ok ? 'OK' : `FAILED (${schemas.status})`
      });
      
      if (svc.ok && rtypes.ok && schemas.ok) {
        scimMetadata.serviceProviderConfig = svc.data;
        scimMetadata.resourceTypes = rtypes.data.Resources;
        scimMetadata.schemas = schemas.data.Resources;
        saveMetadataToCache({
          serviceProviderConfig: scimMetadata.serviceProviderConfig,
          resourceTypes: scimMetadata.resourceTypes,
          schemas: scimMetadata.schemas
        });
        scimMetadata.loading = false;
        scimMetadata.error = null;
        freshOk = true;
        console.log('fetchScimMetadata: Fresh fetch successful');
        return;
      } else {
        // Log specific failures
        const failures = [];
        if (!svc.ok) failures.push(`ServiceProviderConfig: ${svc.status} ${svc.statusText}`);
        if (!rtypes.ok) failures.push(`ResourceTypes: ${rtypes.status} ${rtypes.statusText}`);
        if (!schemas.ok) failures.push(`Schemas: ${schemas.status} ${schemas.statusText}`);
        
        console.error('fetchScimMetadata: Fresh fetch failed', failures);
        
        // If this is the last retry, show error
        if (retryCount === maxRetries) {
          scimMetadata.loading = false;
          scimMetadata.error = {
            error: 'Failed to fetch SCIM metadata',
            type: 'METADATA_FETCH_ERROR',
            message: `Failed to fetch SCIM metadata after ${maxRetries + 1} attempts: ${failures.join(', ')}`,
            suggestion: 'The SCIM server might need more time to be ready after configuration changes. Try refreshing the page or check the server configuration.',
            details: {
              failures,
              attempts: retryCount + 1,
              totalDelay: minDelay + (retryCount * 1000 * retryCount),
              svc: svc.ok ? null : svc.data,
              rtypes: rtypes.ok ? null : rtypes.data,
              schemas: schemas.ok ? null : schemas.data
            }
          };
          return;
        }
        
        retryCount++;
      }
    } catch (e) {
      console.error('fetchScimMetadata: Exception during fresh fetch', e);
      
      // If this is the last retry, show error
      if (retryCount === maxRetries) {
        scimMetadata.loading = false;
        scimMetadata.error = {
          error: 'Exception during SCIM metadata fetch',
          type: 'METADATA_FETCH_EXCEPTION',
          message: e.message,
          suggestion: 'Check network connectivity and SCIM server availability. The server might need more time to be ready after configuration changes.',
          details: {
            originalError: {
              name: e.name,
              message: e.message,
              stack: e.stack
            },
            attempts: retryCount + 1,
            totalDelay: minDelay + (retryCount * 1000 * retryCount)
          }
        };
        return;
      }
      
      retryCount++;
    }
  }
  
  // 3. If we get here, something went wrong
  scimMetadata.loading = false;
  const errorMsg = freshOk ? null : 'Failed to fetch SCIM metadata and no cached data available.';
  scimMetadata.error = errorMsg;
  console.error('fetchScimMetadata: Final state - no data available', { error: errorMsg });
}

function getSupportedResourceTypes() {
  if (!scimMetadata.resourceTypes) return [];
  return scimMetadata.resourceTypes.map(rt => ({
    id: rt.id.toLowerCase(),
    name: rt.name,
    endpoint: rt.endpoint,
    description: rt.description || '',
    schema: rt.schema,
    ...rt
  }));
}

function renderSidebarNav(selected) {
  // Always show Server Config, Settings
  const staticSections = [
    { id: 'config', label: 'Server Config' },
    { id: 'settings', label: 'Settings' }
  ];
  // Dynamic resource types
  const resourceSections = getSupportedResourceTypes().map(rt => ({
    id: rt.id,
    label: rt.name
  }));
  const sections = [...resourceSections, ...staticSections];
  return `
    <nav class="sidebar-nav">
      ${sections.map(s => `
        <button class="sidebar-btn${selected === s.id ? ' active' : ''}" data-section="${s.id}">${s.label}</button>
      `).join('')}
    </nav>
  `;
}

// Dynamic section <-> URI mapping
function getSectionPath(sectionId) {
  return '/' + sectionId.toLowerCase();
}
function getSectionFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const sectionId = (params.get('section') || '').toLowerCase();
  const resourceTypes = getSupportedResourceTypes();
  const resource = resourceTypes.find(rt => rt.id.toLowerCase() === sectionId);
  if (resource) return resource.id;
  const staticSections = ['config', 'settings'];
  if (staticSections.includes(sectionId)) return sectionId;
  return resourceTypes[0]?.id || 'config';
}
function updateUrlForSection(section) {
  const params = new URLSearchParams(window.location.search);
  params.set('section', section.toLowerCase());
  const newUrl = window.location.pathname + '?' + params.toString();
  if (window.location.search !== '?' + params.toString()) {
    window.history.pushState({ section }, '', newUrl);
  }
}

function renderApp() {
  const endpoint = localStorage.getItem(CONFIG_KEYS.SCIM_ENDPOINT);
  const apiKey = localStorage.getItem(CONFIG_KEYS.API_KEY);
  const useProxy = localStorage.getItem(CONFIG_KEYS.USE_CORS_PROXY) === 'true';
  if (!getValidated()) {
    renderConfigForm(null, { endpoint, apiKey, useProxy });
    return;
  }
  const client = new SCIMClient();
  if (scimMetadata.loading) {
    document.getElementById('app').innerHTML = `
      <div class="container">
        <h1>SCIM Client Test Harness</h1>
        <div class="loading-spinner metadata-loading">
          <div class="spinner"></div>
          <div class="loading-title">
            Loading SCIM metadata...
          </div>
          <div class="loading-description">
            This may take a few moments while the server prepares the metadata
          </div>
          <div class="loading-note">
            If this takes too long, the server might need more time to be ready
          </div>
        </div>
      </div>
    `;
    return;
  }
  if (scimMetadata.error) {
    // Handle error object properly
    let errorMessage = 'Failed to load SCIM metadata';
    let errorDetails = '';
    let errorSuggestion = '';
    
    if (typeof scimMetadata.error === 'string') {
      errorMessage = scimMetadata.error;
    } else if (scimMetadata.error && typeof scimMetadata.error === 'object') {
      errorMessage = scimMetadata.error.message || scimMetadata.error.error || 'Failed to load SCIM metadata';
      errorSuggestion = scimMetadata.error.suggestion || '';
      
      // Add additional details if available
      if (scimMetadata.error.details) {
        const details = scimMetadata.error.details;
        if (details.attempts) {
          errorDetails += `Attempts: ${details.attempts}\n`;
        }
        if (details.totalDelay) {
          errorDetails += `Total delay: ${details.totalDelay}ms\n`;
        }
        if (details.failures && details.failures.length > 0) {
          errorDetails += `Failures:\n${details.failures.map(f => `  - ${f}`).join('\n')}\n`;
        }
      }
    }
    
    document.getElementById('app').innerHTML = `
      <div class="container">
        <h1>SCIM Client Test Harness</h1>
        <div class="error-message">
          <h3>Metadata Loading Error</h3>
          <div class="error-details">${errorMessage}</div>
          ${errorSuggestion ? `<div class="error-suggestion"><strong>💡 Suggestion:</strong> ${errorSuggestion}</div>` : ''}
          ${errorDetails ? `<details class="error-details-expanded"><summary>📋 Show Technical Details</summary><pre>${errorDetails}</pre></details>` : ''}
          <div class="error-actions">
            <button onclick="retryMetadataLoading()" class="btn btn-primary">🔄 Retry Now</button>
            <button onclick="clearAllScimData()" class="btn btn-danger">🗑️ Clear Data & Retry</button>
            <button onclick="window.location.href='?section=settings'" class="btn btn-secondary">⚙️ Check Settings</button>
          </div>
        </div>
        </div>
      </div>
    `;
    return;
  }
  const resourceTypes = getSupportedResourceTypes();
  const validSections = resourceTypes.map(rt => rt.id).concat(['config', 'settings']);
  if (!validSections.includes(currentSection)) {
    currentSection = resourceTypes[0]?.id || 'config';
  }
  updateUrlForSection(currentSection);
  document.getElementById('app').innerHTML = `
    <div class="app-layout">
      <div class="topnav">
        ${renderSidebarNav(currentSection)}
      </div>
      <div class="main-panel" id="main-panel"></div>
    </div>
  `;
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.onclick = () => {
      currentSection = btn.getAttribute('data-section');
      updateUrlForSection(currentSection);
      renderApp();
    };
  });
  renderSection(currentSection);
}

window.onpopstate = function (event) {
  const section = getSectionFromQuery();
  currentSection = section;
  renderApp();
};

// Enhanced metadata loading with better user experience
async function loadMetadataWithRetry() {
  // Only proceed if configuration is validated
  if (!getValidated()) {
    console.log('loadMetadataWithRetry: Configuration not validated, skipping metadata load');
    return;
  }
  
  const client = new SCIMClient();
  
  // Show initial loading state
  scimMetadata.loading = true;
  scimMetadata.error = null;
  renderApp();
  
  try {
    await fetchScimMetadata(client);
  } catch (error) {
    console.error('loadMetadataWithRetry: Unexpected error', error);
    scimMetadata.loading = false;
    scimMetadata.error = {
      error: 'Unexpected error during metadata loading',
      type: 'UNEXPECTED_ERROR',
      message: error.message || 'An unexpected error occurred',
      suggestion: 'Please try refreshing the page or check your browser console for more details.',
      details: {
        originalError: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }
    };
  }
  
  // After metadata is loaded, re-parse the section from the URL
  const section = getSectionFromQuery();
  currentSection = section;
  renderApp();
}

// On initial load, check configuration and load metadata if validated
(async function initApp() {
  // Check if configuration is validated before trying to load metadata
  if (getValidated()) {
    await loadMetadataWithRetry();
  } else {
    // If not validated, just render the app (which will show the config form)
    renderApp();
  }
  
  // Add global event listener for navigation
  document.addEventListener('navigate', (event) => {
    const { section, action, id } = event.detail;
    currentSection = section;
    
    if (action === 'create') {
      renderCreateForm(section);
    } else if (action === 'edit' && id) {
      renderEditForm(section, id);
    } else if (action === 'view' && id) {
      renderDetailView(section, id);
    } else {
      renderApp();
    }
  });
})();

// Helper functions for handling navigation actions
function renderCreateForm(section) {
  const mainPanel = document.getElementById('main-panel');
  const client = new SCIMClient();
  const reqResPanel = document.createElement('div');
  reqResPanel.className = 'req-res-panel';
  
  mainPanel.innerHTML = '';
  mainPanel.appendChild(reqResPanel);
  
  if (section === 'entitlements') {
    renderEntitlementForm(mainPanel, client, mainPanel, reqResPanel);
  } else if (section === 'roles') {
    renderRoleForm(mainPanel, client, mainPanel, reqResPanel);
  } else if (section === 'users') {
    renderUserForm(mainPanel, client, mainPanel, reqResPanel);
  } else if (section === 'groups') {
    renderGroupForm(mainPanel, client, mainPanel, reqResPanel);
  }
}

function renderEditForm(section, id) {
  const mainPanel = document.getElementById('main-panel');
  const client = new SCIMClient();
  const reqResPanel = document.createElement('div');
  reqResPanel.className = 'req-res-panel';
  
  mainPanel.innerHTML = '';
  mainPanel.appendChild(reqResPanel);
  
  if (section === 'entitlements') {
    renderEntitlementEditForm(mainPanel, client, id, mainPanel, reqResPanel);
  } else if (section === 'roles') {
    renderRoleEditForm(mainPanel, client, id, mainPanel, reqResPanel);
  } else if (section === 'users') {
    renderUserEditForm(mainPanel, client, id, mainPanel, reqResPanel);
  } else if (section === 'groups') {
    renderGroupEditForm(mainPanel, client, id, mainPanel, reqResPanel);
  }
}

function renderDetailView(section, id) {
  // For now, just navigate back to the list view
  // This can be enhanced later to show detailed views
  currentSection = section;
  renderApp();
}

function clearAllScimData() {
  Object.values(METADATA_CACHE_KEYS).forEach(key => localStorage.removeItem(key));
  localStorage.removeItem(CONFIG_KEYS.SCIM_ENDPOINT);
  localStorage.removeItem(CONFIG_KEYS.API_KEY);
  localStorage.removeItem(CONFIG_KEYS.IS_VALIDATED);
  localStorage.removeItem(CONFIG_KEYS.USE_CORS_PROXY);
  // Add any other SCIM-related keys here
  location.reload();
}

// Global function to retry metadata loading
window.retryMetadataLoading = async function() {
  console.log('retryMetadataLoading: Starting manual retry');
  await loadMetadataWithRetry();
};

function renderSettingsSection(mainPanel) {
  mainPanel.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = 'Settings';
  mainPanel.appendChild(header);
  const desc = document.createElement('div');
  desc.textContent = 'Update the SCIM endpoint, API key, and CORS proxy setting.';
  desc.className = 'info-description';
  mainPanel.appendChild(desc);
  renderConfigForm(mainPanel, {
    endpoint: localStorage.getItem(CONFIG_KEYS.SCIM_ENDPOINT) || '',
    apiKey: localStorage.getItem(CONFIG_KEYS.API_KEY) || '',
    useProxy: localStorage.getItem(CONFIG_KEYS.USE_CORS_PROXY) === 'true'
  });
  // Remove duplicate Clear All Data button here
}

// Update renderSection to use renderSettingsSection for 'settings'
function renderSection(section) {
  const mainPanel = document.getElementById('main-panel');
  const client = new SCIMClient();
  const resourceTypes = getSupportedResourceTypes();
  const resource = resourceTypes.find(rt => rt.id === section);
  
  if (resource) {
    // Handle specific resource types with custom components
    if (section === 'users') {
      renderUsersSection(mainPanel, client, resource);
    } else if (section === 'groups') {
      renderGroupsSection(mainPanel, client, resource);
    } else if (section === 'entitlements') {
      renderEntitlementsSection(mainPanel, client, resource);
    } else if (section === 'roles') {
      renderRolesSection(mainPanel, client, resource);
    } else {
      // Generic handling for other resource types
      renderResourceSection(mainPanel, client, resource);
    }
  } else if (section === 'config') {
    renderServerConfigSection(mainPanel, client);
  } else if (section === 'settings') {
    renderSettingsSection(mainPanel);
  }
}

// Add new section renderers for entitlements and roles
async function renderEntitlementsSection(mainPanel, client, resource) {
  const container = document.createElement('div');
  const reqResPanel = document.createElement('div');
  reqResPanel.className = 'req-res-panel';
  
  mainPanel.innerHTML = '';
  mainPanel.appendChild(container);
  mainPanel.appendChild(reqResPanel);
  
  await renderEntitlementList(container, client, mainPanel, reqResPanel);
}

async function renderRolesSection(mainPanel, client, resource) {
  const container = document.createElement('div');
  const reqResPanel = document.createElement('div');
  reqResPanel.className = 'req-res-panel';
  
  mainPanel.innerHTML = '';
  mainPanel.appendChild(container);
  mainPanel.appendChild(reqResPanel);
  
  await renderRoleList(container, client, mainPanel, reqResPanel);
}

async function renderResourceSection(mainPanel, client, resource) {
  console.log('renderResourceSection: Starting', { resource: resource.name });
  
  try {
    const schema = findSchemaById(resource.schema);
    if (!schema) {
      console.warn('renderResourceSection: No schema found for resource', { resource: resource.name, schemaId: resource.schema });
    }
    
    mainPanel.innerHTML = '';
    const header = document.createElement('h1');
    header.textContent = resource.name;
    mainPanel.appendChild(header);
    const desc = document.createElement('div');
    desc.textContent = `View, create, edit, and delete ${resource.name.toLowerCase()}. All actions show raw SCIM requests and responses.`;
    desc.className = 'info-description';
    mainPanel.appendChild(desc);
    
    // Summary table container
    const listDiv = document.createElement('div');
    mainPanel.appendChild(listDiv);
    
    // Section-wide request/response panel (accordion)
    let lastReqRes = null;
    const accordion = document.createElement('div');
    accordion.className = 'reqres-accordion';
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Show Raw Request/Response';
    toggleBtn.className = 'reqres-toggle-btn';
    const panel = document.createElement('div');
    panel.className = 'reqres-panel hidden';
    accordion.appendChild(toggleBtn);
    accordion.appendChild(panel);
    mainPanel.appendChild(accordion);
    
    toggleBtn.onclick = () => {
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        toggleBtn.textContent = 'Hide Raw Request/Response';
        if (lastReqRes) {
                  panel.innerHTML = '';
        window.renderJSON(panel, lastReqRes);
        }
      } else {
        panel.classList.add('hidden');
        toggleBtn.textContent = 'Show Raw Request/Response';
      }
    };
    
    function updateReqResPanel(data) {
      lastReqRes = data;
      if (!panel.classList.contains('hidden')) {
        panel.innerHTML = '';
        window.renderJSON(panel, lastReqRes);
      }
    }
    
    showLoading(listDiv, `Loading ${resource.name.toLowerCase()}...`);
    console.log('renderResourceSection: Fetching resource list', { endpoint: resource.endpoint });
    
    const listRes = await client._fetch(resource.endpoint, { count: 10 });
    listDiv.innerHTML = '';
    
    updateReqResPanel({
      request: {
        method: 'GET',
        url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + resource.endpoint + '?count=10' : client.endpoint + resource.endpoint + '?count=10',
        headers: client.headers
      },
      response: listRes
    });
    
    if (listRes.ok && listRes.data && Array.isArray(listRes.data.Resources)) {
      console.log('renderResourceSection: Successfully loaded resources', { 
        count: listRes.data.Resources.length,
        resource: resource.name 
      });
      
      const createBtn = document.createElement('button');
      createBtn.textContent = `Create ${resource.name}`;
      createBtn.className = 'btn btn-primary';
      mainPanel.appendChild(createBtn);
      const formDiv = document.createElement('div');
      mainPanel.appendChild(formDiv);
      
      createBtn.onclick = () => {
        if (resource.name.toLowerCase() === 'user') {
          renderUserForm(formDiv, async data => {
            showLoading(formDiv, `Creating ${resource.name.toLowerCase()}...`);
            const req = {
              method: 'POST',
              url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + resource.endpoint : client.endpoint + resource.endpoint,
              headers: client.headers,
              body: data
            };
            const result = await client._fetch(resource.endpoint, {}, 'POST', data);
            updateReqResPanel({ request: req, response: result });
            return { __req: req, __res: result };
          }, { schema });
        } else if (resource.name.toLowerCase() === 'group') {
          renderGroupForm(formDiv, async data => {
            showLoading(formDiv, `Creating ${resource.name.toLowerCase()}...`);
            const req = {
              method: 'POST',
              url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + resource.endpoint : client.endpoint + resource.endpoint,
              headers: client.headers,
              body: data
            };
            const result = await client._fetch(resource.endpoint, {}, 'POST', data);
            updateReqResPanel({ request: req, response: result });
            return { __req: req, __res: result };
          }, { schema });
        } else {
          renderUserForm(formDiv, async data => {
            showLoading(formDiv, `Creating ${resource.name.toLowerCase()}...`);
            const req = {
              method: 'POST',
              url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + resource.endpoint : client.endpoint + resource.endpoint,
              headers: client.headers,
              body: data
            };
            const result = await client._fetch(resource.endpoint, {}, 'POST', data);
            updateReqResPanel({ request: req, response: result });
            return { __req: req, __res: result };
          }, { schema });
        }
      };
      
      const detailDiv = document.createElement('div');
      mainPanel.appendChild(detailDiv);
      
      if (resource.name.toLowerCase() === 'user') {
        renderUserList(listDiv, listRes.data.Resources, async item => {
          // Simulate a detail fetch; if you have a real endpoint, use it here
          updateReqResPanel({
            request: {
              method: 'GET',
              url: client.useProxy
                ? LOCAL_CORS_PROXY + client.endpoint + resource.endpoint + '/' + item.id
                : client.endpoint + resource.endpoint + '/' + item.id,
              headers: client.headers
            },
            response: item
          });
          renderUserDetail(detailDiv, item, client, mainPanel, null, schema);
        }, { schema });
      } else if (resource.name.toLowerCase() === 'group') {
        renderGroupList(listDiv, listRes.data.Resources, item => {
          renderGroupDetail(detailDiv, item, client, mainPanel, null, schema);
        }, { schema });
      } else {
        renderUserList(listDiv, listRes.data.Resources, item => {
          renderUserDetail(detailDiv, item, client, mainPanel, null, schema);
        }, { schema });
      }
      
      if (listRes.data.Resources.length === 0) {
        listDiv.innerHTML = `<div>No ${resource.name.toLowerCase()}s found.</div>`;
      }
    } else {
      console.error('renderResourceSection: Failed to load resources', {
        ok: listRes.ok,
        status: listRes.status,
        data: listRes.data,
        resource: resource.name
      });
      showError(listDiv, {
        error: `Failed to load ${resource.name.toLowerCase()}s`,
        status: listRes.status,
        statusText: listRes.statusText,
        data: listRes.data,
        type: 'RESOURCE_LOAD_ERROR',
        suggestion: 'Check the SCIM endpoint configuration and server connectivity'
      });
    }
  } catch (e) {
    console.error('renderResourceSection: Exception', e);
    showError(mainPanel, {
      error: `Exception while rendering ${resource.name} section`,
      message: e.message,
      stack: e.stack,
      name: e.name,
      type: 'RENDER_ERROR',
      suggestion: 'Check the error details below for debugging information',
      details: {
        resource: resource.name,
        resourceId: resource.id,
        schemaId: resource.schema,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    });
  }
}

async function runSCIMLiveTests() {
  const svcPanel = document.getElementById('svc-config-panel');
  const usersPanel = document.getElementById('users-panel');
  const groupsPanel = document.getElementById('groups-panel');
  showLoading(svcPanel, 'Testing /ServiceProviderConfig ...');
  showLoading(usersPanel, 'Testing /Users ...');
  showLoading(groupsPanel, 'Testing /Groups ...');
  const client = new SCIMClient();
  // ServiceProviderConfig
  const svc = await client.getServiceProviderConfig();
  if (svc.ok) {
    window.renderJSON(svcPanel, svc.data);
  } else {
    showError(svcPanel, `Error (${svc.status}): ${svc.data}`);
  }
  // Users
  await renderUsersSection(usersPanel, client);
  // Groups
  await renderGroupsSection(groupsPanel, client);
}

function findSchemaById(schemaId) {
  if (!scimMetadata.schemas) return null;
  return scimMetadata.schemas.find(s => s.id === schemaId);
}

async function renderUsersSection(mainPanel, client, resource) {
  mainPanel.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = 'Users';
  mainPanel.appendChild(header);
  const desc = document.createElement('div');
  desc.textContent = 'View, create, edit, and delete users. All actions show raw SCIM requests and responses.';
  desc.className = 'info-description';
  mainPanel.appendChild(desc);
  
  // Create action row with create button and search/filter controls
  const actionRow = document.createElement('div');
  actionRow.className = 'action-row';
  mainPanel.appendChild(actionRow);
  
  // Create user button
  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create User';
  createBtn.className = 'btn btn-primary';
  actionRow.appendChild(createBtn);
  
  // Search box
  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';
  const searchLabel = document.createElement('label');
  searchLabel.textContent = 'Quick Search:';
  searchLabel.className = 'search-label';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by username, name, email...';
  searchInput.className = 'form-control';
  searchContainer.appendChild(searchLabel);
  searchContainer.appendChild(searchInput);
  actionRow.appendChild(searchContainer);
  
  const reqResPanel = document.createElement('div');
  reqResPanel.className = 'reqres-panel-container';
  mainPanel.appendChild(reqResPanel);
  
  const schema = findSchemaById(resource.schema);
  
  // Create container for user list
  const userListDiv = document.createElement('div');
  mainPanel.appendChild(userListDiv);
  const userDetailDiv = document.createElement('div');
  mainPanel.appendChild(userDetailDiv);
  
  // Function to load and display users with filters
  async function loadUsers(filterParams = { count: 10 }) {
    showLoading(userListDiv, 'Loading users...');
    
    try {
      const users = await client.getUsers(filterParams);
      
      // Update request/response panel
      const url = client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + '/Users' : client.endpoint + '/Users';
      const queryString = Object.keys(filterParams).length > 0 ? '?' + new URLSearchParams(filterParams).toString() : '';
      
      window.renderJSON(reqResPanel, {
        request: {
          method: 'GET',
          url: url + queryString,
          headers: client.headers
        },
        response: users
      });
      
      if (users.ok && users.data && Array.isArray(users.data.Resources)) {
        renderUserList(userListDiv, users.data.Resources, (user, action = 'edit') => {
          if (action === 'delete') {
            // Handle delete action
            showLoading(userDetailDiv, 'Deleting user...');
            client.deleteUser(user.id).then(result => {
              window.renderJSON(reqResPanel, {
                request: {
                  method: 'DELETE',
                  url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + `/Users/${user.id}` : client.endpoint + `/Users/${user.id}`,
                  headers: client.headers
                },
                response: result
              });
              if (result.ok) {
                userDetailDiv.innerHTML = '<div class="success-message">User deleted successfully.</div>';
                loadUsers(); // Reload users after deletion
              } else {
                showError(userDetailDiv, `Error (${result.status}): ${JSON.stringify(result.data)}`);
              }
            });
          } else {
            // Handle edit action - modal handles its own display
            renderUserEditForm(null, user, async updatedUser => {
              const patchOps = [];
              for (const key in updatedUser) {
                if (key !== 'schemas' && key !== 'id' && updatedUser[key] !== user[key]) {
                  patchOps.push({ op: 'replace', path: key, value: updatedUser[key] });
                }
              }
              if (patchOps.length === 0) {
                return { __req: null, __res: null };
              }
              const req = {
                method: 'PATCH',
                url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + `/Users/${user.id}` : client.endpoint + `/Users/${user.id}`,
                headers: client.headers,
                body: patchOps
              };
              const result = await client.updateUser(user.id, patchOps);
              window.renderJSON(reqResPanel, { request: req, response: result });
              if (result.ok) {
                await loadUsers(); // Reload users after update
              }
              return { __req: req, __res: result };
            }, { schema });
          }
        }, { 
          schema, 
          client, 
          onFilterChange: (newParams) => {
            loadUsers(newParams);
          }
        });
      } else {
        showError(userListDiv, `Error (${users.status}): ${users.data}`);
      }
    } catch (error) {
      showError(userListDiv, `Error loading users: ${error.message}`);
    }
  }
  
  // Initial load
  await loadUsers();
  
  // Create user button handler - use modal
  createBtn.onclick = () => {
    renderUserCreateModal(null, async userData => {
      const req = {
        method: 'POST',
        url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + '/Users' : client.endpoint + '/Users',
        headers: client.headers,
        body: userData
      };
      const result = await client.createUser(userData);
      window.renderJSON(reqResPanel, { request: req, response: result });
      if (result.ok) {
        await loadUsers(); // Reload users after creation
      }
      return { __req: req, __res: result };
    }, { schema });
  };
  
  // Quick search handler
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    if (searchTerm) {
      loadUsers({ 
        filter: `userName sw "${searchTerm}" or displayName sw "${searchTerm}" or name.givenName sw "${searchTerm}" or name.familyName sw "${searchTerm}" or emails.value sw "${searchTerm}"`,
        count: 50
      });
    } else {
      loadUsers({ count: 10 });
    }
  });
}

function renderUserDetail(container, user, client, mainPanel, reqResPanel, schema) {
  container.innerHTML = '';
  // Button row at the top
  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.className = 'btn btn-secondary';
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'btn btn-danger';
  btnRow.appendChild(editBtn);
  btnRow.appendChild(deleteBtn);
  container.appendChild(btnRow);
  // Expandable JSON below
  const jsonAccordion = document.createElement('div');
  jsonAccordion.className = 'user-detail-json-accordion';
  const jsonToggle = document.createElement('button');
  jsonToggle.textContent = 'Show User JSON';
  jsonToggle.className = 'reqres-toggle-btn';
  const jsonPanel = document.createElement('div');
  jsonPanel.className = 'reqres-panel';
  jsonAccordion.appendChild(jsonToggle);
  jsonAccordion.appendChild(jsonPanel);
  container.appendChild(jsonAccordion);
  jsonToggle.onclick = () => {
    if (jsonPanel.classList.contains('hidden')) {
      jsonPanel.classList.remove('hidden');
      jsonToggle.textContent = 'Hide User JSON';
      jsonPanel.innerHTML = '';
      window.renderJSON(jsonPanel, user);
    } else {
      jsonPanel.classList.add('hidden');
      jsonToggle.textContent = 'Show User JSON';
    }
  };
  editBtn.onclick = () => {
    renderUserEditForm(container, user, async updatedUser => {
      showLoading(container, 'Updating user...');
      const patchOps = [];
      for (const key in updatedUser) {
        if (key !== 'schemas' && key !== 'id' && updatedUser[key] !== user[key]) {
          patchOps.push({ op: 'replace', path: key, value: updatedUser[key] });
        }
      }
      if (patchOps.length === 0) {
        container.innerHTML = '<div class="success-message">No changes to update.</div>';
        renderUserDetail(container, user, client, mainPanel, reqResPanel, schema);
        return { __req: null, __res: null };
      }
      const req = {
        method: 'PATCH',
        url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + `/Users/${user.id}` : client.endpoint + `/Users/${user.id}`,
        headers: client.headers,
        body: patchOps
      };
      const result = await client.updateUser(user.id, patchOps);
      window.renderJSON(reqResPanel, { request: req, response: result });
      if (result.ok) {
        container.innerHTML = '<div class="success-message">User updated successfully.</div>';
        await renderUsersSection(mainPanel, client, { schema: schema.id });
      } else {
        showError(container, `Error (${result.status}): ${JSON.stringify(result.data)}`);
      }
      return { __req: req, __res: result };
    }, { schema });
  };
  deleteBtn.onclick = async () => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    showLoading(container, 'Deleting user...');
    const result = await client.deleteUser(user.id);
    window.renderJSON(reqResPanel, {
      request: {
        method: 'DELETE',
        url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + `/Users/${user.id}` : client.endpoint + `/Users/${user.id}`,
        headers: client.headers
      },
      response: result
    });
    if (result.ok) {
      container.innerHTML = '<div class="success-message">User deleted successfully.</div>';
      await renderUsersSection(mainPanel, client, { schema: schema.id });
    } else {
      showError(container, `Error (${result.status}): ${JSON.stringify(result.data)}`);
    }
  };
}

async function renderGroupsSection(mainPanel, client, resource) {
  mainPanel.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = 'Groups';
  mainPanel.appendChild(header);
  const desc = document.createElement('div');
  desc.textContent = 'View, create, edit, and delete groups. All actions show raw SCIM requests and responses.';
  desc.className = 'info-description';
  mainPanel.appendChild(desc);
  
  // Create action row with create button and search/filter controls
  const actionRow = document.createElement('div');
  actionRow.className = 'action-row';
  mainPanel.appendChild(actionRow);
  
  // Create group button
  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create Group';
  createBtn.className = 'btn btn-primary';
  actionRow.appendChild(createBtn);
  
  // Search box
  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';
  const searchLabel = document.createElement('label');
  searchLabel.textContent = 'Quick Search:';
  searchLabel.className = 'search-label';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by display name, external ID...';
  searchInput.className = 'form-control';
  searchContainer.appendChild(searchLabel);
  searchContainer.appendChild(searchInput);
  actionRow.appendChild(searchContainer);
  
  const reqResPanel = document.createElement('div');
  reqResPanel.className = 'reqres-panel-container';
  mainPanel.appendChild(reqResPanel);
  
  const schema = findSchemaById(resource.schema);
  
  // Create container for group list
  const groupListDiv = document.createElement('div');
  mainPanel.appendChild(groupListDiv);
  const groupDetailDiv = document.createElement('div');
  mainPanel.appendChild(groupDetailDiv);
  
  // Function to load and display groups with filters
  async function loadGroups(filterParams = { count: 10 }) {
    showLoading(groupListDiv, 'Loading groups...');
    
    try {
      const groups = await client.getGroups(filterParams);
      
      // Update request/response panel
      const url = client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + '/Groups' : client.endpoint + '/Groups';
      const queryString = Object.keys(filterParams).length > 0 ? '?' + new URLSearchParams(filterParams).toString() : '';
      
      window.renderJSON(reqResPanel, {
        request: {
          method: 'GET',
          url: url + queryString,
          headers: client.headers
        },
        response: groups
      });
      
      if (groups.ok && groups.data && Array.isArray(groups.data.Resources)) {
        renderGroupList(groupListDiv, groups.data.Resources, (group, action = 'edit') => {
          if (action === 'delete') {
            // Handle delete action
            showLoading(groupDetailDiv, 'Deleting group...');
            client.deleteGroup(group.id).then(result => {
              window.renderJSON(reqResPanel, {
                request: {
                  method: 'DELETE',
                  url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + `/Groups/${group.id}` : client.endpoint + `/Groups/${group.id}`,
                  headers: client.headers
                },
                response: result
              });
              if (result.ok) {
                groupDetailDiv.innerHTML = '<div class="success-message">Group deleted successfully.</div>';
                loadGroups(); // Reload groups after deletion
              } else {
                showError(groupDetailDiv, `Error (${result.status}): ${JSON.stringify(result.data)}`);
              }
            });
          } else {
            // Handle edit action - modal handles its own display
            renderGroupEditForm(null, group, async updatedGroup => {
              const patchOps = [];
              for (const key in updatedGroup) {
                if (key !== 'schemas' && key !== 'id' && updatedGroup[key] !== group[key]) {
                  patchOps.push({ op: 'replace', path: key, value: updatedGroup[key] });
                }
              }
              if (patchOps.length === 0) {
                return { __req: null, __res: null };
              }
              const req = {
                method: 'PATCH',
                url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + `/Groups/${group.id}` : client.endpoint + `/Groups/${group.id}`,
                headers: client.headers,
                body: patchOps
              };
              const result = await client.updateGroup(group.id, patchOps);
              window.renderJSON(reqResPanel, { request: req, response: result });
              if (result.ok) {
                await loadGroups(); // Reload groups after update
              }
              return { __req: req, __res: result };
            }, { schema });
          }
        }, { 
          schema, 
          client, 
          onFilterChange: (newParams) => {
            loadGroups(newParams);
          }
        });
      } else {
        showError(groupListDiv, `Error (${groups.status}): ${groups.data}`);
      }
    } catch (error) {
      showError(groupListDiv, `Error loading groups: ${error.message}`);
    }
  }
  
  // Initial load
  await loadGroups();
  
  // Create group button handler - use modal
  createBtn.onclick = () => {
    renderGroupCreateModal(null, async groupData => {
      const req = {
        method: 'POST',
        url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + '/Groups' : client.endpoint + '/Groups',
        headers: client.headers,
        body: groupData
      };
      const result = await client.createGroup(groupData);
      window.renderJSON(reqResPanel, { request: req, response: result });
      if (result.ok) {
        await loadGroups(); // Reload groups after creation
      }
      return { __req: req, __res: result };
    }, { schema });
  };
  
  // Quick search handler
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    if (searchTerm) {
      loadGroups({ 
        filter: `displayName sw "${searchTerm}" or externalId sw "${searchTerm}"`,
        count: 50
      });
    } else {
      loadGroups({ count: 10 });
    }
  });
}

function renderGroupDetail(container, group, client, mainPanel, reqResPanel, schema) {
  container.innerHTML = '';
  renderJSON(container, group);
  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.className = 'btn btn-secondary';
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'btn btn-danger';
  btnRow.appendChild(editBtn);
  btnRow.appendChild(deleteBtn);
  container.appendChild(btnRow);
  editBtn.onclick = () => {
    renderGroupEditForm(null, group, async updatedGroup => {
      const patchOps = [];
      for (const key in updatedGroup) {
        if (key !== 'schemas' && key !== 'id' && updatedGroup[key] !== group[key]) {
          patchOps.push({ op: 'replace', path: key, value: updatedGroup[key] });
        }
      }
      if (patchOps.length === 0) {
        return { __req: null, __res: null };
      }
      const req = {
        method: 'PATCH',
        url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + `/Groups/${group.id}` : client.endpoint + `/Groups/${group.id}`,
        headers: client.headers,
        body: patchOps
      };
      const result = await client.updateGroup(group.id, patchOps);
      window.renderJSON(reqResPanel, { request: req, response: result });
      if (result.ok) {
        await renderGroupsSection(mainPanel, client, { schema: schema.id });
      }
      return { __req: req, __res: result };
    }, { schema });
  };
  deleteBtn.onclick = async () => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    showLoading(container, 'Deleting group...');
    const result = await client.deleteGroup(group.id);
    window.renderJSON(reqResPanel, {
      request: {
        method: 'DELETE',
        url: client.useProxy ? LOCAL_CORS_PROXY + client.endpoint + `/Groups/${group.id}` : client.endpoint + `/Groups/${group.id}`,
        headers: client.headers
      },
      response: result
    });
    if (result.ok) {
      container.innerHTML = '<div class="success-message">Group deleted successfully.</div>';
      await renderGroupsSection(mainPanel, client, { schema: schema.id });
    } else {
      showError(container, `Error (${result.status}): ${JSON.stringify(result.data)}`);
    }
  };
}

// Helper to render a summary card for any JSON object
function renderSummaryCard(container, data, title) {
  const card = document.createElement('div');
  card.className = 'summary-card';
  if (title) {
    const h = document.createElement('h3');
    h.textContent = title;
    h.className = 'summary-card-title';
    card.appendChild(h);
  }
  const table = document.createElement('table');
  table.className = 'summary-card-table';
  for (const key in data) {
    const row = document.createElement('tr');
    const k = document.createElement('td');
    k.textContent = key;
    k.className = 'summary-card-key';
    const v = document.createElement('td');
    let value = data[key];
    if (Array.isArray(value)) {
      if (value.length === 0) {
        v.textContent = '[empty array]';
      } else if (typeof value[0] === 'object') {
        v.textContent = `[${value.length} items]`; // Could expand if needed
      } else {
        v.textContent = value.join(', ');
      }
    } else if (typeof value === 'object' && value !== null) {
      v.textContent = '{...}';
    } else {
      v.textContent = String(value);
    }
    v.className = 'summary-card-value';
    row.appendChild(k);
    row.appendChild(v);
    table.appendChild(row);
  }
  card.appendChild(table);
  container.appendChild(card);
}

// Helper to render a spec-relevant summary card for each section
function renderSpecSummaryCard(container, data, section) {
  const card = document.createElement('div');
  card.className = 'summary-card';
  const h = document.createElement('h3');
  h.textContent = section + ' Summary';
  card.appendChild(h);
  const table = document.createElement('table');
  table.className = 'summary-card-table';
  if (section === 'ServiceProviderConfig') {
    // Show spec-relevant fields
    const fields = [
      ['documentationUri', data.documentationUri],
      ['specUri', data.specUri],
      ['schemas', Array.isArray(data.schemas) ? data.schemas.join(', ') : data.schemas],
      ['meta.location', data.meta && data.meta.location],
      ['filter.supported', data.filter && data.filter.supported],
      ['patch.supported', data.patch && data.patch.supported],
      ['bulk.supported', data.bulk && data.bulk.supported],
      ['sort.supported', data.sort && data.sort.supported],
      ['changePassword.supported', data.changePassword && data.changePassword.supported],
      ['etag.supported', data.etag && data.etag.supported],
    ];
    fields.forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        const row = document.createElement('tr');
        const keyCell = document.createElement('td');
        keyCell.textContent = k;
        keyCell.className = 'summary-card-key';
        const valCell = document.createElement('td');
        valCell.textContent = String(v);
        valCell.className = 'summary-card-value';
        row.appendChild(keyCell);
        row.appendChild(valCell);
        table.appendChild(row);
      }
    });
    // Authentication Schemes
    if (Array.isArray(data.authenticationSchemes)) {
      data.authenticationSchemes.forEach((scheme, idx) => {
        const row = document.createElement('tr');
        const keyCell = document.createElement('td');
        keyCell.textContent = `authenticationSchemes[${idx}].type`;
        keyCell.className = 'summary-card-key';
        const valCell = document.createElement('td');
        valCell.textContent = `${scheme.type} (${scheme.name || ''})${scheme.description ? ': ' + scheme.description : ''}`;
        valCell.className = 'summary-card-value';
        row.appendChild(keyCell);
        row.appendChild(valCell);
        table.appendChild(row);
      });
    }
  } else if (section === 'ResourceTypes') {
    if (Array.isArray(data.Resources)) {
      data.Resources.forEach((rt, idx) => {
        const row = document.createElement('tr');
        const keyCell = document.createElement('td');
        keyCell.textContent = `Resource[${idx}]`;
        keyCell.className = 'summary-card-key';
        const valCell = document.createElement('td');
        valCell.textContent = `${rt.name} (endpoint: ${rt.endpoint}, schema: ${rt.schema})`;
        valCell.className = 'summary-card-value';
        row.appendChild(keyCell);
        row.appendChild(valCell);
        table.appendChild(row);
      });
    }
  } else if (section === 'Schemas') {
    if (Array.isArray(data.Resources)) {
      data.Resources.forEach((sch, idx) => {
        const row = document.createElement('tr');
        const keyCell = document.createElement('td');
        keyCell.textContent = `Schema[${idx}]`;
        keyCell.className = 'summary-card-key';
        const valCell = document.createElement('td');
        valCell.textContent = `${sch.id}${sch.description ? ': ' + sch.description : ''}`;
        valCell.className = 'summary-card-value';
        row.appendChild(keyCell);
        row.appendChild(valCell);
        table.appendChild(row);
      });
    }
  }
  card.appendChild(table);
  container.appendChild(card);
}

async function renderServerConfigSection(mainPanel, client) {
  mainPanel.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = 'Server Configuration';
  mainPanel.appendChild(header);
  const desc = document.createElement('div');
  desc.textContent = 'Raw ServiceProviderConfig, ResourceTypes, and Schemas from the SCIM server. Each section shows the full HTTP request and response.';
  desc.className = 'info-description';
  mainPanel.appendChild(desc);

  // Helper to create accordion for request/response (existing code)
  function createReqResAccordion(title, req, res) {
    const accordion = document.createElement('div');
    accordion.className = 'reqres-accordion';
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = `Show Raw Request/Response for ${title}`;
    toggleBtn.className = 'reqres-toggle-btn';
    const panel = document.createElement('div');
    panel.className = 'reqres-panel hidden';
    accordion.appendChild(toggleBtn);
    accordion.appendChild(panel);
    toggleBtn.onclick = () => {
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        toggleBtn.textContent = `Hide Raw Request/Response for ${title}`;
        panel.innerHTML = '';
        panel.innerHTML = `<pre class="json-viewer">${escapeHTML(typeof req === 'object' ? JSON.stringify(req, null, 2) : String(req))}

${escapeHTML(typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res))}</pre>`;
      } else {
        panel.classList.add('hidden');
        toggleBtn.textContent = `Show Raw Request/Response for ${title}`;
      }
    };
    return accordion;
  }

  // Create containers for each section
  const svcSection = document.createElement('div');
  const rtSection = document.createElement('div');
  const schSection = document.createElement('div');
  mainPanel.appendChild(svcSection);
  mainPanel.appendChild(rtSection);
  mainPanel.appendChild(schSection);

  // Render headers and loading for each section
  svcSection.innerHTML = '<h2>ServiceProviderConfig</h2><div class="section-loading">Loading ServiceProviderConfig...</div>';
  rtSection.innerHTML = '<h2>ResourceTypes</h2><div class="section-loading">Loading ResourceTypes...</div>';
  schSection.innerHTML = '<h2>Schemas</h2><div class="section-loading">Loading Schemas...</div>';

  // Fetch all three in parallel
  Promise.allSettled([
    (async () => {
      let svcReq = null, svcRes = null, svcBody = null;
      try {
        const url = withCorsProxy(client.endpoint, client.useProxy) + '/ServiceProviderConfig';
        svcReq = {
          method: 'GET',
          url,
          headers: client.headers
        };
        const res = await fetch(url, { headers: client.headers });
        const ct = res.headers.get('content-type') || '';
        svcBody = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
        svcRes = {
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          contentType: ct,
          body: svcBody
        };
        svcSection.innerHTML = '<h2>ServiceProviderConfig</h2>';
        if (typeof svcBody === 'object' && svcBody !== null) {
          renderSpecSummaryCard(svcSection, svcBody, 'ServiceProviderConfig');
        }
      } catch (e) {
        svcRes = { error: e.message };
        svcBody = svcRes;
        svcSection.innerHTML = '<h2>ServiceProviderConfig</h2>';
        renderSpecSummaryCard(svcSection, svcRes, 'ServiceProviderConfig');
      }
      // Full JSON viewer
      if (typeof svcBody === 'object' && svcBody !== null) {
        const jsonDiv = document.createElement('div');
        jsonDiv.className = 'json-container';
        window.renderJSON(jsonDiv, svcBody);
        svcSection.appendChild(jsonDiv);
      }
      svcSection.appendChild(createReqResAccordion('ServiceProviderConfig', svcReq, svcRes));
    })(),
    (async () => {
      let rtReq = null, rtRes = null, rtBody = null;
      try {
        const url = withCorsProxy(client.endpoint, client.useProxy) + '/ResourceTypes';
        rtReq = {
          method: 'GET',
          url,
          headers: client.headers
        };
        const res = await fetch(url, { headers: client.headers });
        const ct = res.headers.get('content-type') || '';
        rtBody = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
        rtRes = {
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          contentType: ct,
          body: rtBody
        };
        rtSection.innerHTML = '<h2>ResourceTypes</h2>';
        if (typeof rtBody === 'object' && rtBody !== null && Array.isArray(rtBody.Resources)) {
          renderSpecSummaryCard(rtSection, rtBody, 'ResourceTypes');
        }
      } catch (e) {
        rtRes = { error: e.message };
        rtBody = rtRes;
        rtSection.innerHTML = '<h2>ResourceTypes</h2>';
        renderSpecSummaryCard(rtSection, rtRes, 'ResourceTypes');
      }
      if (typeof rtBody === 'object' && rtBody !== null) {
        const jsonDiv = document.createElement('div');
        jsonDiv.className = 'json-container';
        window.renderJSON(jsonDiv, rtBody);
        rtSection.appendChild(jsonDiv);
      }
      rtSection.appendChild(createReqResAccordion('ResourceTypes', rtReq, rtRes));
    })(),
    (async () => {
      let schReq = null, schRes = null, schBody = null;
      try {
        const url = withCorsProxy(client.endpoint, client.useProxy) + '/Schemas';
        schReq = {
          method: 'GET',
          url,
          headers: client.headers
        };
        const res = await fetch(url, { headers: client.headers });
        const ct = res.headers.get('content-type') || '';
        schBody = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
        schRes = {
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          contentType: ct,
          body: schBody
        };
        schSection.innerHTML = '<h2>Schemas</h2>';
        if (typeof schBody === 'object' && schBody !== null && Array.isArray(schBody.Resources)) {
          renderSpecSummaryCard(schSection, schBody, 'Schemas');
        }
      } catch (e) {
        schRes = { error: e.message };
        schBody = schRes;
        schSection.innerHTML = '<h2>Schemas</h2>';
        renderSpecSummaryCard(schSection, schRes, 'Schemas');
      }
      if (typeof schBody === 'object' && schBody !== null) {
        const jsonDiv = document.createElement('div');
        jsonDiv.className = 'json-container';
        window.renderJSON(jsonDiv, schBody);
        schSection.appendChild(jsonDiv);
      }
      schSection.appendChild(createReqResAccordion('Schemas', schReq, schRes));
    })()
  ]);
}

// On initial load, fetch metadata then render
(async function initApp() {
  const client = new SCIMClient();
  await fetchScimMetadata(client);
  // After metadata is loaded, re-parse the section from the URL
  const section = getSectionFromQuery();
  currentSection = section;
  renderApp();
  
  // Add global event listener for navigation
  document.addEventListener('navigate', (event) => {
    const { section, action, id } = event.detail;
    currentSection = section;
    
    if (action === 'create') {
      renderCreateForm(section);
    } else if (action === 'edit' && id) {
      renderEditForm(section, id);
    } else if (action === 'view' && id) {
      renderDetailView(section, id);
    } else {
      renderApp();
    }
  });
})(); 

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
} 