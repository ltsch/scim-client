#!/bin/bash

# Simple wrapper script for SCIM Client E2E Testing
# Usage: ./test.sh [option]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_SCRIPT="$SCRIPT_DIR/run-e2e-tests.sh"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 SCIM Client E2E Testing${NC}"
echo "================================"

if [ ! -f "$MAIN_SCRIPT" ]; then
    echo -e "${YELLOW}Error: Main test script not found: $MAIN_SCRIPT${NC}"
    exit 1
fi

case "${1:-}" in
    "api"|"--api")
        echo -e "${GREEN}Running API tests only...${NC}"
        "$MAIN_SCRIPT" --api-only
        ;;
    "browser"|"--browser")
        echo -e "${GREEN}Running browser tests only...${NC}"
        "$MAIN_SCRIPT" --browser-only
        ;;
    "setup"|"--setup")
        echo -e "${GREEN}Setting up test environment only...${NC}"
        "$MAIN_SCRIPT" --setup-only
        ;;
    "help"|"--help"|"-h")
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  (no args)    Run full E2E test suite"
        echo "  api          Run API tests only"
        echo "  browser      Run browser tests only"
        echo "  setup        Setup environment only"
        echo "  help         Show this help"
        echo ""
        echo "Examples:"
        echo "  $0           # Run everything"
        echo "  $0 api       # API tests only"
        echo "  $0 browser   # Browser tests only"
        echo "  $0 setup     # Setup only"
        ;;
    "")
        echo -e "${GREEN}Running full E2E test suite...${NC}"
        "$MAIN_SCRIPT"
        ;;
    *)
        echo -e "${YELLOW}Unknown option: $1${NC}"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac