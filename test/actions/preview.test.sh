#!/usr/bin/env bash
# Tests for the preview deploy composite action's shell script logic.
# Validates action structure, branch naming, and cleanup behavior.

set -euo pipefail

PASS=0
FAIL=0
TESTS=()

pass() { PASS=$((PASS + 1)); TESTS+=("PASS: $1"); }
fail() { FAIL=$((FAIL + 1)); TESTS+=("FAIL: $1"); }

# Test 1: Action YAML exists
test_action_yaml_exists() {
  if [ -f "src/actions/preview/action.yml" ]; then
    pass "action.yml exists"
  else
    fail "action.yml not found"
  fi
}

# Test 2: Required input 'source-directory' is defined
test_required_inputs() {
  if grep -q "source-directory:" src/actions/preview/action.yml && \
     grep -A2 "source-directory:" src/actions/preview/action.yml | grep -q "required: true"; then
    pass "source-directory is a required input"
  else
    fail "source-directory should be required"
  fi
}

# Test 3: Preview branch naming uses PR number
test_preview_branch_naming() {
  if grep -q 'PREVIEW_BRANCH="preview/pr-\${PR_NUMBER}"' src/actions/preview/action.yml; then
    pass "preview branch uses PR number"
  else
    fail "preview branch should use PR number"
  fi
}

# Test 4: Has deploy step with condition
test_deploy_condition() {
  if grep -q "github.event.action != 'closed'" src/actions/preview/action.yml; then
    pass "deploy step has open PR condition"
  else
    fail "deploy step should check event action"
  fi
}

# Test 5: Has cleanup step on PR close
test_cleanup_condition() {
  if grep -q "github.event.action == 'closed'" src/actions/preview/action.yml; then
    pass "cleanup step triggers on PR close"
  else
    fail "cleanup should trigger on PR close"
  fi
}

# Test 6: Cleanup deletes the branch
test_cleanup_deletes_branch() {
  if grep -q 'git push.*--delete.*PREVIEW_BRANCH' src/actions/preview/action.yml; then
    pass "cleanup deletes preview branch"
  else
    fail "cleanup should delete preview branch"
  fi
}

# Test 7: Commit message includes PR number
test_commit_includes_pr() {
  if grep -q 'PR #\${PR_NUMBER}' src/actions/preview/action.yml; then
    pass "commit message includes PR number"
  else
    fail "commit message should include PR number"
  fi
}

# Test 8: Uses strict mode
test_strict_mode() {
  if grep -q 'set -euo pipefail' src/actions/preview/action.yml; then
    pass "script uses strict mode"
  else
    fail "script should use set -euo pipefail"
  fi
}

# Test 9: Handles missing preview branch gracefully
test_missing_branch_handling() {
  if grep -q 'Preview branch.*not found' src/actions/preview/action.yml; then
    pass "handles missing preview branch gracefully"
  else
    fail "should handle missing preview branch"
  fi
}

# Test 10: Uses composite action type
test_composite_type() {
  if grep -q "using: 'composite'" src/actions/preview/action.yml; then
    pass "uses composite action type"
  else
    fail "should use composite action type"
  fi
}

# Run all tests
test_action_yaml_exists
test_required_inputs
test_preview_branch_naming
test_deploy_condition
test_cleanup_condition
test_cleanup_deletes_branch
test_commit_includes_pr
test_strict_mode
test_missing_branch_handling
test_composite_type

# Summary
echo ""
echo "=== Preview Action Tests ==="
for t in "${TESTS[@]}"; do echo "  $t"; done
echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then exit 1; fi
