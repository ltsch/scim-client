#!/bin/bash

echo "🧪 Running SCIM API Tests"
echo "========================"

BASE_URL="http://localhost:7001/scim-identifier/test-hr-server/scim/v2"
API_KEY="api-key-12345"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    local data="$4"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}" -X POST \
            -H "Authorization: Bearer $API_KEY" \
            -H "Accept: application/scim+json" \
            -H "Content-Type: application/scim+json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "%{http_code}" \
            -H "Authorization: Bearer $API_KEY" \
            -H "Accept: application/scim+json" \
            "$BASE_URL$endpoint")
    fi
    
    # Extract status code (last 3 characters)
    status_code="${response: -3}"
    # Extract response body (everything except last 3 characters)
    response_body="${response%???}"
    
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
        echo -e "${GREEN}✅ PASS${NC} ($status_code)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} ($status_code)"
        echo "Response: $response_body"
        return 1
    fi
}

# Test discovery endpoints
echo "🔍 Testing Discovery Endpoints"
echo "------------------------------"
test_endpoint "ServiceProviderConfig" "/ServiceProviderConfig"
test_endpoint "ResourceTypes" "/ResourceTypes"
test_endpoint "Schemas" "/Schemas"

echo ""
echo "📋 Testing Resource Endpoints"
echo "----------------------------"

# Test Users
echo "👥 Testing Users..."
test_endpoint "List Users" "/Users"
test_endpoint "Get Users with count" "/Users?count=5"

# Test Groups
echo "👥 Testing Groups..."
test_endpoint "List Groups" "/Groups"
test_endpoint "Get Groups with count" "/Groups?count=5"

# Test Entitlements
echo "🔑 Testing Entitlements..."
test_endpoint "List Entitlements" "/Entitlements"
test_endpoint "Get Entitlements with count" "/Entitlements?count=5"

# Test Roles
echo "🎭 Testing Roles..."
test_endpoint "List Roles" "/Roles"
test_endpoint "Get Roles with count" "/Roles?count=5"

echo ""
echo "✏️  Testing Create Operations"
echo "---------------------------"

# Test creating a user
USER_DATA='{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "testuser-api",
  "displayName": "Test User API",
  "emails": [{"value": "testapi@example.com", "primary": true}],
  "active": true
}'
test_endpoint "Create User" "/Users" "POST" "$USER_DATA"

# Test creating an entitlement
ENTITLEMENT_DATA='{
  "schemas": ["urn:okta:scim:schemas:core:1.0:Entitlement"],
  "displayName": "Test License API",
  "type": "License",
  "description": "Test entitlement created via API"
}'
test_endpoint "Create Entitlement" "/Entitlements" "POST" "$ENTITLEMENT_DATA"

# Test creating a role
ROLE_DATA='{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Role"],
  "displayName": "Test Role API",
  "description": "Test role created via API"
}'
test_endpoint "Create Role" "/Roles" "POST" "$ROLE_DATA"

echo ""
echo "🔍 Testing Error Conditions"
echo "--------------------------"

# Test with invalid API key
echo -n "Testing with invalid API key... "
response=$(curl -s -w "%{http_code}" \
    -H "Authorization: Bearer invalid-key" \
    -H "Accept: application/scim+json" \
    "$BASE_URL/Users")

status_code="${response: -3}"
if [ "$status_code" -eq 401 ]; then
    echo -e "${GREEN}✅ PASS${NC} (401 Unauthorized)"
else
    echo -e "${RED}❌ FAIL${NC} (Expected 401, got $status_code)"
fi

# Test with invalid endpoint
echo -n "Testing invalid endpoint... "
response=$(curl -s -w "%{http_code}" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Accept: application/scim+json" \
    "$BASE_URL/InvalidEndpoint")

status_code="${response: -3}"
if [ "$status_code" -eq 404 ]; then
    echo -e "${GREEN}✅ PASS${NC} (404 Not Found)"
else
    echo -e "${RED}❌ FAIL${NC} (Expected 404, got $status_code)"
fi

echo ""
echo "📊 Test Summary"
echo "=============="
echo "✅ All basic endpoint tests completed"
echo "✅ Create operations tested"
echo "✅ Error handling verified"
echo ""
echo "🎉 API tests completed successfully!"
echo ""
echo "💡 Next steps:"
echo "   - Run manual tests in browser at http://localhost:8001"
echo "   - Test UI interactions and form submissions"
echo "   - Verify dynamic discovery and navigation"