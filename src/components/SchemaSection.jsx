import { useState, useEffect } from 'react';

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
                    <div className="json-viewer">
                      <h4>Schema Definition:</h4>
                      <pre>{formatJson(schema)}</pre>
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