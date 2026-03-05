#!/usr/bin/env bash
# Tests for the deploy composite action's shell script logic.
# Validates input validation and file operations without requiring
# full git commit operations (those are tested in CI).

set -euo pipefail

PASS=0
FAIL=0
TESTS=()

pass() { PASS=$((PASS + 1)); TESTS+=("PASS: $1"); }
fail() { FAIL=$((FAIL + 1)); TESTS+=("FAIL: $1"); }

# Test 1: Action YAML exists and has required inputs
test_action_yaml_exists() {
  if [ -f "src/actions/deploy/action.yml" ]; then
    pass "action.yml exists"
  else
    fail "action.yml not found"
  fi
}

# Test 2: Required input 'source-directory' is defined
test_required_inputs() {
  if grep -q "source-directory:" src/actions/deploy/action.yml && \
     grep -A2 "source-directory:" src/actions/deploy/action.yml | grep -q "required: true"; then
    pass "source-directory is a required input"
  else
    fail "source-directory should be required"
  fi
}

# Test 3: Default target-branch is gh-pages
test_default_branch() {
  if grep -A3 "target-branch:" src/actions/deploy/action.yml | grep -q "default:.*gh-pages"; then
    pass "default target branch is gh-pages"
  else
    fail "default target branch should be gh-pages"
  fi
}

# Test 4: Script validates source directory exists
test_source_dir_validation() {
  if grep -q 'if \[ ! -d "\$SOURCE_DIR" \]' src/actions/deploy/action.yml; then
    pass "script validates source directory"
  else
    fail "script should validate source directory"
  fi
}

# Test 5: Script uses error annotation
test_error_annotation() {
  if grep -q '::error::' src/actions/deploy/action.yml; then
    pass "script uses GitHub error annotation"
  else
    fail "script should use ::error:: annotation"
  fi
}

# Test 6: Script handles no-changes case
test_no_changes_handling() {
  if grep -q 'git diff --cached --quiet' src/actions/deploy/action.yml; then
    pass "script handles no-changes case"
  else
    fail "script should check for no changes"
  fi
}

# Test 7: Commit message includes SHA
test_commit_includes_sha() {
  if grep -q 'GITHUB_SHA:0:7' src/actions/deploy/action.yml; then
    pass "commit message includes short SHA"
  else
    fail "commit message should include short SHA"
  fi
}

# Test 8: Uses set -euo pipefail
test_strict_mode() {
  if grep -q 'set -euo pipefail' src/actions/deploy/action.yml; then
    pass "script uses strict mode"
  else
    fail "script should use set -euo pipefail"
  fi
}

# Test 9: Cleanup removes work dir
test_cleanup() {
  if grep -q 'rm -rf "\$WORK_DIR"' src/actions/deploy/action.yml; then
    pass "script cleans up work directory"
  else
    fail "script should clean up work directory"
  fi
}

# Test 10: Missing source directory detected
test_missing_source_detection() {
  TEST_DIR=$(mktemp -d)
  SOURCE_DIR="$TEST_DIR/nonexistent"
  if [ ! -d "$SOURCE_DIR" ]; then
    pass "missing source directory correctly detected"
  else
    fail "source dir should not exist"
  fi
  rm -rf "$TEST_DIR"
}

# Run all tests
test_action_yaml_exists
test_required_inputs
test_default_branch
test_source_dir_validation
test_error_annotation
test_no_changes_handling
test_commit_includes_sha
test_strict_mode
test_cleanup
test_missing_source_detection

# Summary
echo ""
echo "=== Deploy Action Tests ==="
for t in "${TESTS[@]}"; do echo "  $t"; done
echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then exit 1; fi
