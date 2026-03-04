// Test script to verify unique_id implementation for categories
const Database = require('better-sqlite3');
const path = require('path');

// Path to the database
const dbPath = path.join(__dirname, 'app-data.db');
console.log('Testing database at:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('\n=== Testing Categories Table Schema ===');
  const tableInfo = db.prepare("PRAGMA table_info(categories)").all();
  console.log('Categories table columns:', tableInfo.map(col => col.name));
  
  console.log('\n=== Testing Categories Data ===');
  const categories = db.prepare('SELECT * FROM categories LIMIT 5').all();
  console.log('Sample categories:', categories);
  
  console.log('\n=== Testing Unique ID Generation ===');
  // Test inserting a new category
  const testCategory = {
    categoryId: `test-cat-${Date.now()}`,
    unique_id: `1_1_${Date.now()}`,
    categoryName: 'Test Category',
    description: 'Test category for unique_id verification',
    status: 'active',
    icon: 'test',
    added_By: 'test',
    company_id: '1',
    branch_id: '1'
  };
  
  const insertStmt = db.prepare(`
    INSERT INTO categories (
      categoryId, unique_id, categoryName, description, status, icon, 
      added_By, company_id, branch_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = insertStmt.run(
    testCategory.categoryId,
    testCategory.unique_id,
    testCategory.categoryName,
    testCategory.description,
    testCategory.status,
    testCategory.icon,
    testCategory.added_By,
    testCategory.company_id,
    testCategory.branch_id
  );
  
  console.log('Insert result:', result);
  
  // Verify the inserted category
  const insertedCategory = db.prepare('SELECT * FROM categories WHERE categoryId = ?').get(testCategory.categoryId);
  console.log('Inserted category:', insertedCategory);
  
  // Clean up test data
  db.prepare('DELETE FROM categories WHERE categoryId = ?').run(testCategory.categoryId);
  console.log('Test category cleaned up');
  
  db.close();
  console.log('\n=== Test completed successfully ===');
  
} catch (error) {
  console.error('Test failed:', error);
} 