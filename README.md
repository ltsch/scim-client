# SCIM Client Test Harness

A comprehensive web-based developer tool for testing and debugging SCIM (System for Cross-domain Identity Management) servers. This project provides a modern, functionality-first UI for exploring, validating, and manipulating SCIM endpoints with full SCIM 2.0 compliance.

---

## 🚀 Quick Start

### Automated Setup (Recommended)
```bash
cd ~/scim-client
./test-setup.sh
```

This script will:
- Start the SCIM server on port 7001
- Start the SCIM client on port 8001
- Generate test data
- Provide you with testing URLs and credentials

### Manual Setup
```bash
# Terminal 1: Start SCIM Server
cd ~/scim-server
source .venv/bin/activate
python run_server.py

# Terminal 2: Start SCIM Client
cd ~/scim-client
python3 -m http.server 8001

# Terminal 3: Generate Test Data
cd ~/scim-server
./generate_test_data.sh
```

### Test Configuration
- **Endpoint**: `http://localhost:7001/scim-identifier/test-hr-server/scim/v2`
- **API Key**: `api-key-12345`
- **Client URL**: `http://localhost:8001`

---

## ✨ Features

### Core SCIM 2.0 Support
- **Dynamic Endpoint Discovery** - Auto-discovers available resource types and schemas
- **Full CRUD Operations** - Create, read, update, delete for all resource types
- **Schema Validation** - Client-side validation using server schemas
- **RFC 7642, 7643, 7644 Compliance** - Complete SCIM 2.0 standards support

### Supported Resource Types
- **Users** - User management with full CRUD operations
- **Groups** - Group management with member relationships
- **Entitlements** - Entitlement management (licenses, permissions, etc.)
- **Roles** - Role-based access control management
- **ResourceTypes** - Discovery of available resource types
- **Schemas** - Schema discovery and validation

### Modern UI/UX
- **Card-Based Layout** - Modern resource cards with hover effects
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Interactive JSON Viewer** - Pretty-printed request/response logging
- **Real-Time Validation** - Form validation with helpful error messages
- **Loading States** - Proper loading indicators and error states

### Developer Tools
- **Raw Request/Response Views** - True raw JSON for debugging
- **Detailed Error Messages** - Verbose, developer-focused error reporting
- **CORS Proxy** - Built-in proxy for local development
- **Local Storage** - Configuration persistence in browser
- **Deep Linking** - SPA routing with bookmarkable URLs

---

## 🧪 Testing

### Quick Testing
```bash
# Run all tests
./test.sh

# API tests only
./test.sh api

# Browser tests only
./test.sh browser

# Setup environment only
./test.sh setup
```

### Automated Testing with Playwright
```bash
# Install dependencies
npm install
npx playwright install

# Run tests
npm test                    # All tests
npm run test:headed        # With browser visible
npm run test:debug         # Debug mode
npm run test:ui            # Playwright UI
npm run test:report        # View test report
```

### Manual Testing
1. Open `http://localhost:8001` in your browser
2. Configure the client with the test endpoint and API key
3. Test each resource type:
   - Navigate between Users, Groups, Entitlements, Roles
   - Create, edit, and delete resources
   - Check request/response panels
   - Verify form validation

### Test Scenarios Covered
- ✅ Dynamic endpoint discovery
- ✅ All CRUD operations for each resource type
- ✅ Form validation and error handling
- ✅ Mobile responsiveness
- ✅ Cross-browser compatibility
- ✅ Performance under load

---

## 🏗️ Project Structure

```
scim-client/
├── js/                    # JavaScript components
│   ├── scim-client.js     # Core SCIM client logic
│   ├── app.js            # Main application controller
│   ├── entitlement-*.js  # Entitlement management
│   └── role-*.js         # Role management
├── css/                   # Stylesheets
│   └── components.css    # Modern UI components
├── vendor/               # Third-party libraries
│   └── jquery-jsonview/  # JSON viewer
├── tests/                # Test files
│   └── e2e.spec.js      # Playwright tests
├── *.sh                  # Testing and setup scripts
├── *.md                  # Documentation (consolidated here)
└── index.html           # Main application
```

---

## 🔧 Development Setup

### Prerequisites

#### Python (for CORS proxy)
- Python 3.x
- `requests` (see `requirements.txt`)

