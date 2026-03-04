import React, { useState, useRef } from 'react'
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
import { FileText, Download, Upload, AlertCircle, CheckCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { readAndValidateExcelFile, generateProductTemplate } from '../services/excel-service'
import { ProductImportService, ImportProgress, ImportResult } from '../services/import-service'
import { useProductContext } from '../context/product-context'
import { useCategoryContext } from '@/features/categories/context/category-context'

interface ProductImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductImportDialog({ open, onOpenChange }: ProductImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { refresh: refreshProducts } = useProductContext()
  const { fetchCategories } = useCategoryContext()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setValidationResult(null)
      setImportResult(null)
      setProgress(null)
    }
  }

  const handleDownloadTemplate = () => {
    try {
      generateProductTemplate()
      toast.success('Template downloaded successfully!')
    } catch (error) {
      toast.error('Failed to download template')
      console.error('Error downloading template:', error)
    }
  }

  const handleValidateFile = async () => {
    if (!file) return

    setIsProcessing(true)
    setProgress({ stage: 'validating', message: 'Validating file...', progress: 10 })

    try {
      const result = await readAndValidateExcelFile(file)
      setValidationResult(result)
      
      if (result.isValid) {
        toast.success(`File validated successfully! Found ${result.data.length} products to import.`)
      } else {
        toast.error('File validation failed. Please check the errors.')
      }
    } catch (error) {
      toast.error('Failed to validate file')
      console.error('Error validating file:', error)
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  const handleImport = async () => {
    if (!validationResult || !validationResult.isValid) return

    setIsProcessing(true)
    setImportResult(null)

    const importService = new ProductImportService((progressUpdate) => {
      setProgress(progressUpdate)
    })

    try {
      const result = await importService.importProducts(validationResult)
      setImportResult(result)
      
      if (result.success) {
        toast.success(`Successfully imported ${result.importedCount} products!`)
        await refreshProducts()
        await fetchCategories()
        // Close dialog after successful import
        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        toast.error('Import failed. Please check the errors.')
      }
    } catch (error) {
      toast.error('Import failed')
      console.error('Error during import:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setValidationResult(null)
    setImportResult(null)
    setProgress(null)
    setIsProcessing(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onOpenChange(false)
  }

  // const getProgressColor = (stage: ImportProgress['stage']) => {
  //   switch (stage) {
  //     case 'validating': return 'bg-blue-500'
  //     case 'creating_categories': return 'bg-yellow-500'
  //     case 'importing_products': return 'bg-green-500'
  //     case 'completed': return 'bg-green-600'
  //     case 'error': return 'bg-red-500'
  //     default: return 'bg-gray-500'
  //   }
  // }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Products
          </DialogTitle>
          <DialogDescription>
            Import products from an Excel file. Download the template first to ensure proper formatting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
         
          <div className='w-full'>
          {/* File Selection Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Step 2: Select File</h4>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isProcessing}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isProcessing}
              >
                <FileText className="h-4 w-4 mr-2" />
                Choose Excel File
              </Button>
              {file && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {file.name}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => {
                      setFile(null)
                      setValidationResult(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                  />
                </Badge>
              )}
            </div>
          </div>

           {/* Template Download Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Step 1: Download Template</h4>
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="w-full"
              disabled={isProcessing}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Example Products Template
            </Button>
            
          </div>
          </div>
          {/* Validation Section */}
          {file && !validationResult && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Step 3: Validate File</h4>
              <Button
                onClick={handleValidateFile}
                disabled={isProcessing}
                className="w-full"
              >
                Validate File
              </Button>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Validation Results</h4>
              {validationResult.isValid ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    File is valid! Found {validationResult.data.length} products to import.
                    {validationResult.missingCategories.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Categories to be created:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {validationResult.missingCategories.map((category: string) => (
                            <Badge key={category} variant="outline" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>Validation failed with the following errors:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {validationResult.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Import Section */}
          {validationResult?.isValid && !importResult && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Step 4: Import Products</h4>
              <Button
                onClick={handleImport}
                disabled={isProcessing}
                className="w-full"
              >
                Import {validationResult.data.length} Products
              </Button>
            </div>
          )}

          {/* Progress Section */}
          {progress && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Import Progress</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
                <Progress 
                  value={progress.progress} 
                  className="h-2"
                />
                {progress.errors && progress.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {progress.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Import Results</h4>
              {importResult.success ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>{importResult.message}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {importResult.importedCount} Products
                        </Badge>
                        <Badge variant="outline">
                          {importResult.categoryCount} Categories
                        </Badge>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>{importResult.message}</p>
                      {importResult.errors && (
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {importResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {importResult?.success ? 'Close' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}