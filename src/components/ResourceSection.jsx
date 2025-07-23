import { useState, useEffect } from 'react';
import Ajv from 'ajv';
import scimUserSchema from '../utils/scim-user-schema.json';

/**
 * Resource section component for displaying SCIM resources (Users, Groups)
 * @param {Object} props - Component props
 * @param {string} props.title - Section title
 * @param {string} props.resourceType - Resource type ('Users', 'Groups')
 * @param {Object} props.apiClient - API client instance
 * @param {Object} props.config - Configuration object
 */
const ResourceSection = ({ title, resourceType, apiClient, config }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [validationResults, setValidationResults] = useState([]);
  const [viewMode, setViewMode] = useState('raw'); // 'raw' or 'validated'
  const [rawErrorResponse, setRawErrorResponse] = useState(null);

  const ajv = new Ajv({ allErrors: true, verbose: true });
  const validateUser = ajv.compile(scimUserSchema);

  const fetchResources = async () => {
    if (!config?.endpoint) {
      setError('No endpoint configured');
      setRawErrorResponse(null);
      return;
    }

    setLoading(true);
    setError(null);
    setRawErrorResponse(null);
    setValidationResults([]);

    try {
      const response = await apiClient.getResources(resourceType);
      if (response.success && response.data?.Resources) {
        setResources(response.data.Resources);
        // Validate each resource
        const results = response.data.Resources.map((res, idx) => {
          const valid = validateUser(res);
          return { valid, errors: validateUser.errors, index: idx };
        });
        setValidationResults(results);
      } else if (response.success && Array.isArray(response.data)) {
        setResources(response.data);
        setValidationResults([]);
      } else {
        setResources([]);
        setValidationResults([]);
        if (!response.success) {
          setError(`Failed to fetch ${resourceType}: ${response.statusText || response.error}`);
          if (response.rawResponse) {
            setRawErrorResponse(response.rawResponse);
          }
        }
      }
    } catch (err) {
      setError(`Error fetching ${resourceType}: ${err.message}`);
      setResources([]);
      setValidationResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (config?.endpoint) {
      fetchResources();
    }
    // eslint-disable-next-line
  }, [config?.endpoint, resourceType]);

  const toggleExpanded = (id) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatJson = (data) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getResourceId = (resource) => {
    return resource.id || resource.userName || resource.displayName || 'unknown';
  };

  // Helper to highlight invalid fields (simple, not full AST walk)
  const highlightInvalid = (jsonStr, errors) => {
    if (!errors || errors.length === 0) return jsonStr;
    let highlighted = jsonStr;
    errors.forEach(err => {
      if (err && err.instancePath) {
        // Try to highlight the field name in the JSON string
        const path = err.instancePath.replace(/\//g, '.').replace(/^\./, '');
        if (path) {
          const regex = new RegExp(`("${path.split('.').pop()}"\s*:)`, 'g');
          highlighted = highlighted.replace(regex, '<span class="scim-error">$1</span>');
        }
      }
    });
    return highlighted;
  };

  return (
    <div className="resource-section" data-testid={`${resourceType.toLowerCase()}-section`}>
      <div className="section-header">
        <h2>{title}</h2>
        <div className="section-actions">
          <button 
            onClick={fetchResources} 
            disabled={loading}
            data-testid={`refresh-${resourceType.toLowerCase()}-button`}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'raw' ? 'validated' : 'raw')}
            style={{ marginLeft: '1em' }}
          >
            {viewMode === 'raw' ? 'Show Validated View' : 'Show Raw JSON'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
          {rawErrorResponse && (
            <details style={{ marginTop: '0.5em' }}>
              <summary>Show Raw Response</summary>
              <pre style={{ maxHeight: 300, overflow: 'auto', background: '#f8f8f8', border: '1px solid #ccc', padding: '0.5em' }}>{rawErrorResponse}</pre>
            </details>
          )}
        </div>
      )}

      {loading && (
        <div className="loading-message">
          Loading {resourceType}...
        </div>
      )}

      {!loading && resources.length === 0 && !error && (
        <div className="no-resources">
          No {resourceType} found
        </div>
      )}

      {!loading && resources.length > 0 && (
        <div className="resources-list">
          {resources.map((resource, index) => {
            const id = getResourceId(resource);
            const isExpanded = expandedItems.has(id);
            const validation = validationResults[index];
            return (
              <div key={id} className="resource-item" data-testid={`resource-item-${index}`}>
                <div className="resource-header">
                  <button
                    className="expand-button"
                    onClick={() => toggleExpanded(id)}
                    aria-expanded={isExpanded}
                    data-testid={`expand-${resourceType.toLowerCase()}-${index}`}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <span className="resource-title">
                    {resource.displayName || resource.userName || resource.id || `Resource ${index + 1}`}
                  </span>
                  <span className="resource-id">ID: {resource.id || 'N/A'}</span>
                  {validation && !validation.valid && (
                    <span className="scim-error-summary" title="SCIM validation error">⚠️</span>
                  )}
                </div>
                {isExpanded && (
                  <div className="resource-details" data-testid={`resource-details-${index}`}>
                    {viewMode === 'validated' && validation && !validation.valid && (
                      <div className="scim-validation-summary">
                        <strong>SCIM Validation Errors:</strong>
                        <ul>
                          {validation.errors && validation.errors.map((err, i) => (
                            <li key={i}>{err.instancePath || '/'}: {err.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="json-viewer">
                      <h4>Resource Data:</h4>
                      {viewMode === 'raw' ? (
                        <pre>{formatJson(resource)}</pre>
                      ) : (
                        <pre dangerouslySetInnerHTML={{ __html: highlightInvalid(formatJson(resource), validation && validation.errors) }} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        .scim-error { background: #ffeaea; color: #b30000; border-radius: 3px; padding: 0 2px; }
        .scim-error-summary { color: #b30000; margin-left: 0.5em; }
        .scim-validation-summary { background: #fff3cd; color: #856404; border-radius: 3px; padding: 0.5em; margin-bottom: 0.5em; }
      `}</style>
    </div>
  );
};

export default ResourceSection; 