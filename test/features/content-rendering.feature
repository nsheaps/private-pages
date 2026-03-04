Feature: Content Resolution & Page Rendering
  As a user browsing a private static site
  I want pages to load from the local clone
  So that the experience feels like native GitHub Pages

  Background:
    Given I am authenticated with a valid GitHub token
    And the repo "myorg/docs" has been cloned locally
    And the site is configured with directory "build/"

  Scenario: Root path resolves to index.html
    When I navigate to "/"
    Then the app should resolve "build/index.html"
    And render it in a sandboxed iframe

  Scenario: Directory path resolves to directory index
    When I navigate to "/guide/"
    Then the app should resolve "build/guide/index.html"
    And render it in a sandboxed iframe

  Scenario: Clean URL resolves with .html suffix
    When I navigate to "/about"
    Then the app should try "build/about" first
    Then try "build/about.html"
    Then try "build/about/index.html"
    And render the first match found

  Scenario: 404 page is served for missing content
    When I navigate to "/nonexistent"
    And no file matches any resolution candidate
    Then the app should look for "build/404.html"
    And render it if found

  Scenario: CSS and JS assets load correctly
    Given the page references "./styles.css" and "./app.js"
    When the page is rendered
    Then relative asset URLs should be resolved correctly
    And assets should be served from the local clone

  Scenario: Internal links navigate within the app
    Given the rendered page contains a link to "/other-page"
    When I click the link
    Then the app should handle navigation client-side
    And not perform a full page reload

  Scenario: Fallback to GitHub API when git read fails
    Given the local clone is corrupted
    When I navigate to "/"
    Then the app should fall back to the GitHub Contents API
    And still render the page content
