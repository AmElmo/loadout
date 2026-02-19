---
name: e2e-tests
description: Generate Playwright end-to-end tests for user flows and critical paths
metadata:
  role: testing
  tags: [e2e, playwright, testing]
---
# E2E Test Writer

Given a user flow description, generate a Playwright e2e test:

1. **Setup**: Auth state, test data seeding, environment prep
2. **Steps**: Navigate, interact, fill forms, click buttons
3. **Assertions**: Verify page content, URL changes, API responses, toast messages
4. **Teardown**: Clean up test data, reset state
5. **Resilience**: Use `data-testid` selectors, avoid flaky waits, retry on network

Follow the Page Object Model pattern for reusable page interactions.
Group related tests in `describe` blocks with clear names.
