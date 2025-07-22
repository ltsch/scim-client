# SCIM Client Test Harness

A web-based developer tool for testing and debugging SCIM (System for Cross-domain Identity Management) servers. This project provides a simple, functionality-first UI for exploring, validating, and manipulating SCIM endpoints.

---

## Features
- Web-based UI (HTML5, CSS3, ES6+ JavaScript)
- SCIM 2.0 (RFC 7642, 7643, 7644) compliance
- Supports extended SCIM (entitlements, roles, etc.)
- All data stored in browser localStorage (no server-side storage)
- Interactive, collapsible JSON viewer for all responses
- True raw request/response views for all SCIM operations
- Detailed error messages for all failures
- CORS proxy for local development
- SPA routing with deep linking
- Dynamic UI based on SCIM metadata

---

## Housekeeping & Project Structure

- **.gitignore**: Ignores `node_modules/`, `.env`, Python bytecode, editor files, and build output. Keeps all source and vendor files.
- **requirements.txt**: Python dependencies for the CORS proxy (see below).
- **package.json**: Node.js dependencies for local static server and (optionally) legacy CORS proxy.
- **vendor/**: Contains vendored JS/CSS for the JSON viewer (`jquery-jsonview`).
- **env.example**: Template for `.env` file with SCIM endpoint and API key.
- **.env**: Should NOT be checked in; contains secrets for local dev only.

---

## Requirements

### Python (for CORS proxy)
- Python 3.x
- `requests` (see `requirements.txt`)

### Node.js (for static server)
- `http-server` (local dev static server)
- `cors-anywhere` (legacy, not used in production)

### Frontend
- No build step required; all JS/CSS is loaded directly.
- Vendor directory includes `jquery-jsonview` for pretty JSON display.

---

## Local Development Setup

1. **Install Python requirements:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install Node.js requirements:**
   ```bash
   npm install
   ```

3. **Copy and edit environment file:**
   ```bash
   cp env.example .env
   # Edit .env with your SCIM endpoint and API key
   ```

4. **Start the CORS proxy and static server:**
   ```bash
   ./cors-proxy.sh
   # This will launch both the Python CORS proxy and the SPA static server in screen sessions
   ```

5. **Open the app:**
   - Visit [http://localhost:8000](http://localhost:8000) in your browser.

---

## Vendor Libraries
- `vendor/jquery-jsonview/jquery.jsonview.min.js`
- `vendor/jquery-jsonview/jquery.jsonview.min.css`

---

## Environment Files
- `.env` (not checked in): Your local secrets/config
- `env.example`: Template for `.env`

---

## Contributing & GitHub
- This project is intended for open source use and is ready for GitHub.
- Please see [https://github.com/ltsch/scim-client](https://github.com/ltsch/scim-client) for the canonical repository.
- All code, scripts, and vendor files are included except for secrets and build output.

---

## Best Practices
- All raw request/response panels show true raw JSON (not parsed or pretty-printed)
- All pretty/interactive JSON uses the vendored JSON viewer
- All dependencies are local or vendored; no CDN reliance in production
- All error messages are verbose and developer-focused

---

## License
MIT (or your preferred license) 