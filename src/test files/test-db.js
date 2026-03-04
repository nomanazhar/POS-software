const { initializeDatabase } = require('../../electron-db.cjs');

try {
  console.log('Testing database initialization...');
  const db = initializeDatabase();
  
  console.log('\nDatabase tables created:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  tables.forEach(t => console.log('- ' + t.name));
  
  console.log('\nChecking categories table:');
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  console.log('Categories count:', categoryCount.count);
  
  console.log('\nChecking accounts table:');
  const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get();
  console.log('Accounts count:', accountCount.count);
  
  console.log('\nChecking products table:');
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  console.log('Products count:', productCount.count);
  
  console.log('\nDatabase initialization successful!');
  db.close();
} catch (error) {
  console.error('Error testing database:', error);
}
