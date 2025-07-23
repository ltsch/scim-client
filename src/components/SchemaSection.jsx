import { useState, useEffect } from 'react';
import ReactJson from 'react18-json-view';
import Ajv from 'ajv';
import scimSchemaSchema from '../utils/scim-schema-schema.json';

const ajv = new Ajv({ allErrors: true, verbose: true });
const validateSchema = ajv.compile(scimSchemaSchema);

const getFieldHighlight = (path, errors) => {
  if (!errors) return 'green';
  // If any error matches this path, highlight red or yellow
  for (const err of errors) {
    if (err.instancePath === path) {
      if (err.keyword === 'required') return 'red';
      return 'yellow';
    }
  }
  return 'green';
};

/**
 * Schema section component for displaying SCIM schema information
 * @param {Object} props - Component props
 * @param {Object} props.apiClient - API client instance
 * @param {Object} props.config - Configuration object
 */
const SchemaSection = ({ apiClient, config }) => {
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [viewMode, setViewMode] = useState('raw'); // 'raw' or 'validated'
  const [validationResults, setValidationResults] = useState([]);

  const fetchSchemas = async () => {
    if (!config?.endpoint) {
      setError('No endpoint configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getResources('Schemas');
      
      if (response.success && response.data?.Resources) {
        setSchemas(response.data.Resources);
      } else if (response.success && Array.isArray(response.data)) {
        setSchemas(response.data);
      } else {
        setSchemas([]);
        if (!response.success) {
          setError(`Failed to fetch Schemas: ${response.statusText || response.error}`);
        }
      }
    } catch (err) {
      setError(`Error fetching Schemas: ${err.message}`);
      setSchemas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (config?.endpoint) {
      fetchSchemas();
    }
  }, [config?.endpoint]);

  useEffect(() => {
    if (viewMode === 'validated' && schemas.length > 0) {
      const results = schemas.map(schema => {
        const valid = validateSchema(schema);
        return { valid, errors: validateSchema.errors ? [...validateSchema.errors] : [] };
      });
      setValidationResults(results);
    } else {
      setValidationResults([]);
    }
  }, [viewMode, schemas]);

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

  const getSchemaId = (schema) => {
    return schema.id || schema.name || 'unknown';
  };

  return (
    <div className="schema-section" data-testid="schema-section">
      <div className="section-header">
        <h2>SCIM Schemas</h2>
        <div className="section-actions">
          <button 
            onClick={fetchSchemas} 
            disabled={loading}
            data-testid="refresh-schemas-button"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            style={{ marginLeft: '1em' }}
            onClick={() => setViewMode(viewMode === 'raw' ? 'validated' : 'raw')}
            data-testid="toggle-schema-view"
          >
            {viewMode === 'raw' ? 'Show Validated View' : 'Show Raw JSON'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-message">
          Loading Schemas...
        </div>
      )}

      {!loading && schemas.length === 0 && !error && (
        <div className="no-schemas">
          No Schemas found
        </div>
      )}

      {!loading && schemas.length > 0 && (
        <div className="schemas-list">
          {schemas.map((schema, index) => {
            const id = getSchemaId(schema);
            const isExpanded = expandedItems.has(id);
            const validation = validationResults[index];
            return (
              <div key={id} className="schema-item" data-testid={`schema-item-${index}`}>
                <div className="schema-header">
                  <button
                    className="expand-button"
                    onClick={() => toggleExpanded(id)}
                    aria-expanded={isExpanded}
                    data-testid={`expand-schema-${index}`}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <span className="schema-title">
                    {schema.name || schema.id || `Schema ${index + 1}`}
                  </span>
                  <span className="schema-id">ID: {schema.id || 'N/A'}</span>
                </div>
                
                {isExpanded && (
                  <div className="schema-details" data-testid={`schema-details-${index}`}> 
                    {viewMode === 'validated' && validation && (
                      <div className="scim-validation-summary">
                        <strong>Validation: </strong>
                        {validation.valid ? (
                          <span style={{ color: 'green' }}>Compliant</span>
                        ) : (
                          <span style={{ color: 'red' }}>Non-compliant</span>
                        )}
                        {validation.errors && validation.errors.length > 0 && (
                          <ul style={{ marginTop: 8 }}>
                            {validation.errors.map((err, i) => (
                              <li key={i} style={{ color: err.keyword === 'required' ? 'red' : 'orange' }}>
                                {err.instancePath || '/'}: {err.message}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    <div className="json-viewer">
                      <h4>Schema Definition:</h4>
                      {viewMode === 'raw' ? (
                        <pre>{JSON.stringify(schema, null, 2)}</pre>
                      ) : (
                        <ReactJson
                          src={schema}
                          name={false}
                          enableClipboard={false}
                          displayDataTypes={false}
                          collapsed={2}
                          style={{ fontSize: 14 }}
                          theme={{
                            base00: '#fff',
                            base01: '#eee',
                            base02: '#ddd',
                            base03: '#444',
                            base04: '#444',
                            base05: '#444',
                            base06: '#444',
                            base07: '#444',
                            base08: '#f00', // red
                            base09: '#ff0', // yellow
                            base0A: '#ff0', // yellow
                            base0B: '#0f0', // green
                            base0C: '#0ff',
                            base0D: '#00f',
                            base0E: '#a0f',
                            base0F: '#f0f',
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SchemaSection; 