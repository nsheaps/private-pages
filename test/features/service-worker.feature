Feature: Service Worker
  As a user with the app installed
  I want a Service Worker to serve content from OPFS
  So that pages load instantly and work offline

  Background:
    Given the Service Worker is registered and active
    And the repo "myorg/docs" has been cloned in OPFS

  Scenario: SW intercepts page requests
    When the iframe requests "/__pages__/myorg/docs/main/index.html"
    Then the SW should read "index.html" from the OPFS bare clone
    And respond with the file content and correct MIME type

  Scenario: SW serves CSS with correct content type
    When the iframe requests "/__pages__/myorg/docs/main/styles.css"
    Then the SW should respond with Content-Type "text/css"

  Scenario: SW serves JavaScript with correct content type
    When the iframe requests "/__pages__/myorg/docs/main/app.js"
    Then the SW should respond with Content-Type "application/javascript"

  Scenario: SW returns 404 for missing files
    When the iframe requests "/__pages__/myorg/docs/main/nonexistent.txt"
    Then the SW should respond with status 404

  Scenario: SW ignores non-pages requests
    When the browser requests "/app.js"
    Then the SW should not intercept the request
    And the request should pass through to the network

  Scenario: SW update triggers banner
    Given a new version of the SW is available
    When the SW detects an update during registration
    Then an update banner should appear in the UI
    And clicking "Reload" should activate the new SW

  Scenario: Background sync checks for updates
    Given background sync is enabled with a 60-second interval
    When 60 seconds have elapsed
    Then the app should fetch new commits from the remote
    And update the local clone if changes exist

  Scenario: Offline access works for cloned repos
    Given the repo has been fully cloned
    When the network becomes unavailable
    Then previously cloned pages should still be accessible
    And the offline indicator should appear
