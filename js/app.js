// js/app.js - Refactored Main Application Entry Point

import { APP_CONFIG, UI_CONFIG } from './config.js';
import { 
  validateElement, 
  validateFunction,
  escapeHTML,
  createElement,
  addEventListener,
  clearElement,
  parseError,
  safeAsync,
  saveToStorage,
  loadFromStorage,
  debounce,
  fetchSchemaForResource,
  loadAllowedTargets,
  isHostAllowedByPatterns
} from './utils.js';
import { showError, showLoading, showSuccess, createRequestLogsViewer, renderJSON, createAccordion } from './ui-components.js';
import { SCIMClient } from './scim-client.js';
import { renderUserList } from './user-list.js';
import { renderGroupList } from './group-list.js';
import { renderRoleList } from './role-list.js';
import { renderUserEditForm } from './user-edit-form.js';
import { renderGroupEditForm } from './group-edit-form.js';
import { renderRoleEditForm } from './role-edit-form.js';
import { renderUserCreateModal } from './user-create-modal.js';
import { renderGroupCreateModal } from './group-create-modal.js';
import { renderRoleCreateModal } from './role-create-modal.js';
import { renderEntitlementList } from './entitlement-list.js';
import { renderEntitlementEditForm } from './entitlement-edit-form.js';
import { renderEntitlementCreateModal } from './entitlement-create-modal.js';

// ============================================================================
// APPLICATION STATE MANAGEMENT
// ============================================================================

/**
 * Application state manager
 */
class AppState {
  constructor() {
    this.scimClient = null;
    this.currentSection = APP_CONFIG.DEFAULT_SECTION;
    this.isInitialized = false;
    this.cache = new Map();
  }

  /**
   * Initialize application state
   * @returns {boolean} True if initialization successful
   */
  initialize() {
    return safeAsync(async () => {
      this.scimClient = new SCIMClient();
      this.isInitialized = true;
      return true;
    }, (error) => {
      this.handleError('Failed to initialize SCIM client', error);
      return false;
    });
  }

  /**
   * Handle application errors
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  async handleError(message, error) {
    const parsedError = parseError(error);
    await showError(document.getElementById('main-panel'), {
      message: message,
      details: parsedError.message,
      type: 'INITIALIZATION_ERROR'
    });
  }

  /**
   * Get SCIM client instance
   * @returns {SCIMClient} SCIM client
   * @throws {Error} If client not initialized
   */
  getClient() {
    if (!this.isInitialized || !this.scimClient) {
      throw new Error('SCIM client not initialized');
    }
    return this.scimClient;
  }

  /**
   * Set current section
   * @param {string} section - Section name
   */
  setCurrentSection(section) {
    this.currentSection = section;
    saveToStorage(APP_CONFIG.STORAGE_KEYS.LAST_SECTION, section);
  }

