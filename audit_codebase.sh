#!/bin/bash

# Mobile Marketplace Codebase Audit Script
# Run this script in your project root directory

echo "🔍 MOBILE MARKETPLACE CODEBASE AUDIT"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Counters
CRITICAL=0
HIGH=0
MEDIUM=0
LOW=0python3 analyze_codebase.py


echo "📁 Checking Project Structure..."
echo ""

# Check for sensitive files
echo "🔐 SECURITY CHECKS:"
if [ -f ".env" ] && grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✓${NC} .env file exists and is in .gitignore"
else
    if [ -f ".env" ]; then
        echo -e "${RED}✗ CRITICAL: .env file exists but NOT in .gitignore${NC}"
        ((CRITICAL++))
    else
        echo -e "${YELLOW}⚠ WARNING: No .env file found${NC}"
        ((MEDIUM++))
    fi
fi

if [ -f "package.json" ] && grep -q "API_KEY\|SECRET\|PASSWORD" package.json; then
    echo -e "${RED}✗ CRITICAL: Potential secrets in package.json${NC}"
    ((CRITICAL++))
fi

# Check Python files for hardcoded secrets
if find . -name "*.py" -type f -exec grep -l "api_key\|API_KEY\|password\|PASSWORD\|secret\|SECRET" {} \; 2>/dev/null | grep -q .; then
    echo -e "${RED}✗ CRITICAL: Potential hardcoded secrets in Python files${NC}"
    ((CRITICAL++))
fi

# Check for temp files committed
if [ -f "temp.py" ] || [ -f "training_temp.json" ]; then
    echo -e "${RED}✗ HIGH: Temporary files committed to repository${NC}"
    ((HIGH++))
fi

echo ""
echo "📦 DEPENDENCY CHECKS:"

# Check for package.json
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json exists"
    
    # Check for outdated dependencies
    if command -v npm &> /dev/null; then
        echo "  Checking for outdated packages..."
        npm outdated > /tmp/outdated.txt 2>&1
        if [ -s /tmp/outdated.txt ]; then
            echo -e "${YELLOW}⚠ WARNING: Outdated dependencies found${NC}"
            ((MEDIUM++))
        fi
    fi
    
    # Check for security vulnerabilities
    if command -v npm &> /dev/null; then
        echo "  Checking for security vulnerabilities..."
        npm audit --json > /tmp/audit.json 2>&1
        VULNERABILITIES=$(grep -o '"total":[0-9]*' /tmp/audit.json | head -1 | cut -d: -f2)
        if [ "$VULNERABILITIES" -gt 0 ]; then
            echo -e "${RED}✗ HIGH: $VULNERABILITIES security vulnerabilities found${NC}"
            ((HIGH++))
        fi
    fi
else
    echo -e "${RED}✗ CRITICAL: No package.json found${NC}"
    ((CRITICAL++))
fi

# Check for requirements.txt (Python)
if [ -f "requirements.txt" ]; then
    echo -e "${GREEN}✓${NC} requirements.txt exists"
else
    if find . -name "*.py" -type f | grep -q .; then
        echo -e "${RED}✗ HIGH: Python files exist but no requirements.txt${NC}"
        ((HIGH++))
    fi
fi

echo ""
echo "🧪 TESTING & QUALITY:"

# Check for tests
if [ -d "tests" ] || [ -d "test" ] || [ -d "__tests__" ]; then
    echo -e "${GREEN}✓${NC} Test directory exists"
else
    echo -e "${RED}✗ CRITICAL: No test directory found${NC}"
    ((CRITICAL++))
fi

# Check for test scripts in package.json
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo -e "${GREEN}✓${NC} Test script defined in package.json"
else
    echo -e "${RED}✗ HIGH: No test script in package.json${NC}"
    ((HIGH++))
fi

# Check for linting
if [ -f "eslint.config.js" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
    echo -e "${GREEN}✓${NC} ESLint configuration exists"
else
    echo -e "${YELLOW}⚠ WARNING: No ESLint configuration${NC}"
    ((MEDIUM++))
fi

# Check for TypeScript strict mode
if [ -f "tsconfig.json" ]; then
    if grep -q '"strict": true' tsconfig.json; then
        echo -e "${GREEN}✓${NC} TypeScript strict mode enabled"
    else
        echo -e "${YELLOW}⚠ WARNING: TypeScript strict mode not enabled${NC}"
        ((MEDIUM++))
    fi
fi

echo ""
echo "📝 DOCUMENTATION:"

# Check README
if [ -f "README.md" ]; then
    README_SIZE=$(wc -l < README.md)
    if [ "$README_SIZE" -lt 50 ]; then
        echo -e "${YELLOW}⚠ WARNING: README.md is too basic ($README_SIZE lines)${NC}"
        ((LOW++))
    else
        echo -e "${GREEN}✓${NC} README.md exists and is detailed"
    fi
else
    echo -e "${RED}✗ HIGH: No README.md found${NC}"
    ((HIGH++))
fi

# Check for API documentation
if [ -f "API.md" ] || [ -f "docs/API.md" ]; then
    echo -e "${GREEN}✓${NC} API documentation exists"
else
    echo -e "${YELLOW}⚠ WARNING: No API documentation${NC}"
    ((MEDIUM++))
fi

echo ""
echo "🏗️ CODE STRUCTURE:"

# Check for environment example
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓${NC} .env.example exists"
else
    echo -e "${YELLOW}⚠ WARNING: No .env.example file${NC}"
    ((MEDIUM++))
fi

# Check for proper gitignore
if [ -f ".gitignore" ]; then
    IGNORE_ITEMS=("node_modules" ".env" "*.log" "dist" "build" ".DS_Store" "__pycache__")
    MISSING_IGNORES=()
    
    for item in "${IGNORE_ITEMS[@]}"; do
        if ! grep -q "$item" .gitignore; then
            MISSING_IGNORES+=("$item")
        fi
    done
    
    if [ ${#MISSING_IGNORES[@]} -eq 0 ]; then
        echo -e "${GREEN}✓${NC} .gitignore is comprehensive"
    else
        echo -e "${YELLOW}⚠ WARNING: .gitignore missing: ${MISSING_IGNORES[*]}${NC}"
        ((MEDIUM++))
    fi
else
    echo -e "${RED}✗ CRITICAL: No .gitignore file${NC}"
    ((CRITICAL++))
fi

# Check for CI/CD
if [ -d ".github/workflows" ] || [ -f ".gitlab-ci.yml" ] || [ -f ".circleci/config.yml" ]; then
    echo -e "${GREEN}✓${NC} CI/CD configuration exists"
else
    echo -e "${YELLOW}⚠ WARNING: No CI/CD configuration${NC}"
    ((MEDIUM++))
fi

echo ""
echo "🐍 PYTHON SPECIFIC:"

# Check Python file structure
if find . -name "*.py" -type f | grep -q .; then
    # Check for proper Python project structure
    if [ -f "setup.py" ] || [ -f "pyproject.toml" ]; then
        echo -e "${GREEN}✓${NC} Python package configuration exists"
    else
        echo -e "${YELLOW}⚠ WARNING: No setup.py or pyproject.toml${NC}"
        ((MEDIUM++))
    fi
    
    # Check for __init__.py files
    if find . -type d -name src -o -name app | xargs -I {} find {} -type d | while read dir; do
        [ -f "$dir/__init__.py" ] || echo "$dir"
    done | grep -q .; then
        echo -e "${YELLOW}⚠ WARNING: Some Python packages missing __init__.py${NC}"
        ((LOW++))
    fi
fi

echo ""
echo "📱 REACT NATIVE / EXPO:"

# Check for proper app structure
if [ -d "app" ]; then
    echo -e "${GREEN}✓${NC} App directory exists"
else
    echo -e "${RED}✗ HIGH: No app directory found${NC}"
    ((HIGH++))
fi

# Check for error boundaries
if find . -name "*.tsx" -o -name "*.ts" | xargs grep -l "ErrorBoundary" | grep -q .; then
    echo -e "${GREEN}✓${NC} Error boundaries implemented"
else
    echo -e "${YELLOW}⚠ WARNING: No error boundaries found${NC}"
    ((MEDIUM++))
fi

# Check for proper state management
if grep -rq "redux\|zustand\|mobx\|recoil" package.json 2>/dev/null; then
    echo -e "${GREEN}✓${NC} State management library detected"
else
    echo -e "${YELLOW}⚠ WARNING: No state management library found${NC}"
    ((MEDIUM++))
fi

echo ""
echo "======================================"
echo "📊 AUDIT SUMMARY"
echo "======================================"
echo -e "${RED}Critical Issues: $CRITICAL${NC}"
echo -e "${RED}High Priority:   $HIGH${NC}"
echo -e "${YELLOW}Medium Priority: $MEDIUM${NC}"
echo -e "${GREEN}Low Priority:    $LOW${NC}"
echo ""

TOTAL=$((CRITICAL + HIGH + MEDIUM + LOW))
echo "Total Issues Found: $TOTAL"
echo ""

if [ $CRITICAL -gt 0 ]; then
    echo -e "${RED}⚠️  CRITICAL: This codebase has critical issues that must be fixed before production!${NC}"
elif [ $HIGH -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: This codebase has high-priority issues that should be addressed.${NC}"
else
    echo -e "${GREEN}✓ This codebase is in reasonable shape for production.${NC}"
fi

echo ""
echo "📋 Run 'cat FIXING_GUIDE.md' for detailed fixing instructions"