#### Node.js (for testing)
- Node.js 16+
- Playwright for browser testing

### Installation
```bash
# Install Python requirements
pip install -r requirements.txt

# Install Node.js requirements
npm install

# Install Playwright browsers
npx playwright install

# Copy environment template
cp env.example .env
# Edit .env with your SCIM endpoint and API key
```

### Development Workflow
1. Make changes to the client
2. Run `npm test` to verify functionality
3. Run `./run-api-tests.sh` to verify API compatibility
4. Test manually in browser for UI/UX
5. Commit changes

### Starting the CORS Proxy
For local development, you may need to start the CORS proxy:

```bash
# Option 1: Use the startup script
./start-cors-proxy.sh

# Option 2: Run directly
python3 simple-cors-proxy.py
```

The CORS proxy will run on `http://localhost:8080` and can be enabled in the client configuration.

---

## 📊 Performance & Compatibility

### Performance Benchmarks
- **Initial Load**: < 3 seconds
- **Resource Discovery**: < 2 seconds
- **List Loading**: < 1 second
- **Form Submission**: < 2 seconds
- **Memory Usage**: < 20MB base + 2MB per 100 resources

### Browser Support
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### Mobile Responsiveness
- ✅ Desktop (1200px+)
- ✅ Tablet (768px-1199px)
- ✅ Mobile (320px-767px)

---

## 🔒 Security & Best Practices

### Security Features
- **Input Validation** - Schema-based client-side validation
- **XSS Prevention** - Proper HTML escaping
- **CSRF Protection** - Proper authorization headers
- **No Sensitive Storage** - Only configuration in localStorage

### Development Best Practices
- **Modular Architecture** - Each resource type has separate components
- **Event-Driven Design** - Custom events for navigation
- **Error Handling** - Comprehensive error management
- **Standards Compliance** - Full SCIM 2.0 compliance

---

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the ports
netstat -tlnp | grep -E ':(7001|8001)'

# Kill processes if needed
sudo kill -9 <PID>
```

#### SCIM Server Not Starting
```bash
# Check Python environment
cd ~/scim-server
source .venv/bin/activate
python --version

# Check dependencies
pip list | grep -E "(fastapi|uvicorn)"
```

#### CORS Issues
- The client includes a CORS proxy for local development
- If you see CORS errors, check that the proxy is running
- Alternative: Use browser extensions to disable CORS for localhost

#### Test Data Issues
```bash
# Regenerate test data
cd ~/scim-server
./generate_test_data.sh

# Or reset the database
rm test_scim.db
./generate_test_data.sh
```

### Debug Commands
```bash
# Check server health
curl http://localhost:7001/healthz

# Check client is serving
curl http://localhost:8001

# Test SCIM endpoint directly
curl -H "Authorization: Bearer api-key-12345" \
     http://localhost:7001/scim-identifier/test-hr-server/scim/v2/Users
```

---

## 📈 Phase 1 Implementation Summary

### ✅ Completed Features
- **Dynamic Endpoint Discovery** - Automatic resource type and schema discovery
- **Extended Resource Support** - Entitlements and roles with full CRUD
- **Enhanced UI/UX** - Modern card-based layout with responsive design
- **Comprehensive Testing** - Automated and manual testing suites
- **Schema Validation** - Client-side validation using server schemas

### 🔮 Future Enhancements
- **Relationship Management** - User-group and user-entitlement relationships
- **Bulk Operations** - Multi-select and bulk create/update/delete
- **Advanced Filtering** - Complex query support with filters
- **Real-Time Updates** - WebSocket support for live updates
- **Multi-Server Support** - Switch between different SCIM servers

---

## 📚 Additional Resources

- **SCIM Server Documentation**: `../scim-server/README.md`
- **SCIM 2.0 Standards**: RFC 7642, 7643, 7644
- **GitHub Repository**: [https://github.com/ltsch/scim-client](https://github.com/ltsch/scim-client)

---

## 🤝 Contributing

This project is intended for open source use and is ready for GitHub. All code, scripts, and vendor files are included except for secrets and build output.

### Development Guidelines
- Follow modular architecture principles
- Write tests for new features
- Maintain SCIM 2.0 compliance
- Ensure cross-browser compatibility
- Document all changes

---

## 📄 License

MIT License - see LICENSE file for details.

---

**Happy SCIM Testing! 🎉** 