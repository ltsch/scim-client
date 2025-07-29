#!/bin/bash

# Docker Container E2E Test Script
# Tests the SCIM client running in Docker container

set -e

echo "🧪 Running E2E tests against Docker container..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL="http://localhost:8001"
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="$3"
    
    TEST_COUNT=$((TEST_COUNT + 1))
    echo -e "${BLUE}Test $TEST_COUNT: $test_name${NC}"
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ PASS${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
}

# Test 1: Health endpoint
run_test "Health endpoint" \
    "curl -f $BASE_URL/health" \
    "200"

# Test 2: Main page loads
run_test "Main page loads" \
    "curl -f $BASE_URL/" \
    "200"

# Test 3: CSS files are accessible
run_test "CSS files accessible" \
    "curl -f $BASE_URL/css/main.css" \
    "200"

# Test 4: JavaScript files are accessible
run_test "JavaScript files accessible" \
    "curl -f $BASE_URL/js/app.js" \
    "200"

# Test 5: CORS proxy basic functionality
run_test "CORS proxy basic functionality" \
    "curl -f '$BASE_URL/proxy/https://httpbin.org/get'" \
    "200"

# Test 6: CORS proxy with query parameters
run_test "CORS proxy with query parameters" \
    "curl -f '$BASE_URL/proxy/https://httpbin.org/get?test=value'" \
    "200"

# Test 7: CORS proxy POST request
run_test "CORS proxy POST request" \
    "curl -f -X POST '$BASE_URL/proxy/https://httpbin.org/post' -d 'test=data'" \
    "200"

# Test 8: CORS proxy error handling (invalid URL)
run_test "CORS proxy error handling" \
    "curl -s '$BASE_URL/proxy/invalid-url' | grep -q '502\|error\|Invalid URL'" \
    "502"

# Test 9: API proxy endpoint (fixed URL format)
run_test "API proxy endpoint" \
    "curl -f '$BASE_URL/api/httpbin.org/get'" \
    "200"

# Test 10: Static file serving (favicon)
run_test "Static file serving" \
    "curl -f $BASE_URL/favicon.ico" \
    "200"

# Test 11: SPA routing (should return index.html)
run_test "SPA routing" \
    "curl -s $BASE_URL/nonexistent-page | grep -q 'SCIM Client Test Harness'" \
    "200"

# Test 12: CORS headers are present (using GET instead of HEAD)
run_test "CORS headers present" \
    "curl -s '$BASE_URL/proxy/https://httpbin.org/get' | head -1 | grep -q 'Access-Control-Allow-Origin'" \
    "200"

# Test 13: Security headers are present (check main page)
run_test "Security headers present" \
    "curl -s $BASE_URL/ | grep -q 'X-Frame-Options\|X-Content-Type-Options'" \
    "200"

# Test 14: Gzip compression
run_test "Gzip compression" \
    "curl -s -H 'Accept-Encoding: gzip' -I $BASE_URL/css/main.css | grep -q 'Content-Encoding: gzip'" \
    "200"

# Test 15: Container logs are accessible
run_test "Container logs accessible" \
    "docker compose logs scim-client | grep -q 'Starting CORS proxy'" \
    "200"

# Test 16: CORS proxy supports different HTTP methods
run_test "CORS proxy PUT method" \
    "curl -f -X PUT '$BASE_URL/proxy/https://httpbin.org/put' -d 'test=data'" \
    "200"

# Test 17: CORS proxy DELETE method
run_test "CORS proxy DELETE method" \
    "curl -f -X DELETE '$BASE_URL/proxy/https://httpbin.org/delete'" \
    "200"

# Test 18: CORS proxy OPTIONS method
run_test "CORS proxy OPTIONS method" \
    "curl -f -X OPTIONS '$BASE_URL/proxy/https://httpbin.org/get'" \
    "200"

echo "📊 Test Results Summary:"
echo "========================="
echo "Total Tests: $TEST_COUNT"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Docker container is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Check the output above for details.${NC}"
    exit 1
fi 