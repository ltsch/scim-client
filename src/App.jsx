import { useState } from 'react';
import { useConfig } from './hooks/useConfig';
import { useApiClient } from './hooks/useApiClient';
import ConfigForm from './components/ConfigForm';
import ResourceSection from './components/ResourceSection';
import SchemaSection from './components/SchemaSection';
import './App.css';

function App() {
  const {
    config,
    isLoading: configLoading,
    error: configError,
    updateConfig,
    saveConfiguration,
    clearConfiguration,
    hasValidConfig
  } = useConfig();

  const apiClient = useApiClient(config);
  const [activeSection, setActiveSection] = useState('users');

  const handleConfigSave = async () => {
    const success = saveConfiguration();
    if (success) {
      // Configuration saved successfully
      console.log('Configuration saved');
    }
  };

  const handleConfigUpdate = (newConfig) => {
    updateConfig(newConfig);
  };

  const handleClearCache = async () => {
    const success = clearConfiguration();
    if (success) {
      // Add a small delay to make the loading state visible
      await new Promise(resolve => setTimeout(resolve, 500));
      // Cache cleared successfully
      console.log('Cache cleared');
    }
  };

  if (configLoading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  // Show configuration form if no valid config exists
  if (!hasValidConfig) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>SCIM API Client</h1>
        </header>
        <main className="app-main">
          <ConfigForm
            config={config}
            onConfigUpdate={handleConfigUpdate}
            onSave={handleConfigSave}
            error={configError}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>SCIM API Client</h1>
        <nav className="app-nav">
          <button
            className={activeSection === 'users' ? 'active' : ''}
            onClick={() => setActiveSection('users')}
            data-testid="nav-users"
          >
            Users
          </button>
          <button
            className={activeSection === 'groups' ? 'active' : ''}
            onClick={() => setActiveSection('groups')}
            data-testid="nav-groups"
          >
            Groups
          </button>
          <button
            className={activeSection === 'schemas' ? 'active' : ''}
            onClick={() => setActiveSection('schemas')}
            data-testid="nav-schemas"
          >
            Schemas
          </button>
          <button
            className={activeSection === 'settings' ? 'active' : ''}
            onClick={() => setActiveSection('settings')}
            data-testid="nav-settings"
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeSection === 'users' && (
          <ResourceSection
            title="SCIM Users"
            resourceType="Users"
            apiClient={apiClient}
            config={config}
          />
        )}

        {activeSection === 'groups' && (
          <ResourceSection
            title="SCIM Groups"
            resourceType="Groups"
            apiClient={apiClient}
            config={config}
          />
        )}

        {activeSection === 'schemas' && (
          <SchemaSection
            apiClient={apiClient}
            config={config}
          />
        )}

        {activeSection === 'settings' && (
          <div className="settings-section">
            <ConfigForm
              config={config}
              onConfigUpdate={handleConfigUpdate}
              onSave={handleConfigSave}
              onClearCache={handleClearCache}
              error={configError}
            />
          </div>
        )}
      </main>

      {apiClient.error && (
        <div className="global-error" role="alert">
          {apiClient.error}
        </div>
      )}
    </div>
  );
}

export default App;
