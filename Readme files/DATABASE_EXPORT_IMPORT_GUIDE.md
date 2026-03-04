# Database Export/Import Functionality

## Overview

This document describes the comprehensive database export/import functionality implemented in the ShadCN Admin application. The feature allows users to export their complete database to Excel files and import data from Excel files back into the database.

## Features

### 🚀 **Export Functionality**
- **Complete Database Export**: Exports all tables to a single Excel file with separate sheets
- **Automatic File Naming**: Files are named with timestamps for easy identification
- **Progress Tracking**: Real-time progress indicators during export
- **Error Handling**: Robust error handling with user-friendly messages
- **File Download**: Automatic download to user's system

### 📥 **Import Functionality**
- **Excel File Support**: Supports both .xlsx and .xls formats
- **File Validation**: Pre-import validation to check file structure and compatibility
- **Automatic Backup**: Creates database backup before any import operation
- **Transaction Safety**: Uses SQLite transactions for atomic operations
- **Conflict Resolution**: Handles duplicate data with INSERT OR REPLACE
- **Progress Tracking**: Real-time progress indicators during import
- **Detailed Results**: Comprehensive import results with success/error counts

### 🛡️ **Safety Features**
- **Automatic Backup**: Database backup created before every import
- **File Validation**: Validates Excel file structure before import
- **Error Recovery**: Detailed error reporting and recovery options
- **Data Integrity**: Maintains referential integrity during import
- **Rollback Capability**: Can restore from backup if needed

## User Interface

### Location
The database export/import functionality is located in:
**Settings → Appearance → Database Management**

### Components

#### 1. **Database Statistics Card**
- Shows total tables, records, and database size
- Real-time statistics with refresh capability
- Visual indicators for database health

#### 2. **Export Section**
- One-click export button
- Progress bar during export
- Success notifications with file details
- Automatic file download

#### 3. **Import Section**
- File picker for Excel files
- Validation button to check file structure
- Import button with progress tracking
- Safety warnings about data overwriting

#### 4. **Validation Dialog**
- File structure validation results
- Sheet-by-sheet analysis
- Error and warning reporting
- Compatibility checking

#### 5. **Import Results Dialog**
- Detailed import statistics
- Table-by-table results
- Error reporting
- Backup location information

## Technical Implementation

### Backend (Electron Main Process)

#### IPC Handlers
```javascript
// Export database to Excel
ipcMain.handle('database:export', async () => { ... })

// Import database from Excel
ipcMain.handle('database:import', async (event, { filePath, options }) => { ... })

// Validate Excel file structure
ipcMain.handle('database:validateFile', async (event, filePath) => { ... })

// Get database statistics
ipcMain.handle('database:getStats', async () => { ... })
```

#### Key Features
- **XLSX Library**: Uses SheetJS for Excel file operations
- **SQLite Integration**: Direct database access for export/import
- **File System Operations**: Handles file creation, reading, and backup
- **Error Handling**: Comprehensive error catching and reporting
- **Transaction Management**: Atomic operations for data integrity

### Frontend (React Components)

#### Main Component
- `DatabaseExportImport`: Main component with all functionality
- Beautiful UI with cards, progress bars, and dialogs
- Real-time state management
- Toast notifications for user feedback

#### Key Features
- **TypeScript**: Fully typed for better development experience
- **Form Validation**: Zod schema validation for file uploads
- **State Management**: React hooks for complex state handling
- **UI Components**: Uses shadcn/ui components for consistency
- **Error Boundaries**: Graceful error handling and user feedback

## File Structure

### Excel Export Format
```
database-export-YYYY-MM-DDTHH-mm-ss.xlsx
├── Sheet 1: categories
├── Sheet 2: products
├── Sheet 3: accounts
├── Sheet 4: users
├── Sheet 5: transactions
├── Sheet 6: inventory
├── Sheet 7: purchase_orders
├── Sheet 8: bill_orders
├── Sheet 9: quotations
└── Sheet 10: system_settings
```

### Database Tables Exported
- **categories**: Product categories
- **products**: Product information
- **accounts**: Customers, suppliers, and users
- **users**: User accounts and authentication
- **transactions**: Financial transactions
- **inventory**: Stock management
- **purchase_orders**: Purchase data
- **bill_orders**: Sales bills
- **quotations**: Quotation data
- **system_settings**: Application settings

## Usage Instructions

### Exporting Database

1. **Navigate to Settings**
   - Go to Settings → Appearance
   - Scroll down to "Database Management" section

2. **View Statistics**
   - Click "Load Statistics" to see current database info
   - Review table counts and database size

3. **Export Database**
   - Click "Export to Excel" button
   - Wait for progress bar to complete
   - File will automatically download to your system

### Importing Database

1. **Prepare Excel File**
   - Ensure file has correct table structure
   - Use exported file as template if needed
   - Save as .xlsx or .xls format

2. **Start Import Process**
   - Click "Import from Excel" button
   - Select your Excel file
   - Click "Validate" to check file structure

3. **Review Validation**
   - Check validation results dialog
   - Review any errors or warnings
   - Proceed if file is valid

4. **Complete Import**
   - Click "Import" to start the process
   - Monitor progress bar
   - Review import results when complete

## Error Handling

### Common Issues and Solutions

#### Export Errors
- **Database Not Initialized**: Restart the application
- **File System Error**: Check disk space and permissions
- **Memory Error**: Close other applications and try again

#### Import Errors
- **Invalid File Format**: Use .xlsx or .xls format only
- **Missing Tables**: Ensure all required tables are present
- **Column Mismatch**: Check column names match database schema
- **Data Type Errors**: Verify data types match expected format

#### Validation Errors
- **File Not Found**: Check file path and permissions
- **Corrupted File**: Try re-saving the Excel file
- **Schema Mismatch**: Use exported file as template

## Best Practices

### Before Export
- Ensure database is in consistent state
- Close any active transactions
- Free up disk space for export file

### Before Import
- **Always validate file first**
- Create manual backup if needed
- Test with small dataset first
- Review validation results carefully

### After Import
- Verify data integrity
- Check critical business data
- Test application functionality
- Keep backup file for recovery

## Security Considerations

### Data Protection
- Files are processed locally (no cloud upload)
- Automatic backup before import
- Transaction-based operations
- Input validation and sanitization

### File Handling
- Temporary file cleanup
- Secure file path handling
- Permission validation
- Error logging without sensitive data

## Performance Optimization

### Large Databases
- Progress tracking for user feedback
- Chunked processing for large files
- Memory-efficient file handling
- Background processing

### File Size Limits
- Recommended: < 100MB Excel files
- Maximum: Limited by available RAM
- Optimization: Use multiple smaller files if needed

## Troubleshooting

### Application Won't Start
1. Check if database file exists
2. Verify file permissions
3. Restart application
4. Check console for errors

### Export Fails
1. Check disk space
2. Verify database connection
3. Try exporting individual tables
4. Check application logs

### Import Fails
1. Validate file structure first
2. Check file format (.xlsx/.xls)
3. Verify column names match
4. Try importing smaller dataset
5. Check backup file for recovery

### Data Issues After Import
1. Verify import results dialog
2. Check specific table results
3. Restore from backup if needed
4. Re-import with corrected data

## Support and Maintenance

### Logging
- All operations are logged to console
- Error details captured for debugging
- Performance metrics tracked
- User actions recorded

### Updates
- Feature updates through normal app updates
- Database schema changes handled automatically
- Backward compatibility maintained
- Migration scripts provided when needed

## Conclusion

The database export/import functionality provides a robust, user-friendly way to backup and restore your ShadCN Admin database. With comprehensive validation, automatic backups, and detailed error reporting, users can confidently manage their data with minimal risk.

The implementation follows best practices for data integrity, user experience, and system performance, making it a reliable tool for database management in production environments.
