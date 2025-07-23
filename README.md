# SCIM API Client

A modern, developer-focused web application for testing and debugging SCIM (System for Cross-domain Identity Management) servers. Built with React, Vite, and modern web technologies.

## Features

- **SCIM API Testing**: Send requests to SCIM endpoints and view raw responses
- **Developer Tools**: Access to raw request/response data for debugging
- **Client-Side Storage**: All configuration (including API keys) stored in browser localStorage
- **Integrated CORS Proxy**: Built-in nginx-based CORS proxy for testing cross-origin requests
- **Modern UI**: Clean, functional interface built with React components
- **Comprehensive Testing**: End-to-end tests with Playwright
- **Docker Support**: Containerized deployment with integrated CORS proxy

## Architecture

This is a **Single-Page Application (SPA)** built with:
- **React 18** - Modern component-based UI library
- **Vite** - Fast build tool and development server
- **Playwright** - End-to-end testing framework
- **Browser Storage** - All data stored client-side (localStorage)
- **Nginx** - Integrated CORS proxy and static file serving

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Docker (optional, for containerized deployment)

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

### Docker Deployment
```bash
# Build and run with Docker
docker-compose up -d

# Or build manually
docker build -t scim-client .
docker run -p 8000:8000 scim-client
```
The application will be available at `http://localhost:8000` with integrated CORS proxy

### Testing
```bash
# Run Playwright tests
npm run test:e2e

# Run tests in headed mode
npm run test:e2e:headed
```

### Build
```bash
npm run build
```

## Configuration

1. **Open the application** at `http://localhost:5173`
2. **Navigate to Settings** - The app will automatically redirect if no configuration is found
3. **Enter your SCIM endpoint** (e.g., `https://your-scim-server.com/scim/v2`)
4. **Add your API key** (if required)
5. **Enable CORS proxy** if needed for cross-origin requests (uses integrated nginx proxy)
6. **Save configuration** - All settings are stored in your browser's localStorage

## Usage

### Testing SCIM Endpoints

1. **Users Section**: Test user-related SCIM operations
   - GET /Users - List users
   - POST /Users - Create user
   - GET /Users/{id} - Get specific user
   - PUT /Users/{id} - Update user
   - DELETE /Users/{id} - Delete user

2. **Groups Section**: Test group-related SCIM operations
   - GET /Groups - List groups
   - POST /Groups - Create group
   - GET /Groups/{id} - Get specific group
   - PUT /Groups/{id} - Update group
   - DELETE /Groups/{id} - Delete group

3. **Schema Section**: View SCIM schema information
   - GET /Schemas - List available schemas
   - GET /Schemas/{id} - Get specific schema

### Developer Features

- **Raw Data Access**: View complete request/response data
- **Expandable Sections**: Click to expand/collapse detailed information
- **Error Handling**: Clear error messages for debugging
- **Request History**: Track your API calls

## Project Structure

```
src/
├── components/          # React components
│   ├── ConfigForm.jsx  # Settings configuration
│   ├── ApiClient.jsx   # API request handling
│   ├── ResourceSection.jsx # Users/Groups sections
│   └── SchemaSection.jsx   # Schema display
├── hooks/              # Custom React hooks
│   ├── useConfig.js    # Configuration management
│   └── useApiClient.js # API client logic
├── utils/              # Utility functions
│   ├── api.js          # API request utilities
│   └── storage.js      # Browser storage utilities
└── App.jsx             # Main application component

tests/
├── e2e/               # Playwright end-to-end tests
│   ├── config.test.js  # Configuration flow tests
│   ├── api.test.js     # API interaction tests
│   └── ui.test.js      # UI component tests
└── playwright.config.js # Playwright configuration
```

## Development

### Adding New Features

1. **Create components** in `src/components/`
2. **Add custom hooks** in `src/hooks/` for reusable logic
3. **Write tests** in `tests/e2e/` for new functionality
4. **Update documentation** in this README

### Testing Best Practices

- Use page ready indicators instead of hard-coded waits
- Test critical user flows (config, API calls, error handling)
- Validate data persistence in localStorage
- Test CORS proxy functionality

### Code Style

- Use functional components with hooks
- Keep components small and focused
- Use TypeScript for better type safety (future enhancement)
- Follow React best practices

## CORS Proxy Implementation

The application includes an **integrated nginx-based CORS proxy** that eliminates the need for a separate proxy service:

### **Benefits of the Integrated Approach:**
- **Single Port**: Everything runs on port 8000 (no separate proxy port needed)
- **Better Performance**: Nginx is highly optimized for proxying requests
- **Simplified Deployment**: Single container with integrated functionality
- **Automatic CORS Headers**: Handles preflight requests and CORS headers automatically
- **Request Forwarding**: Properly forwards all relevant headers (Authorization, Content-Type, etc.)

### **How It Works:**
1. **Client Request**: `GET /proxy?url=https://api.example.com/scim/v2/Users`
2. **Nginx Processing**: Extracts target URL and forwards the request
3. **Response**: Returns the API response with proper CORS headers

### **Usage:**
- Enable CORS proxy in the application settings
- All requests automatically go through the integrated proxy
- No additional configuration needed

## Deployment

This is a static web application that can be deployed to any static hosting service:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### **Docker Deployment (Recommended):**
```bash
# Build and run with integrated CORS proxy
docker-compose up -d

# Access at http://localhost:8000
```

## Browser Support

- Chrome/Chromium (recommended for testing)
- Firefox
- Safari
- Edge

## Contributing

1. Follow the existing code structure
2. Write tests for new features
3. Update documentation as needed
4. Test across different browsers

## License

MIT License - see LICENSE file for details.
