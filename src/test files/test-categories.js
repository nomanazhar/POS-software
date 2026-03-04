// Simple test script to verify categories API
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initializeDatabase, getDatabase } = require('../../electron-db.cjs');

// Initialize database
initializeDatabase();
const db = getDatabase();

// Test the categories query directly
function testCategoriesQuery() {
  try {
    console.log('Testing categories query...');
    const result = db.prepare('SELECT * FROM categories ORDER BY category_id ASC').all();
    console.log('Raw result:', result);
    
    // Test serialization
    const serialized = result.map(item => ({
      category_id: item.category_id,
      category_unique_id: item.category_unique_id,
      category_name: item.category_name,
      description: item.description,
      icon: item.icon,
      status: item.status,
      added_by: item.added_by,
      company_id: item.company_id,
      branch_id: item.branch_id,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
    
    console.log('Serialized result:', serialized);
    console.log('JSON.stringify test:', JSON.stringify(serialized));
    console.log('Test passed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCategoriesQuery();
