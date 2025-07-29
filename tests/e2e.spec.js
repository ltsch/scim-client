const { test, expect } = require('@playwright/test');

test.describe('SCIM Client E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to client
    await page.goto('/');
    
    // Wait for the configuration form to load
    await page.waitForSelector('input[name="endpoint"]');
    
    // Configure client
    await page.fill('input[name="endpoint"]', 'http://localhost:7001/scim-identifier/test-hr-server/scim/v2');
    await page.fill('input[name="apiKey"]', 'api-key-12345');
    await page.click('button[type="submit"]');
    
    // Wait for connection and navigation to load
    await page.waitForSelector('.sidebar-nav', { timeout: 10000 });
  });

  test('should discover resource types dynamically', async ({ page }) => {
    // Check that all expected resource types are present in navigation
    const navItems = await page.locator('.sidebar-btn').allTextContents();
    
    expect(navItems).toContain('Users');
    expect(navItems).toContain('Groups');
    expect(navItems).toContain('Entitlements');
    expect(navItems).toContain('Roles');
    expect(navItems).toContain('Server Config');
    expect(navItems).toContain('Settings');
  });

  test('should display users list', async ({ page }) => {
    await page.click('text=Users');
    
    // Wait for users list to load
    await page.waitForSelector('.resource-grid, .empty-state', { timeout: 10000 });
    
    // Check that we're on the users page
    await expect(page.locator('h2')).toContainText('Users');
    
    // Check for create button
    await expect(page.locator('button:has-text("Create User")')).toBeVisible();
  });

  test('should create a new user', async ({ page }) => {
    await page.click('text=Users');
    await page.click('text=Create User');
    
    // Fill in user form
    await page.fill('input[name="userName"]', 'testuser-e2e');
    await page.fill('input[name="displayName"]', 'Test User E2E');
    await page.fill('input[name="email"]', 'teste2e@example.com');
    await page.click('button[type="submit"]');
    
    // Should show success message or redirect to users list
    await expect(page.locator('text=User created successfully, .resource-grid, .empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('should display groups list', async ({ page }) => {
    await page.click('text=Groups');
    
    // Wait for groups list to load
    await page.waitForSelector('.resource-grid, .empty-state', { timeout: 10000 });
    
    // Check that we're on the groups page
    await expect(page.locator('h2')).toContainText('Groups');
    
    // Check for create button
    await expect(page.locator('button:has-text("Create Group")')).toBeVisible();
  });

  test('should create a new group', async ({ page }) => {
    await page.click('text=Groups');
    await page.click('text=Create Group');
    
    // Fill in group form
    await page.fill('input[name="displayName"]', 'Test Group E2E');
    await page.fill('textarea[name="description"]', 'Test group created via E2E test');
    await page.click('button[type="submit"]');
    
    // Should show success message or redirect to groups list
    await expect(page.locator('text=Group created successfully, .resource-grid, .empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('should display entitlements list', async ({ page }) => {
    await page.click('text=Entitlements');
    
    // Wait for entitlements list to load
    await page.waitForSelector('.resource-grid, .empty-state', { timeout: 10000 });
    
    // Check that we're on the entitlements page
    await expect(page.locator('h2')).toContainText('Entitlements');
    
    // Check for create button
    await expect(page.locator('button:has-text("Create Entitlement")')).toBeVisible();
  });

  test('should create a new entitlement', async ({ page }) => {
    await page.click('text=Entitlements');
    await page.click('text=Create Entitlement');
    
    // Fill in entitlement form
    await page.fill('input[name="displayName"]', 'Test License E2E');
    await page.selectOption('select[name="type"]', 'License');
    await page.fill('textarea[name="description"]', 'Test entitlement created via E2E test');
    await page.click('button[type="submit"]');
    
    // Should show success message or redirect to entitlements list
    await expect(page.locator('text=Entitlement created successfully, .resource-grid, .empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('should display roles list', async ({ page }) => {
    await page.click('text=Roles');
    
    // Wait for roles list to load
    await page.waitForSelector('.resource-grid, .empty-state', { timeout: 10000 });
    
    // Check that we're on the roles page
    await expect(page.locator('h2')).toContainText('Roles');
    
    // Check for create button
    await expect(page.locator('button:has-text("Create Role")')).toBeVisible();
  });

  test('should create a new role', async ({ page }) => {
    await page.click('text=Roles');
    await page.click('text=Create Role');
    
    // Fill in role form
    await page.fill('input[name="displayName"]', 'Test Role E2E');
    await page.fill('input[name="type"]', 'Custom');
    await page.fill('textarea[name="description"]', 'Test role created via E2E test');
    await page.click('button[type="submit"]');
    
    // Should show success message or redirect to roles list
    await expect(page.locator('text=Role created successfully, .resource-grid, .empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('should handle form validation', async ({ page }) => {
    await page.click('text=Users');
    await page.click('text=Create User');
    
    // Try to submit without required fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('.error-message, [aria-invalid="true"]')).toBeVisible();
  });

  test('should handle navigation between sections', async ({ page }) => {
    // Test navigation to each section
    const sections = ['Users', 'Groups', 'Entitlements', 'Roles'];
    
    for (const section of sections) {
      await page.click(`text=${section}`);
      await page.waitForSelector('.resource-grid, .empty-state', { timeout: 5000 });
      await expect(page.locator('h2')).toContainText(section);
    }
  });

  test('should display server configuration', async ({ page }) => {
    await page.click('text=Server Config');
    
    // Wait for server config to load
    await page.waitForSelector('.reqres-accordion', { timeout: 10000 });
    
    // Check that we're on the server config page
    await expect(page.locator('h1')).toContainText('Server Configuration');
  });

  test('should handle error conditions gracefully', async ({ page }) => {
    // Navigate back to config page
    await page.goto('/');
    
    // Test with invalid API key
    await page.fill('input[name="endpoint"]', 'http://localhost:7001/scim-identifier/test-hr-server/scim/v2');
    await page.fill('input[name="apiKey"]', 'invalid-key');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });
  });

  test('should display request/response panels', async ({ page }) => {
    await page.click('text=Users');
    
    // Wait for content to load
    await page.waitForSelector('.resource-grid, .empty-state', { timeout: 10000 });
    
    // Check for request/response panel
    await expect(page.locator('.req-res-panel, .reqres-accordion')).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    await page.click('text=Users');
    
    // Should show loading state initially
    await expect(page.locator('.loading-spinner, .spinner')).toBeVisible({ timeout: 5000 });
    
    // Should eventually show content
    await expect(page.locator('.resource-grid, .empty-state')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Configure client
    await page.fill('input[name="endpoint"]', 'http://localhost:7001/scim-identifier/test-hr-server/scim/v2');
    await page.fill('input[name="apiKey"]', 'api-key-12345');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForSelector('.sidebar-nav', { timeout: 10000 });
    
    // Test navigation on mobile
    await page.click('text=Users');
    await page.waitForSelector('.resource-grid, .empty-state', { timeout: 10000 });
    
    // Should be able to navigate and see content
    await expect(page.locator('h2')).toContainText('Users');
  });
});