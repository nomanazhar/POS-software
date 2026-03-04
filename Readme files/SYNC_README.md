# Database Sync System

## Overview
This system provides robust database synchronization between local SQLite and remote PostgreSQL databases for the MartPOS application.

## Features

### 🔄 Automatic Sync
- **Full Database Export**: Exports all tables as SQL statements
- **Conflict Detection**: Detects potential data conflicts
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Handling**: Comprehensive error handling and user feedback

### 📊 Sync Components

#### 1. Sync Button (`src/components/sync-button.tsx`)
- Located in the sales interface header
- Quick sync functionality with dropdown menu
- Visual indicators for sync status and conflicts
- Last sync time display

#### 2. Sync Service (`src/lib/sync-service.ts`)
- Core sync logic with retry mechanism
- Database export functionality
- Conflict detection
- API communication with backend

#### 3. Sync Dialog (`src/components/sync-dialog.tsx`)
- Detailed sync interface
- Progress tracking
- Table-by-table status
- Sync history and results

#### 4. Sync Status (`src/components/sync-status.tsx`)
- Compact status display
- Real-time sync information
- Conflict warnings

## Database Tables Synced

The system syncs the following tables:
- `categories` - Product categories
- `products` - Product information
- `customers` - Customer data
- `suppliers` - Supplier information
- `bills` - Sales bills
- `bill_items` - Bill line items
- `inventory` - Inventory management
- `purchases` - Purchase orders
- `purchase_items` - Purchase line items
- `sales` - Sales transactions
- `sales_items` - Sales line items
- `users` - User accounts

## API Integration

### Endpoint
```
POST https://martpos.tfourplus.com/api/get-sql-data
```

### Request Format
```json
{
  "sqlData": "SQL dump string",
  "user": "username",
  "companyId": "company_id",
  "timestamp": "2024-01-01T10:00:00Z",
  "syncType": "full",
  "attempt": 1
}
```

### Response Format
```json
{
  "success": true,
  "message": "SQL executed successfully",
  "data": "Select * FROM users"
}
```

## Usage

### Quick Sync
1. Click the "Sync DB" button in the sales interface header
2. Select "Quick Sync" from the dropdown menu
3. Monitor the sync progress

### Detailed Sync
1. Click the "Sync DB" button
2. Select "Sync Settings" from the dropdown
3. Review sync status and table information
4. Click "Sync Now" to start synchronization

## Configuration

### Sync Service Configuration
```typescript
const config = {
  maxRetries: 3,        // Maximum retry attempts
  retryDelay: 2000,     // Delay between retries (ms)
  timeout: 30000        // API request timeout (ms)
};
```

### Conflict Detection
- Detects recent activity within 1 minute of last sync
- Warns about potential data conflicts
- Recommends sync when conflicts are detected

## Error Handling

### Network Errors
- Automatic retry with exponential backoff
- User-friendly error messages
- Detailed error logging

### Data Errors
- Graceful handling of missing tables
- Continues sync even if some tables fail
- Reports partial sync results

### Authentication Errors
- Validates user authentication before sync
- Prevents sync for unauthenticated users

## Security

### Data Protection
- SQL injection prevention through proper escaping
- User authentication validation
- Secure API communication

### Privacy
- Only syncs necessary business data
- No sensitive information in logs
- User consent for data transmission

## Monitoring

### Sync Status Indicators
- 🟢 Green: Successfully synced
- 🟡 Yellow: Conflicts detected
- 🔴 Red: Sync failed
- 🔵 Blue: Currently syncing

### Logging
- Console logging for debugging
- User notifications via toast messages
- Sync history tracking

## Troubleshooting

### Common Issues

1. **Sync Fails Immediately**
   - Check internet connection
   - Verify API endpoint accessibility
   - Ensure user authentication

2. **Partial Sync**
   - Check table permissions
   - Verify database schema
   - Review error logs

3. **Conflicts Detected**
   - Sync more frequently
   - Check for concurrent users
   - Review recent activity

### Debug Mode
Enable detailed logging by setting:
```javascript
localStorage.setItem('debug-sync', 'true');
```

## Future Enhancements

- [ ] Incremental sync support
- [ ] Real-time sync notifications
- [ ] Sync scheduling
- [ ] Data compression
- [ ] Offline queue support
- [ ] Multi-branch sync
- [ ] Sync analytics dashboard 