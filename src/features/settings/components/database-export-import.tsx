import { useState } from 'react'
import { 
  Download, 
  Upload, 
  Database, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  Loader2,
  Info,
  Shield,
  HardDrive
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

// Type definitions
interface DatabaseStats {
  totalTables: number
  tables: Record<string, number>
  totalRecords: number
  databaseSize: number
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sheets: Record<string, any>
  summary: {
    totalSheets: number
    matchingTables: number
    extraSheets: number
    missingTables: number
  }
}

interface ImportResult {
  imported: number
  errors: number
  tables: Record<string, any>
  backupPath: string
  totalSheets: number
  errorDetails: Array<{
    table: string
    error: string
    rowData?: any
    errorType: string
  }>
}


export function DatabaseExportImport() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [showImportResultDialog, setShowImportResultDialog] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [importProgress, setImportProgress] = useState(0)


  // Load database stats on component mount
  const loadStats = async () => {
    try {
      const result = await window.electronAPI?.invoke('database:getStats')
      if (result?.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error loading database stats:', error)
    }
  }

  // Export database to Excel
  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await window.electronAPI?.invoke('database:export')
      
      clearInterval(progressInterval)
      setExportProgress(100)

      if (result.success) {
        // Create download link
        const blob = new Blob([
          Uint8Array.from(atob(result.data.buffer), c => c.charCodeAt(0))
        ], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.data.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success('Database exported successfully!', {
          description: `Exported ${result.data.tablesExported} tables to ${result.data.filename}`,
        })
        
        // Refresh stats
        await loadStats()
      } else {
        throw new Error(result.error || 'Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  // Select and validate Excel file
  const handleSelectAndValidateFile = async () => {
    setIsValidating(true)
    
    try {
      // Use Electron's dialog to select file
      const result = await window.electronAPI?.invoke('database:selectFile')
      
      if (result?.success && result.data?.filePath) {
        const filePath = result.data.filePath
        
        // Validate the selected file
        const validationResult = await window.electronAPI?.invoke('database:validateFile', filePath)
        
        if (validationResult?.success) {
          setValidationResult(validationResult.data)
          setShowValidationDialog(true)
          
          // Store the file path for import
          setSelectedFilePath(filePath)
        } else {
          throw new Error(validationResult?.error || 'Validation failed')
        }
      } else if (result?.success === false) {
        // User cancelled file selection
        toast.info('File selection cancelled')
      } else {
        throw new Error('Failed to select file')
      }
    } catch (error) {
      console.error('File selection/validation error:', error)
      toast.error('File selection failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsValidating(false)
    }
  }

  // Import database from Excel
  const handleImport = async () => {
    if (!selectedFilePath) {
      toast.error('No file selected', {
        description: 'Please select a file first using the "Select & Validate" button.',
      })
      return
    }

    setIsImporting(true)
    setImportProgress(0)
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 15, 90))
      }, 300)

      const result = await window.electronAPI?.invoke('database:import', { filePath: selectedFilePath, options: {} })
      
      clearInterval(progressInterval)
      setImportProgress(100)

      if (result?.success) {
        setImportResult(result.data)
        setShowImportResultDialog(true)
        
        toast.success('Database imported successfully!', {
          description: `Imported ${result.data.imported} records with ${result.data.errors} errors`,
        })
        
        // Refresh stats
        await loadStats()
      } else {
        throw new Error(result?.error || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsImporting(false)
      setImportProgress(0)
      setSelectedFilePath(null)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Database Statistics Card */}
      <Card className='p-4'>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Statistics
          </CardTitle>
          <CardDescription>
            Current database information and health status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.totalTables}</div>
                <div className="text-sm text-muted-foreground">Tables</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.totalRecords.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{formatFileSize(stats.databaseSize)}</div>
                <div className="text-sm text-muted-foreground">Database Size</div>
              </div>
              <div className="text-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadStats}
                  className="mt-1"
                >
                  <HardDrive className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Button onClick={loadStats} variant="outline">
                <Database className="h-4 w-4 mr-2" />
                Load Statistics
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export/Import Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Section */}
        <Card className='p-4'>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              Export Database
            </CardTitle>
            <CardDescription>
              Export your complete database to an Excel file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This will create an Excel file with all your data organized in separate sheets for each table.
              </AlertDescription>
            </Alert>
            
            {isExporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Exporting database...</span>
                  <span>{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="w-full" />
              </div>
            )}
            
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full"
              size="lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card className='p-4'>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Import Database
            </CardTitle>
            <CardDescription>
              Import data from an Excel file to update your database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                A backup will be created automatically before importing. Existing data may be overwritten.
                Use exported Excel files for best compatibility.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Button 
                onClick={handleSelectAndValidateFile}
                disabled={isValidating}
                className="w-full"
                size="lg"
                variant="outline"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Selecting & Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Select & Validate Excel File
                  </>
                )}
              </Button>
              
              {selectedFilePath && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200">
                    File Selected: {selectedFilePath.split('/').pop()}
                  </div>
                  
                  {isImporting && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Importing database...</span>
                        <span>{importProgress}%</span>
                      </div>
                      <Progress value={importProgress} className="w-full" />
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleImport}
                    disabled={isImporting}
                    className="w-full mt-2"
                    size="sm"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Database
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Validation Results Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {validationResult?.errors?.length === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              File Validation Results
            </DialogTitle>
            <DialogDescription>
              {validationResult?.errors?.length === 0 
                ? 'The Excel file structure matches your database schema perfectly. You can proceed with the import.'
                : 'The Excel file has some missing columns that will be set to default values. You can still proceed with the import.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {validationResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-semibold">{validationResult.summary.totalSheets}</div>
                  <div className="text-sm text-muted-foreground">Total Sheets</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">{validationResult.summary.matchingTables}</div>
                  <div className="text-sm text-muted-foreground">Valid Tables</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <div className="text-lg font-semibold text-yellow-600">{validationResult.summary.extraSheets}</div>
                  <div className="text-sm text-muted-foreground">Extra Sheets</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-lg font-semibold text-red-600">{validationResult.summary.missingTables}</div>
                  <div className="text-sm text-muted-foreground">Missing Tables</div>
                </div>
              </div>

              {/* Critical Errors */}
              {validationResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Critical errors found:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    <div className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">Missing Columns (Will be set to default values):</div>
                    <ul className="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-300">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <strong>Note:</strong> These columns will be automatically set to their default values during import.
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Sheet Details */}
              <div className="space-y-2">
                <h4 className="font-semibold">Sheet Details:</h4>
                {Object.entries(validationResult.sheets).map(([sheetName, sheetInfo]) => (
                  <div key={sheetName} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{sheetName}</span>
                      <div className="flex gap-2">
                        {sheetInfo.exists && (
                          <Badge variant="default">Valid Table</Badge>
                        )}
                        {sheetInfo.hasData && (
                          <Badge variant="secondary">{sheetInfo.rowCount} rows</Badge>
                        )}
                      </div>
                    </div>
                    {sheetInfo.errors && sheetInfo.errors.length > 0 && (
                      <div className="text-sm text-red-600">
                        {sheetInfo.errors.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                setShowValidationDialog(false)
                handleImport()
              }}
              disabled={isImporting}
              variant={(validationResult?.errors?.length ?? 0) > 0 ? "destructive" : "default"}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {(validationResult?.errors?.length ?? 0) > 0 ? 'Import Anyway' : 'Import Database'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Results Dialog */}
      <Dialog open={showImportResultDialog} onOpenChange={setShowImportResultDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(importResult?.errors ?? 0) > 0 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              Import Results
            </DialogTitle>
            <DialogDescription>
              {(importResult?.errors ?? 0) > 0 
                ? `Import completed with ${importResult?.errors} error(s). Review the details below.`
                : 'Import operation completed successfully. Review the results below.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {importResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">{importResult.imported}</div>
                  <div className="text-sm text-muted-foreground">Records Imported</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-lg font-semibold text-red-600">{importResult.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">{importResult.totalSheets}</div>
                  <div className="text-sm text-muted-foreground">Sheets Processed</div>
                </div>
              </div>

              {/* Backup Info */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">Database Backup Created</div>
                  <div className="text-sm">Backup saved to: {importResult.backupPath}</div>
                </AlertDescription>
              </Alert>

              {/* Table Results */}
              <div className="space-y-2">
                <h4 className="font-semibold">Table Results:</h4>
                {Object.entries(importResult.tables).map(([tableName, tableResult]) => (
                  <div key={tableName} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{tableName}</span>
                      <div className="flex gap-2">
                        <Badge variant="default">{tableResult.imported} imported</Badge>
                        {tableResult.errors > 0 && (
                          <Badge variant="destructive">{tableResult.errors} errors</Badge>
                        )}
                      </div>
                    </div>
                    {tableResult.message && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {tableResult.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Detailed Error Information */}
              {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-600">Error Details:</h4>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-3">
                        {importResult.errorDetails.map((errorDetail, index) => (
                          <div key={index} className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex items-start justify-between mb-2">
                              <div className="font-semibold text-red-800 dark:text-red-200">
                                Table: {errorDetail.table}
                              </div>
                              <Badge variant="destructive" className="text-xs">
                                {errorDetail.errorType}
                              </Badge>
                            </div>
                            <div className="text-sm text-red-700 dark:text-red-300 mb-2">
                              <strong>Error:</strong> {errorDetail.error}
                            </div>
                            {errorDetail.rowData && (
                              <div className="text-xs text-red-600 dark:text-red-400">
                                <strong>Row Data:</strong> {JSON.stringify(errorDetail.rowData, null, 2)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowImportResultDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
