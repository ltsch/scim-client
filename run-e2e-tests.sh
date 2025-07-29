#!/bin/bash

# SCIM Client E2E Testing Master Script
# This script runs comprehensive end-to-end tests of the SCIM client against the SCIM server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCIM_SERVER_DIR="$HOME/scim-server"
SCIM_CLIENT_DIR="$HOME/scim-client"
SERVER_PORT=7001
CLIENT_PORT=8001
TEST_SERVER_ID="test-hr-server"
API_KEY="api-key-12345"
SERVER_ENDPOINT="http://localhost:$SERVER_PORT/scim-identifier/$TEST_SERVER_ID/scim/v2"

# Global variables
SERVER_PID=""
CLIENT_PID=""
TEST_RESULTS_DIR="$SCIM_CLIENT_DIR/test-results"
LOG_FILE="$TEST_RESULTS_DIR/e2e-test.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# Function to cleanup on exit
cleanup() {
    print_status "Cleaning up test environment..."
    
    if [ ! -z "$SERVER_PID" ] && kill -0 $SERVER_PID 2>/dev/null; then
        kill $SERVER_PID 2>/dev/null
        print_success "SCIM Server stopped (PID: $SERVER_PID)"
    fi
    
    if [ ! -z "$CLIENT_PID" ] && kill -0 $CLIENT_PID 2>/dev/null; then
        kill $CLIENT_PID 2>/dev/null
        print_success "SCIM Client stopped (PID: $CLIENT_PID)"
    fi
    
    # Kill any remaining processes on our ports
    pkill -f "python.*run_server.py" 2>/dev/null || true
    pkill -f "python3.*http.server.*8001" 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Function to check if port is available
check_port() {
    local port=$1
    local service=$2
    
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        print_warning "Port $port is already in use. Attempting to free it..."
        # Try to kill processes using the port
        sudo fuser -k $port/tcp 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if directories exist
    if [ ! -d "$SCIM_SERVER_DIR" ]; then
        print_error "SCIM server directory not found: $SCIM_SERVER_DIR"
        exit 1
    fi
    
    if [ ! -d "$SCIM_CLIENT_DIR" ]; then
        print_error "SCIM client directory not found: $SCIM_CLIENT_DIR"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python3 is not installed"
        exit 1
    fi
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed"
        exit 1
    fi
    
    # Check if virtual environment exists
    if [ ! -d "$SCIM_SERVER_DIR/.venv" ]; then
        print_error "SCIM server virtual environment not found"
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Function to setup test environment
setup_test_environment() {
    print_header "Setting Up Test Environment"
    
    # Create test results directory
    mkdir -p "$TEST_RESULTS_DIR"
    
    # Clear previous log
    > "$LOG_FILE"
    
    # Check and free ports
    check_port $SERVER_PORT "SCIM Server"
    check_port $CLIENT_PORT "SCIM Client"
    
    print_success "Test environment prepared"
}

# Function to start SCIM server
start_scim_server() {
    print_header "Starting SCIM Server"
    
    cd "$SCIM_SERVER_DIR"
    
    # Activate virtual environment
    source .venv/bin/activate
    
    # Start server in background
    python run_server.py > "$TEST_RESULTS_DIR/server.log" 2>&1 &
    SERVER_PID=$!
    
    print_status "SCIM Server started with PID: $SERVER_PID"
    
    # Wait for server to be ready
    if wait_for_service "http://localhost:$SERVER_PORT/healthz" "SCIM Server"; then
        print_success "SCIM Server is running on http://localhost:$SERVER_PORT"
    else
        print_error "Failed to start SCIM Server"
        exit 1
    fi
}

# Function to generate test data
generate_test_data() {
    print_header "Generating Test Data"
    
    cd "$SCIM_SERVER_DIR"
    source .venv/bin/activate
    
    if [ -f "./generate_test_data.sh" ]; then
        print_status "Running test data generation script..."
        ./generate_test_data.sh >> "$LOG_FILE" 2>&1
        print_success "Test data generated"
    else
        print_warning "Test data generation script not found, skipping..."
    fi
}

# Function to start SCIM client
start_scim_client() {
    print_header "Starting SCIM Client"
    
    cd "$SCIM_CLIENT_DIR"
    
    # Start client in background
    python3 -m http.server $CLIENT_PORT > "$TEST_RESULTS_DIR/client.log" 2>&1 &
    CLIENT_PID=$!
    
    print_status "SCIM Client started with PID: $CLIENT_PID"
    
    # Wait for client to be ready
    if wait_for_service "http://localhost:$CLIENT_PORT" "SCIM Client"; then
        print_success "SCIM Client is running on http://localhost:$CLIENT_PORT"
    else
        print_error "Failed to start SCIM Client"
        exit 1
    fi
}

# Function to run API tests
run_api_tests() {
    print_header "Running API Tests"
    
    cd "$SCIM_CLIENT_DIR"
    
    if [ -f "./run-api-tests.sh" ]; then
        print_status "Executing API test script..."
        ./run-api-tests.sh > "$TEST_RESULTS_DIR/api-tests.log" 2>&1
        
        if [ $? -eq 0 ]; then
            print_success "API tests completed successfully"
        else
            print_warning "API tests had some failures (check logs)"
        fi
    else
        print_warning "API test script not found, skipping..."
    fi
}

# Function to run Playwright tests
run_playwright_tests() {
    print_header "Running Playwright Tests"
    
    cd "$SCIM_CLIENT_DIR"
    
    # Check if Node.js and npm are available
    if ! command -v npm &> /dev/null; then
        print_warning "npm not found, skipping Playwright tests"
        return 0
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_warning "package.json not found, skipping Playwright tests"
        return 0
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing Node.js dependencies..."
        npm install >> "$LOG_FILE" 2>&1
    fi
    
    # Install Playwright browsers if needed
    if [ ! -d "node_modules/.cache/ms-playwright" ]; then
        print_status "Installing Playwright browsers..."
        npx playwright install >> "$LOG_FILE" 2>&1
    fi
    
    # Run tests
    print_status "Running Playwright tests..."
    npx playwright test --reporter=json --output-dir="$TEST_RESULTS_DIR/playwright" >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Playwright tests completed successfully"
    else
        print_warning "Playwright tests had some failures (check logs)"
    fi
}

# Function to run manual test verification
run_manual_verification() {
    print_header "Running Manual Test Verification"
    
    print_status "Verifying SCIM endpoints are accessible..."
    
    # Test basic endpoints
    local endpoints=("ServiceProviderConfig" "ResourceTypes" "Schemas" "Users" "Groups" "Entitlements" "Roles")
    local failed_endpoints=()
    
    for endpoint in "${endpoints[@]}"; do
        print_status "Testing endpoint: $endpoint"
        
        response=$(curl -s -w "%{http_code}" \
            -H "Authorization: Bearer $API_KEY" \
            -H "Accept: application/scim+json" \
            "$SERVER_ENDPOINT/$endpoint")
        
        status_code="${response: -3}"
        
        if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
            print_success "✅ $endpoint (HTTP $status_code)"
        else
            print_error "❌ $endpoint (HTTP $status_code)"
            failed_endpoints+=("$endpoint")
        fi
    done
    
    if [ ${#failed_endpoints[@]} -eq 0 ]; then
        print_success "All endpoints are accessible"
    else
        print_warning "Some endpoints failed: ${failed_endpoints[*]}"
    fi
}

# Function to generate test report
generate_test_report() {
    print_header "Generating Test Report"
    
    local report_file="$TEST_RESULTS_DIR/test-report.txt"
    
    {
        echo "SCIM Client E2E Test Report"
        echo "=========================="
        echo "Date: $(date)"
        echo "Duration: $SECONDS seconds"
        echo ""
        echo "Test Configuration:"
        echo "- SCIM Server: http://localhost:$SERVER_PORT"
        echo "- SCIM Client: http://localhost:$CLIENT_PORT"
        echo "- Test Server ID: $TEST_SERVER_ID"
        echo "- API Key: $API_KEY"
        echo ""
        echo "Test Results:"
        echo "- API Tests: $(grep -c "PASS\|FAIL" "$TEST_RESULTS_DIR/api-tests.log" 2>/dev/null || echo "Not run")"
        echo "- Playwright Tests: $(find "$TEST_RESULTS_DIR/playwright" -name "*.json" 2>/dev/null | wc -l || echo "Not run")"
        echo ""
        echo "Log Files:"
        echo "- Main Log: $LOG_FILE"
        echo "- Server Log: $TEST_RESULTS_DIR/server.log"
        echo "- Client Log: $TEST_RESULTS_DIR/client.log"
        echo "- API Tests: $TEST_RESULTS_DIR/api-tests.log"
        echo "- Playwright Results: $TEST_RESULTS_DIR/playwright/"
        echo ""
        echo "Next Steps:"
        echo "1. Open http://localhost:$CLIENT_PORT in your browser"
        echo "2. Configure with endpoint: $SERVER_ENDPOINT"
        echo "3. Use API key: $API_KEY"
        echo "4. Test the UI manually"
    } > "$report_file"
    
    print_success "Test report generated: $report_file"
    cat "$report_file"
}

# Function to display final status
display_final_status() {
    print_header "Test Execution Complete"
    
    echo -e "${CYAN}Test Environment Status:${NC}"
    echo "- SCIM Server: $(curl -s http://localhost:$SERVER_PORT/healthz > /dev/null && echo "✅ Running" || echo "❌ Not responding")"
    echo "- SCIM Client: $(curl -s http://localhost:$CLIENT_PORT > /dev/null && echo "✅ Running" || echo "❌ Not responding")"
    echo ""
    echo -e "${CYAN}Access URLs:${NC}"
    echo "- SCIM Client: http://localhost:$CLIENT_PORT"
    echo "- SCIM Server: http://localhost:$SERVER_PORT"
    echo ""
    echo -e "${CYAN}Test Configuration:${NC}"
    echo "- Endpoint: $SERVER_ENDPOINT"
    echo "- API Key: $API_KEY"
    echo ""
    echo -e "${CYAN}Test Results:${NC}"
    echo "- Logs: $TEST_RESULTS_DIR/"
    echo "- Report: $TEST_RESULTS_DIR/test-report.txt"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
}

# Main execution function
main() {
    print_header "SCIM Client E2E Testing"
    echo "This script will run comprehensive end-to-end tests"
    echo "of the SCIM client against the SCIM server."
    echo ""
    
    # Record start time
    SECONDS=0
    
    # Run all test phases
    check_prerequisites
    setup_test_environment
    start_scim_server
    generate_test_data
    start_scim_client
    run_api_tests
    run_playwright_tests
    run_manual_verification
    generate_test_report
    display_final_status
    
    # Keep services running for manual testing
    print_status "Services are running. Press Ctrl+C to stop."
    wait
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --api-only     Run only API tests"
        echo "  --browser-only Run only browser tests"
        echo "  --setup-only   Only setup environment, don't run tests"
        echo ""
        echo "This script runs comprehensive end-to-end tests of the SCIM client"
        echo "against the SCIM server, including API tests and browser automation."
        exit 0
        ;;
    --api-only)
        check_prerequisites
        setup_test_environment
        start_scim_server
        generate_test_data
        run_api_tests
        generate_test_report
        exit 0
        ;;
    --browser-only)
        check_prerequisites
        setup_test_environment
        start_scim_server
        generate_test_data
        start_scim_client
        run_playwright_tests
        generate_test_report
        display_final_status
        wait
        ;;
    --setup-only)
        check_prerequisites
        setup_test_environment
        start_scim_server
        generate_test_data
        start_scim_client
        display_final_status
        wait
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac