#!/bin/bash

# Test Email Verification Flow
# Script d'automatisation pour tester le flow complet
# Usage: bash TEST_EMAIL_VERIFICATION_SCRIPT.sh

set -e

API_URL="http://localhost:3000"
TEST_EMAIL="test-verify-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_FIRST_NAME="Test"
TEST_LAST_NAME="User"

COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${COLOR_BLUE}=== Email Verification Flow Test ===${NC}\n"
echo "API URL: $API_URL"
echo "Test Email: $TEST_EMAIL"
echo

# Test 1: Check server is running
echo -e "${COLOR_BLUE}[1/5] Checking server...${NC}"
if ! curl -s "$API_URL" > /dev/null; then
  echo -e "${COLOR_RED}❌ Server not running at $API_URL${NC}"
  exit 1
fi
echo -e "${COLOR_GREEN}✅ Server is reachable${NC}\n"

# Test 2: Signup endpoint
echo -e "${COLOR_BLUE}[2/5] Testing Signup (POST /app/(auth)/actions.ts -> handleRegister)...${NC}"
echo "This test requires form submission - testing via browser"
echo -e "${COLOR_YELLOW}⚠️  Manual step required:${NC}"
echo "1. Go to: $API_URL/inscription"
echo "2. Fill form:"
echo "   - Email: $TEST_EMAIL"
echo "   - Password: $TEST_PASSWORD"
echo "   - First Name: $TEST_FIRST_NAME"
echo "   - Last Name: $TEST_LAST_NAME"
echo "3. Click 'S'inscrire'"
echo "4. Expected: Message 'Compte créé ! Un email de vérification...'"
echo
read -p "Press ENTER after signup... " -n 1

# Test 3: Verify email blocked login
echo -e "\n${COLOR_BLUE}[3/5] Testing Login with Unverified Email...${NC}"
echo -e "${COLOR_YELLOW}⚠️  Manual step required:${NC}"
echo "1. Go to: $API_URL/connexion"
echo "2. Fill form:"
echo "   - Email: $TEST_EMAIL"
echo "   - Password: $TEST_PASSWORD"
echo "3. Click 'Se connecter'"
echo "4. Expected: Error message 'Veuillez confirmer votre adresse email...'"
echo "5. Expected: Button 'Renvoyer l'email de vérification' visible"
echo
read -p "Press ENTER after testing blocked login... " -n 1

# Test 4: Verification link
echo -e "\n${COLOR_BLUE}[4/5] Testing Email Verification Link...${NC}"
echo -e "${COLOR_YELLOW}⚠️  Manual step required:${NC}"
echo "1. Check your email for a verification link (or server logs)"
echo "2. Click the link OR go to: $API_URL/verification-email?token=YOUR_TOKEN"
echo "3. Expected: Redirect to $API_URL/connexion?success=..."
echo "4. Expected: Message 'Email confirmé avec succès !'"
echo
read -p "Press ENTER after verifying email... " -n 1

# Test 5: Login after verification
echo -e "\n${COLOR_BLUE}[5/5] Testing Login with Verified Email...${NC}"
echo -e "${COLOR_YELLOW}⚠️  Manual step required:${NC}"
echo "1. Go to: $API_URL/connexion"
echo "2. Fill form:"
echo "   - Email: $TEST_EMAIL"
echo "   - Password: $TEST_PASSWORD"
echo "3. Click 'Se connecter'"
echo "4. Expected: Redirect to $API_URL/espace-client"
echo "5. Expected: Session active (logged in)"
echo

# Summary
echo -e "${COLOR_GREEN}=== Test Summary ===${NC}"
echo -e "${COLOR_GREEN}✅ If all manual steps succeeded, the email verification flow is working!${NC}"
echo
echo "Next steps:"
echo "1. Commit the changes: git add -A && git commit -m 'feat: Email verification system'"
echo "2. Run full test suite if available"
echo "3. Deploy to staging for QA"

