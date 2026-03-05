Feature: Git Clone & OPFS Storage
  As a user viewing a private repository
  I want the app to clone the repo into my browser
  So that I can view content offline and with fast load times

  Background:
    Given I am authenticated with a valid GitHub token
    And the app is configured with repo "myorg/docs" on branch "main"

  Scenario: First visit clones the repository
    Given the repo has not been cloned locally
    When the app loads
    Then a bare clone of "myorg/docs" should be created in OPFS
    And the clone progress UI should show phase updates
    And repo metadata should be stored in IndexedDB

  Scenario: Return visit fetches only new changes
    Given the repo was previously cloned
    And the fetch TTL has expired
    When the app loads
    Then a git fetch should be performed instead of a full clone
    And only new objects should be downloaded

  Scenario: Return visit within TTL skips fetch
    Given the repo was previously cloned
    And the fetch TTL has not expired
    When the app loads
    Then no network request to the git remote should be made
    And the existing local clone should be used

  Scenario: Clone progress is displayed
    Given the repo has not been cloned locally
    When cloning begins
    Then the UI should show "Cloning..." phase
    And a progress bar should reflect received objects
    When cloning completes
    Then the UI should transition to the content view

  Scenario: Concurrent tabs use Web Locks
    Given the repo is being cloned in another tab
    When this tab attempts to clone the same repo
    Then it should wait for the lock to be released
    And use the clone created by the other tab

  Scenario: Clone failure shows error
    Given the network is unavailable
    And the repo has not been cloned locally
    When the app loads
    Then an error message should be displayed
    And a retry button should be available