  /**
   * Get current section
   * @returns {string} Current section
   */
  getCurrentSection() {
    return this.currentSection;
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {*} Cached data
   */
  getCachedData(key) {
    return this.cache.get(key);
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  setCachedData(key, data) {
    this.cache.set(key, data);
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
  }
}

// ============================================================================
// SECTION RENDERER
// ============================================================================

/**
 * Section renderer for different application sections
 */
class SectionRenderer {
  constructor(appState) {
    this.appState = appState;
  }

  /**
   * Render a specific section
   * @param {string} section - Section to render
   */
  async renderSection(section) {
    return await safeAsync(async () => {
      const mainPanel = document.getElementById('main-panel');
      validateElement(mainPanel, 'main panel');
      
      this.appState.setCurrentSection(section);
      
      switch (section) {
        case APP_CONFIG.SECTIONS.USER:
          await this.renderUsersSection(mainPanel);
          break;
        case APP_CONFIG.SECTIONS.GROUP:
          await this.renderGroupsSection(mainPanel);
          break;
        case APP_CONFIG.SECTIONS.ROLE:
          await this.renderRolesSection(mainPanel);
          break;
        case APP_CONFIG.SECTIONS.ENTITLEMENT:
          await this.renderEntitlementsSection(mainPanel);
          break;
        case APP_CONFIG.SECTIONS.CONFIG:
          await this.renderConfigSection(mainPanel);
          break;
        case APP_CONFIG.SECTIONS.SETTINGS:
          this.renderSettingsSection(mainPanel);
          break;
        case APP_CONFIG.SECTIONS.LOGS:
          await this.renderLogsSection(mainPanel);
          break;
        default:
          throw new Error(`Unknown section: ${section}`);
      }
    }, async (error) => {
      await this.handleSectionError(section, error);
    });
  }

  /**
   * Handle section rendering errors
   * @param {string} section - Section name
   * @param {Error} error - Error object
   */
  async handleSectionError(section, error) {
    const parsedError = parseError(error);
    await showError(document.getElementById('main-panel'), {
      message: `Failed to load ${section} section`,
      details: parsedError.message,
      type: 'SECTION_ERROR'
    });
  }

  /**
   * Render users section
   * @param {HTMLElement} container - Container element
   */
  async renderUsersSection(container) {
    return await safeAsync(async () => {
      this.renderSectionHeader(container, 'Users', 'Manage SCIM users');
      await renderUserList(container, this.appState.getClient(), {
        onEdit: async (user) => {
          const { renderUserEditForm } = await import('./user-edit-form.js');
          const client = this.appState.getClient();
          
          // Fetch User schema from server
          const userSchema = await fetchSchemaForResource(client, 'User');
          
          await renderUserEditForm(container, user, async (formData) => {
            return await client.updateUser(formData);
          }, { schema: userSchema });
        }
      });
    });
  }

  /**
   * Render groups section
   * @param {HTMLElement} container - Container element
   */
  async renderGroupsSection(container) {
    return await safeAsync(async () => {
      this.renderSectionHeader(container, 'Groups', 'Manage SCIM groups');
      await renderGroupList(container, this.appState.getClient(), {
        onEdit: async (group) => {
          const { renderGroupEditForm } = await import('./group-edit-form.js');
          const client = this.appState.getClient();
          
          // Fetch Group schema from server
          const groupSchema = await fetchSchemaForResource(client, 'Group');
          
          await renderGroupEditForm(container, group, async (formData) => {
            return await client.updateGroup(formData);
          }, { schema: groupSchema });
        }
      });
    });
  }

  /**
   * Render roles section
   * @param {HTMLElement} container - Container element
   */
  async renderRolesSection(container) {
    return await safeAsync(async () => {
      this.renderSectionHeader(container, 'Roles', 'Manage SCIM roles');
      await renderRoleList(container, this.appState.getClient());
    });
  }

  /**
   * Render entitlements section
   * @param {HTMLElement} container - Container element
   */
  async renderEntitlementsSection(container) {
    return await safeAsync(async () => {
      this.renderSectionHeader(container, 'Entitlements', 'Manage SCIM entitlements');
      await renderEntitlementList(container, this.appState.getClient());
    });
  }

  /**
   * Render logs section
   * @param {HTMLElement} container - Container element
   */
  async renderLogsSection(container) {
    return await safeAsync(async () => {
      this.renderSectionHeader(container, 'Logs', 'View SCIM request logs');
      await createRequestLogsViewer(container);
    });
  }

  /**
   * Render section header
   * @param {HTMLElement} container - Container element
   * @param {string} title - Section title
   * @param {string} description - Section description
   */
  renderSectionHeader(container, title, description) {
    clearElement(container);
    
    const header = createElement('div', {
      className: 'section-header'
    });
    
    const titleElement = createElement('h1', {
      textContent: title
    });
    
    const descriptionElement = createElement('p', {
      className: 'section-description',
      textContent: description
    });
    
    header.appendChild(titleElement);
    header.appendChild(descriptionElement);
    container.appendChild(header);
  }

  /**
   * Setup search functionality
   * @param {HTMLElement} container - Container element
   * @param {string} resourceType - Resource type
   * @param {Function} searchFunction - Search function
   */
  setupSearch(container, resourceType, searchFunction) {
    const searchInput = container.querySelector('.search-input');
    if (!searchInput) return;
    
    const debouncedSearch = debounce(async (query) => {
      if (query.length < APP_CONFIG.SEARCH_MIN_LENGTH) {
        return;
      }
      
      try {
        await searchFunction(query);
      } catch (error) {
        await this.handleSectionError(resourceType, error);
      }
    }, 300);
    
    addEventListener(searchInput, 'input', (event) => {
      debouncedSearch(event.target.value);
    });
  }

  /**
   * Load users with optional filter
   * @param {string} filter - Optional filter
   * @returns {Promise<Array>} Users array
   */
  async loadUsers(filter = null) {
    return await safeAsync(async () => {
      const client = this.appState.getClient();
      
      if (filter) {
        return await client.getUsers({ filter });
      } else {
        return await client.getUsers();
      }
    }, async (error) => {
      await this.handleLoadError('Users', error);
      return [];
    });
  }

  /**
   * Load groups with optional filter
   * @param {string} filter - Optional filter
   * @returns {Promise<Array>} Groups array
   */
  async loadGroups(filter = null) {
    return await safeAsync(async () => {
      const client = this.appState.getClient();
      
      if (filter) {
        return await client.getGroups({ filter });
      } else {
        return await client.getGroups();
      }
    }, async (error) => {
      await this.handleLoadError('Groups', error);
      return [];
    });
  }

  /**
   * Load roles with optional filter
   * @param {string} filter - Optional filter
   * @returns {Promise<Array>} Roles array
   */
  async loadRoles(filter = null) {
    return await safeAsync(async () => {
      const client = this.appState.getClient();
      
      if (filter) {
        return await client.getRoles({ filter });
      } else {
        return await client.getRoles();
      }
    }, async (error) => {
      await this.handleLoadError('Roles', error);
      return [];
    });
  }

  /**
   * Load entitlements with optional filter
   * @param {string} filter - Optional filter
   * @returns {Promise<Array>} Entitlements array
   */
  async loadEntitlements(filter = null) {
    return await safeAsync(async () => {
      const client = this.appState.getClient();
      
      if (filter) {
        return await client.getEntitlements({ filter });
      } else {
        return await client.getEntitlements();
      }
    }, async (error) => {
      await this.handleLoadError('Entitlements', error);
      return [];
    });
  }

  /**
   * Handle load errors
   * @param {string} resourceType - Resource type
   * @param {Error} error - Error object
   */
  async handleLoadError(resourceType, error) {
    const parsedError = parseError(error);
    await showError(document.getElementById('main-panel'), {
      message: `Failed to load ${resourceType}`,
      details: parsedError.message,
      type: 'LOAD_ERROR'
    });
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   */
  async searchUsers(query) {
    const filter = `userName co "${query}" or displayName co "${query}"`;
    return await this.loadUsers(filter);
  }

  /**
   * Search groups
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   */
  async searchGroups(query) {
    const filter = `displayName co "${query}"`;
    return await this.loadGroups(filter);
  }

  /**
   * Search roles
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   */
  async searchRoles(query) {
    const filter = `displayName co "${query}"`;
    return await this.loadRoles(filter);
  }

  /**
   * Search entitlements
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   */
  async searchEntitlements(query) {
    const filter = `displayName co "${query}"`;
    return await this.loadEntitlements(filter);
  }

  /**
   * Render configuration section
   * @param {HTMLElement} container - Container element
   */
  async renderConfigSection(container) {
    return await safeAsync(async () => {
      showLoading(container, 'Loading server configuration...', 'Discovering available endpoints and schemas');
      
      const client = this.appState.getClient();
      const config = await client.getServerConfig();
      
      this.renderConfigContent(container, config);
    });
  }

  /**
   * Render configuration content
   * @param {HTMLElement} container - Container element
   * @param {Object} config - Server configuration
   */
  renderConfigContent(container, config) {
    clearElement(container);
    
    const configContainer = createElement('div', {
      className: 'config-container'
    });
    
    // Create high-level overview section
    const overviewSection = createElement('div', {
      className: 'config-overview-section'
    });
    
    const overviewTitle = createElement('h1', {
      textContent: 'Server Configuration Overview',
      className: 'config-main-title'
    });
    
    const overviewDescription = createElement('p', {
      textContent: 'High-level server capabilities and available resources for developers.',
      className: 'config-main-description'
    });
    
    overviewSection.appendChild(overviewTitle);
    overviewSection.appendChild(overviewDescription);
    configContainer.appendChild(overviewSection);
    
    // ========================================
    // HIGH-LEVEL DEFINITIONS SECTION
    // ========================================
    
    // Service Provider Config Summary
    if (config.serviceProviderConfig) {
      const spConfig = createElement('div', {
        className: 'config-section'
      });
      
      // Parse the actual SCIM server response structure
      const sp = config.serviceProviderConfig;
      const supportedFeatures = [];
      
      if (sp.patch?.supported) supportedFeatures.push('PATCH');
      if (sp.bulk?.supported) supportedFeatures.push('BULK');
      if (sp.filter?.supported) supportedFeatures.push('FILTER');
      if (sp.sort?.supported) supportedFeatures.push('SORT');
      if (sp.changePassword?.supported) supportedFeatures.push('CHANGE_PASSWORD');
      if (sp.etag?.supported) supportedFeatures.push('ETAG');
      
      const maxResults = sp.filter?.maxResults || 'Unlimited';
      const maxOperations = sp.bulk?.maxOperations || 'Unlimited';
      const maxPayloadSize = sp.bulk?.maxPayloadSize || 'Unlimited';
      
      spConfig.innerHTML = `
        <h2>Service Provider Configuration</h2>
        <div class="config-item">
          <strong>Supported Operations:</strong> ${supportedFeatures.length > 0 ? supportedFeatures.join(', ') : 'None'}
        </div>
        <div class="config-item">
          <strong>Filter Support:</strong> ${sp.filter?.supported ? 'Yes' : 'No'}
        </div>
        <div class="config-item">
          <strong>Max Results:</strong> ${maxResults}
        </div>
        <div class="config-item">
          <strong>Max Operations:</strong> ${maxOperations}
        </div>
        <div class="config-item">
          <strong>Authentication Schemes:</strong> ${sp.authenticationSchemes?.length || 0} configured
        </div>
      `;
      
      configContainer.appendChild(spConfig);
    }
    
    // Resource Types Summary
    if (config.resourceTypes && config.resourceTypes.length > 0) {
      const resourceTypes = createElement('div', {
        className: 'config-section'
      });
      
      resourceTypes.innerHTML = `
        <h2>Resource Types (${config.resourceTypes.length})</h2>
        <div class="resource-types">
          ${config.resourceTypes.map(rt => `
            <div class="resource-type">
              <strong>${escapeHTML(rt.name)}</strong>
              <div class="resource-endpoint">${escapeHTML(rt.endpoint)}</div>
              <div class="resource-description">${escapeHTML(rt.description || 'No description')}</div>
            </div>
          `).join('')}
        </div>
      `;
      
      configContainer.appendChild(resourceTypes);
    }
    
    // All Schemas Summary
    if (config.schemas && config.schemas.length > 0) {
      const schemas = createElement('div', {
        className: 'config-section'
      });
      
      schemas.innerHTML = `
        <h2>All Schemas (${config.schemas.length})</h2>
        <div class="schemas">
          ${config.schemas.map(schema => `
            <div class="schema">
              <strong>${escapeHTML(schema.name)}</strong>
              <div class="schema-id">${escapeHTML(schema.id)}</div>
              <div class="schema-description">${escapeHTML(schema.description || 'No description')}</div>
            </div>
          `).join('')}
        </div>
      `;
      
      configContainer.appendChild(schemas);
    } else {
      // Show message when schemas are not available
      const noSchemasContainer = createElement('div', {
        className: 'config-section'
      });
      
      noSchemasContainer.innerHTML = `
        <h2>Schemas</h2>
        <div class="config-item">
          <strong>Status:</strong> <span style="color: orange;">Not Available</span>
        </div>
        <div class="config-item">
          <strong>Reason:</strong> Server does not provide schema information via /Schemas endpoint
        </div>
        <div class="config-item">
          <strong>Impact:</strong> User and Group edit forms will use fallback schemas
        </div>
      `;
      
      configContainer.appendChild(noSchemasContainer);
    }
    
    // ========================================
    // RAW SCHEMA DATA SECTION
    // ========================================
    
    // Create raw data section header
    const rawDataSection = createElement('div', {
      className: 'config-raw-section'
    });
    
    const rawDataTitle = createElement('h1', {
      textContent: 'Raw Schema Data',
      className: 'config-main-title'
    });
    
    const rawDataDescription = createElement('p', {
      textContent: 'Detailed JSON schema data for developers who need to examine the raw server responses.',
      className: 'config-main-description'
    });
    
    rawDataSection.appendChild(rawDataTitle);
    rawDataSection.appendChild(rawDataDescription);
    configContainer.appendChild(rawDataSection);
    
    // Raw Service Provider Config Data
    if (config.serviceProviderConfig) {
      const rawSpConfigContainer = createElement('div', {
        className: 'config-section'
      });
      
      const title = createElement('h2', {
        textContent: 'Service Provider Configuration Data'
      });
      
      const rawSpConfigContent = createElement('div');
      renderJSON(rawSpConfigContent, config.serviceProviderConfig);
      
      rawSpConfigContainer.appendChild(title);
      rawSpConfigContainer.appendChild(rawSpConfigContent);
      configContainer.appendChild(rawSpConfigContainer);
    }
    
    // Raw Resource Types Data
    if (config.resourceTypes && config.resourceTypes.length > 0) {
      const rawResourceTypesContainer = createElement('div', {
        className: 'config-section'
      });
      
      const title = createElement('h2', {
        textContent: 'Resource Types Data'
      });
      
      const rawResourceTypesContent = createElement('div');
      renderJSON(rawResourceTypesContent, config.resourceTypes);
      
      rawResourceTypesContainer.appendChild(title);
      rawResourceTypesContainer.appendChild(rawResourceTypesContent);
      configContainer.appendChild(rawResourceTypesContainer);
    }
    
    // Raw Schemas Data
    if (config.schemas && config.schemas.length > 0) {
      const rawSchemasContainer = createElement('div', {
        className: 'config-section'
      });
      
      const title = createElement('h2', {
        textContent: 'All Schemas Data'
      });
      
      const rawSchemasContent = createElement('div');
      renderJSON(rawSchemasContent, config.schemas);
      
      rawSchemasContainer.appendChild(title);
      rawSchemasContainer.appendChild(rawSchemasContent);
      configContainer.appendChild(rawSchemasContainer);
    }
    
    // Individual Schema Data (directly displayed)
    if (config.schemas) {
      // User Schema
      const userSchema = config.schemas.find(schema => 
        schema.id && schema.id.includes('User') || 
        schema.name && schema.name.toLowerCase().includes('user')
      );
      
      if (userSchema) {
        const userSchemaContainer = createElement('div', {
          className: 'config-section'
        });
        
        const title = createElement('h2', {
          textContent: 'User Schema Data'
        });
        
        const userSchemaContent = createElement('div');
        renderJSON(userSchemaContent, userSchema);
        
        userSchemaContainer.appendChild(title);
        userSchemaContainer.appendChild(userSchemaContent);
        configContainer.appendChild(userSchemaContainer);
      }
      
      // Group Schema
      const groupSchema = config.schemas.find(schema => 
        schema.id && schema.id.includes('Group') || 
        schema.name && schema.name.toLowerCase().includes('group')
      );
      
      if (groupSchema) {
        const groupSchemaContainer = createElement('div', {
          className: 'config-section'
        });
        
        const title = createElement('h2', {
          textContent: 'Group Schema Data'
        });
        
        const groupSchemaContent = createElement('div');
        renderJSON(groupSchemaContent, groupSchema);
        
        groupSchemaContainer.appendChild(title);
        groupSchemaContainer.appendChild(groupSchemaContent);
        configContainer.appendChild(groupSchemaContainer);
      }
      
      // Entitlement Schema
      const entitlementSchema = config.schemas.find(schema => 
        schema.id && schema.id.includes('Entitlement') || 
        schema.name && schema.name.toLowerCase().includes('entitlement')
      );
      
      if (entitlementSchema) {
        const entitlementSchemaContainer = createElement('div', {
          className: 'config-section'
        });
        
        const title = createElement('h2', {
          textContent: 'Entitlement Schema Data'
        });
        
        const entitlementSchemaContent = createElement('div');
        renderJSON(entitlementSchemaContent, entitlementSchema);
        
        entitlementSchemaContainer.appendChild(title);
        entitlementSchemaContainer.appendChild(entitlementSchemaContent);
        configContainer.appendChild(entitlementSchemaContainer);
      }
      
      // Role Schema
      const roleSchema = config.schemas.find(schema => 
        schema.id && schema.id.includes('Role') || 
        schema.name && schema.name.toLowerCase().includes('role')
      );
      
      if (roleSchema) {
        const roleSchemaContainer = createElement('div', {
          className: 'config-section'
        });
        
        const title = createElement('h2', {
          textContent: 'Role Schema Data'
        });
        
        const roleSchemaContent = createElement('div');
        renderJSON(roleSchemaContent, roleSchema);
        
        roleSchemaContainer.appendChild(title);
        roleSchemaContainer.appendChild(roleSchemaContent);
        configContainer.appendChild(roleSchemaContainer);
      }
      
      // EnterpriseUser Schema
      const enterpriseUserSchema = config.schemas.find(schema => 
        schema.id && schema.id.includes('enterprise:2.0:User') || 
        schema.name && schema.name.toLowerCase().includes('enterpriseuser')
      );
      
      if (enterpriseUserSchema) {
        const enterpriseUserSchemaContainer = createElement('div', {
          className: 'config-section'
        });
        
        const title = createElement('h2', {
          textContent: 'EnterpriseUser Schema Data'
        });
        
        const enterpriseUserSchemaContent = createElement('div');
        renderJSON(enterpriseUserSchemaContent, enterpriseUserSchema);
        
        enterpriseUserSchemaContainer.appendChild(title);
        enterpriseUserSchemaContainer.appendChild(enterpriseUserSchemaContent);
        configContainer.appendChild(enterpriseUserSchemaContainer);
      }
      
      // CerbyUser Schema
      const cerbyUserSchema = config.schemas.find(schema => 
        schema.id && schema.id.includes('cerby:2.0:User') || 
        schema.name && schema.name.toLowerCase().includes('cerbyuser')
      );
      
      if (cerbyUserSchema) {
        const cerbyUserSchemaContainer = createElement('div', {
          className: 'config-section'
        });
        
        const title = createElement('h2', {
          textContent: 'CerbyUser Schema Data'
        });
        
        const cerbyUserSchemaContent = createElement('div');
        renderJSON(cerbyUserSchemaContent, cerbyUserSchema);
        
        cerbyUserSchemaContainer.appendChild(title);
        cerbyUserSchemaContainer.appendChild(cerbyUserSchemaContent);
        configContainer.appendChild(cerbyUserSchemaContainer);
      }
    }
    
    container.appendChild(configContainer);
  }

  /**
   * Render settings section
   * @param {HTMLElement} container - Container element
   */
  renderSettingsSection(container) {
    clearElement(container);
    
    const settingsContainer = createElement('div', {
      className: 'settings-container'
    });
    
    settingsContainer.innerHTML = `
      <h1>Settings</h1>
      <form id="settings-form" class="${UI_CONFIG.CLASSES.FORM}">
        <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
          <label for="endpoint" class="${UI_CONFIG.CLASSES.FORM_LABEL}">SCIM Endpoint *</label>
          <input type="url" id="endpoint" name="endpoint" class="${UI_CONFIG.CLASSES.FORM_CONTROL}" required>
        </div>
        
        <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
          <label for="api-key" class="${UI_CONFIG.CLASSES.FORM_LABEL}">API Key</label>
          <input type="password" id="api-key" name="apiKey" class="${UI_CONFIG.CLASSES.FORM_CONTROL}">
        </div>
        
        <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
          <div class="${UI_CONFIG.CLASSES.FORM_CHECKBOX_LABEL}">
            <input type="checkbox" id="use-proxy" name="useProxy" class="${UI_CONFIG.CLASSES.FORM_CHECKBOX}">
            <span class="${UI_CONFIG.CLASSES.FORM_CHECKBOX_TEXT}">Use CORS Proxy</span>
          </div>
        </div>
        
        <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
          <label for="proxy-url" class="${UI_CONFIG.CLASSES.FORM_LABEL}">CORS Proxy URL</label>
          <input type="text" id="proxy-url" name="proxyUrl" class="${UI_CONFIG.CLASSES.FORM_CONTROL}" placeholder="/proxy">
          <small>Default: /proxy (local proxy) or specify external proxy URL</small>
        </div>
        
        <div class="${UI_CONFIG.CLASSES.FORM_GROUP}">
          <label for="custom-headers" class="${UI_CONFIG.CLASSES.FORM_LABEL}">Custom Headers (JSON)</label>
          <textarea id="custom-headers" name="customHeaders" class="${UI_CONFIG.CLASSES.FORM_CONTROL}" rows="4" placeholder='{"X-Custom-Header": "value", "X-Another-Header": "another-value"}'></textarea>
          <small>Optional: Add custom headers as JSON object. Example: {"X-Cerby-Base-Url": "http://localhost:8000/api/v1"}</small>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_PRIMARY}">Save Settings</button>
          <button type="button" id="clear-cache" class="${UI_CONFIG.CLASSES.BTN} ${UI_CONFIG.CLASSES.BTN_SECONDARY}">Clear Cache</button>
        </div>
      </form>
    `;
    
    container.appendChild(settingsContainer);
    
    this.loadSettings();
    this.bindSettingsEvents();
  }

  /**
   * Load settings from storage
   */
  loadSettings() {
    const endpoint = loadFromStorage(APP_CONFIG.STORAGE_KEYS.ENDPOINT, '');
    const apiKey = loadFromStorage(APP_CONFIG.STORAGE_KEYS.API_KEY, '');
    const useProxy = loadFromStorage(APP_CONFIG.STORAGE_KEYS.USE_PROXY, 'false') === 'true';
    const proxyUrl = loadFromStorage(APP_CONFIG.STORAGE_KEYS.PROXY_URL, '/proxy');
    const customHeaders = loadFromStorage(APP_CONFIG.STORAGE_KEYS.CUSTOM_HEADERS, '');
    
    const endpointInput = document.getElementById('endpoint');
    const apiKeyInput = document.getElementById('api-key');
    const useProxyInput = document.getElementById('use-proxy');
    const proxyUrlInput = document.getElementById('proxy-url');
    const customHeadersInput = document.getElementById('custom-headers');
    
    if (endpointInput) endpointInput.value = endpoint;
    if (apiKeyInput) apiKeyInput.value = apiKey;
    if (useProxyInput) useProxyInput.checked = useProxy;
    if (proxyUrlInput) proxyUrlInput.value = proxyUrl;
    if (customHeadersInput) customHeadersInput.value = customHeaders;
  }

  /**
   * Bind settings form events
   */
  bindSettingsEvents() {
    const form = document.getElementById('settings-form');
    const clearCacheBtn = document.getElementById('clear-cache');
    
    if (form) {
      addEventListener(form, 'submit', (event) => {
        event.preventDefault();
        this.saveSettings();
      });
    }
    
    if (clearCacheBtn) {
      addEventListener(clearCacheBtn, 'click', () => {
        this.clearCache();
      });
    }
  }

  /**
   * Save settings to storage
   */
  saveSettings() {
    const form = document.getElementById('settings-form');
    if (!form) return;
    
    const formData = new FormData(form);
    const endpoint = formData.get('endpoint');
    const apiKey = formData.get('apiKey');
    const useProxy = formData.get('useProxy') === 'on';
    const proxyUrl = formData.get('proxyUrl') || '/proxy'; // Get proxy URL, default to /proxy
    const customHeaders = formData.get('customHeaders') || '';
    
    // Enforce allowlist on endpoint host before saving
    try {
      const u = new URL(endpoint);
      // load and check synchronously via async IIFE
      (async () => {
        const allowed = await loadAllowedTargets();
        if (!isHostAllowedByPatterns(u.hostname, allowed)) {
          throw new Error('SCIM endpoint host is not allowed by policy');
        }
      })().catch(err => { throw err; });
    } catch (err) {
      showError(document.getElementById('main-panel'), {
        message: 'Endpoint not allowed',
        details: (err && err.message) || 'Host not in allowlist'
      });
      return;
    }

    saveToStorage(APP_CONFIG.STORAGE_KEYS.ENDPOINT, endpoint);
    saveToStorage(APP_CONFIG.STORAGE_KEYS.API_KEY, apiKey);
    saveToStorage(APP_CONFIG.STORAGE_KEYS.USE_PROXY, useProxy.toString());
    saveToStorage(APP_CONFIG.STORAGE_KEYS.PROXY_URL, proxyUrl); // Save proxy URL
    saveToStorage(APP_CONFIG.STORAGE_KEYS.CUSTOM_HEADERS, customHeaders);
    
    // Update SCIM client configuration
    if (this.appState.scimClient) {
      this.appState.scimClient.config.updateEndpoint(endpoint);
      this.appState.scimClient.config.updateApiKey(apiKey);
      this.appState.scimClient.config.updateUseProxy(useProxy);
      this.appState.scimClient.config.updateProxyUrl(proxyUrl); // Update proxy URL
      this.appState.scimClient.config.updateCustomHeaders(this._parseCustomHeaders(customHeaders));
    }
    
    showSuccess(document.getElementById('main-panel'), 'Settings saved successfully');
  }

  /**
   * Parse custom headers from JSON string
   * @param {string} headersJson - JSON string of custom headers
   * @returns {Object} Parsed headers object
   */
  _parseCustomHeaders(headersJson) {
    if (!headersJson || !headersJson.trim()) return {};
    try {
      return JSON.parse(headersJson);
    } catch (error) {
      console.warn('Failed to parse custom headers:', error);
      return {};
    }
  }

  /**
   * Clear application cache
   */
  clearCache() {
    // Clear all storage except endpoint, API key, and proxy setting
    Object.keys(localStorage).forEach(key => {
      if (!key.includes('endpoint') && !key.includes('api_key') && !key.includes('proxy') && !key.includes('custom_headers')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear in-memory cache
    this.appState.clearCache();
    
    showSuccess(document.getElementById('main-panel'), 'Cache cleared successfully');
  }
}

// ============================================================================
// NAVIGATION MANAGER
// ============================================================================

/**
 * Navigation manager for section switching
 */
class NavigationManager {
  constructor(appState, sectionRenderer) {
    this.appState = appState;
    this.sectionRenderer = sectionRenderer;
  }

  /**
   * Setup navigation event listeners
   */
  setupNavigation() {
    const navButtons = document.querySelectorAll('.sidebar-btn');
    navButtons.forEach(btn => {
      addEventListener(btn, 'click', () => {
        const section = btn.getAttribute('data-section');
        this.navigateToSection(section);
      });
    });
  }

  /**
   * Navigate to a specific section
   * @param {string} section - Section to navigate to
   */
  async navigateToSection(section) {
    return await safeAsync(async () => {
      // Update URL and active button first, even if rendering fails
      this.updateURL(section);
      this.updateActiveButton(section);
      
      // Then try to render the section
      await this.sectionRenderer.renderSection(section);
    }, (error) => {
      // Even if rendering fails, we've already updated the URL and button
      this.appState.handleError(`Failed to navigate to ${section} section`, error);
    });
  }

  /**
   * Update URL with current section
   * @param {string} section - Current section
   */
  updateURL(section) {
    const url = new URL(window.location);
    url.searchParams.set('section', section);
    window.history.pushState({}, '', url);
  }

  /**
   * Update active navigation button
   * @param {string} section - Active section
   */
  updateActiveButton(section) {
    const navButtons = document.querySelectorAll('.sidebar-btn');
    navButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-section') === section) {
        btn.classList.add('active');
      }
    });
  }
}

// ============================================================================
// MAIN APPLICATION CLASS
// ============================================================================

/**
 * Main SCIM application class
 */
class SCIMApplication {
  constructor() {
    this.appState = new AppState();
    this.sectionRenderer = new SectionRenderer(this.appState);
    this.navigationManager = new NavigationManager(this.appState, this.sectionRenderer);
  }

  /**
   * Initialize the application
   */
  async initialize() {
    return await safeAsync(async () => {
      if (!this.appState.initialize()) {
        return;
      }
      
      this.navigationManager.setupNavigation();
      
      const urlParams = new URLSearchParams(window.location.search);
      const section = urlParams.get('section') || APP_CONFIG.DEFAULT_SECTION;
      
      await this.sectionRenderer.renderSection(section);
      this.navigationManager.updateActiveButton(section);
    }, (error) => {
      this.appState.handleError('Failed to initialize application', error);
    });
  }
}

// ============================================================================
// GLOBAL APPLICATION INSTANCE
// ============================================================================

let app = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  app = new SCIMApplication();
  await app.initialize();
}); 