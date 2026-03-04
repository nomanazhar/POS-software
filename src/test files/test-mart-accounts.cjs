const { app } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

// Test the mart account system
async function testMartAccounts() {
  console.log('=== TESTING MART ACCOUNT SYSTEM ===');
  
  const dbPath = path.join(__dirname, 'app-data.db');
  const db = new Database(dbPath);
  
  try {
    // 1. Check if mart accounts exist
    console.log('\n1. Checking mart accounts...');
    const martAccounts = db.prepare('SELECT * FROM accounts WHERE account_type IN (?, ?, ?)').all('cash', 'bank', 'ledger');
    console.log('Mart accounts found:', martAccounts.length);
    martAccounts.forEach(acc => {
      console.log(`- ${acc.fullname} (${acc.account_type}): Balance = ${acc.balance}`);
    });
    
    // 2. Check transactions
    console.log('\n2. Checking transactions...');
    const transactions = db.prepare('SELECT * FROM transactions ORDER BY transaction_id DESC LIMIT 10').all();
    console.log('Recent transactions:', transactions.length);
    transactions.forEach(txn => {
      console.log(`- ${txn.order_type} ${txn.order_no}: ${txn.account_unique_id} | Credit: ${txn.credit}, Debit: ${txn.debit}`);
    });
    
    // 3. Test account balance calculation
    console.log('\n3. Testing balance calculation...');
    const accountBalances = db.prepare(`
      SELECT 
        a.account_unique_id,
        a.fullname,
        a.account_type,
        a.total_credit,
        a.total_debit,
        a.balance,
        COALESCE(SUM(t.credit), 0) as calc_credit,
        COALESCE(SUM(t.debit), 0) as calc_debit,
        COALESCE(SUM(t.credit), 0) - COALESCE(SUM(t.debit), 0) as calc_balance
      FROM accounts a
      LEFT JOIN transactions t ON a.account_unique_id = t.account_unique_id
      GROUP BY a.account_unique_id
      ORDER BY a.account_type, a.account_id
    `).all();
    
    console.log('Account balances:');
    accountBalances.forEach(acc => {
      const balanceMatch = Math.abs(acc.balance - acc.calc_balance) < 0.01;
      console.log(`- ${acc.fullname} (${acc.account_type}):`);
      console.log(`  Stored: Credit=${acc.total_credit}, Debit=${acc.total_debit}, Balance=${acc.balance}`);
      console.log(`  Calculated: Credit=${acc.calc_credit}, Debit=${acc.calc_debit}, Balance=${acc.calc_balance}`);
      console.log(`  Match: ${balanceMatch ? '✅' : '❌'}`);
    });
    
    // 4. Test mart account flow simulation
    console.log('\n4. Testing mart account flow...');
    
    // Simulate a bill transaction
    const testBill = {
      billId: 'TEST-001',
      customerId: '1_1_cust_001',
      martAccountId: '1_1_cash_account',
      totalAmount: 1000,
      paidAmount: 600,
      balance: 400
    };
    
    console.log(`Simulating bill: ${testBill.billId}`);
    console.log(`- Total: ${testBill.totalAmount}`);
    console.log(`- Paid: ${testBill.paidAmount} (cash)`);
    console.log(`- Outstanding: ${testBill.balance}`);
    
    // Check if we can find related transactions
    const billTransactions = db.prepare(`
      SELECT * FROM transactions 
      WHERE order_no = ? AND order_type = 'bill'
      ORDER BY transaction_id
    `).all(testBill.billId);
    
    if (billTransactions.length > 0) {
      console.log('Found bill transactions:');
      billTransactions.forEach(txn => {
        console.log(`- ${txn.account_unique_id}: Credit=${txn.credit}, Debit=${txn.debit}`);
      });
    } else {
      console.log('No transactions found for test bill (this is expected for a simulation)');
    }
    
    console.log('\n=== MART ACCOUNT SYSTEM TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Error testing mart accounts:', error);
  } finally {
    db.close();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMartAccounts();
}

module.exports = { testMartAccounts };
