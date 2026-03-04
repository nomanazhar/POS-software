const Database = require('better-sqlite3');

// Test the category product count query
function testCategoryProductCount() {
  try {
    const db = new Database('app-data.db');
    
    console.log('=== Testing Category Product Count Query ===');
    
    // Test the query
    const result = db.prepare(`
      SELECT 
        c.*,
        COALESCE(p.product_count, 0) as products_count
      FROM categories c
      LEFT JOIN (
        SELECT 
          category_unique_id,
          COUNT(*) as product_count
        FROM products
        GROUP BY category_unique_id
      ) p ON c.category_unique_id = p.category_unique_id
      ORDER BY c.category_id ASC
    `).all();
    
    console.log('Query result:');
    result.forEach(category => {
      console.log(`Category: ${category.category_name} - Products: ${category.products_count}`);
    });
    
    // Also test the products table to see what categories exist
    console.log('\n=== Products by Category ===');
    const productsByCategory = db.prepare(`
      SELECT 
        c.category_name,
        COUNT(p.product_id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.category_unique_id = p.category_unique_id
      GROUP BY c.category_id, c.category_name
      ORDER BY c.category_id
    `).all();
    
    productsByCategory.forEach(item => {
      console.log(`${item.category_name}: ${item.product_count} products`);
    });
    
    db.close();
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCategoryProductCount();
