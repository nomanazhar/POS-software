import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCloudUpload, IconCheck, IconX, IconRefresh, IconAlertTriangle, IconInbox, IconSettings } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

interface SyncDialogProps {
  trigger?: React.ReactNode;
}

export function SyncDialog({ trigger }: SyncDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [tableStatus, setTableStatus] = useState<Record<string, { count: number; status: 'pending' | 'success' | 'error' }>>({});
  const [selectedTables, setSelectedTables] = useState<Record<string, boolean>>({});
  const user = useAuthStore((state) => state.auth.user);
  const accessToken = useAuthStore((state) => state.auth.accessToken);
  const userId = user?.id;

  useEffect(() => {
    if (open) {
      loadSyncStatus();
    }
  }, [open]);

  const loadSyncStatus = async () => {
    // Per-table sync: lastSync logic removed
    setLastSyncTime(null); // Placeholder, as lastSyncTime is no longer available

    // Per-table sync: conflict detection logic removed
    setHasConflicts(false); // Placeholder, as hasConflicts is no longer available

    // Initialize table status and selection
    const tables = [
      'categories', 'products', 'customers', 'suppliers', 
      'bills', 'bill_items', 'inventory', 'purchases', 
      'purchase_items', 'sales', 'sales_items', 'users'
    ];
    
    const initialStatus: Record<string, { count: number; status: 'pending' | 'success' | 'error' }> = {};
    const initialSelection: Record<string, boolean> = {};
    
    for (const table of tables) {
      try {
        const data = await window.electronAPI?.invoke(`${table}:getAll`) || [];
        initialStatus[table] = { count: data.length, status: 'pending' };
        initialSelection[table] = true; // All tables selected by default
      } catch (error) {
        initialStatus[table] = { count: 0, status: 'error' };
        initialSelection[table] = true; // Still selected by default
      }
    }
    setTableStatus(initialStatus);
    setSelectedTables(initialSelection);
  };

  const handleTableSelectionChange = (tableName: string, checked: boolean) => {
    setSelectedTables(prev => ({
      ...prev,
      [tableName]: checked
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.keys(selectedTables).reduce((acc, table) => {
      acc[table] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setSelectedTables(allSelected);
  };

  const handleDeselectAll = () => {
    const allDeselected = Object.keys(selectedTables).reduce((acc, table) => {
      acc[table] = false;
      return acc;
    }, {} as Record<string, boolean>);
    setSelectedTables(allDeselected);
  };

  const getSelectedTablesCount = () => {
    return Object.values(selectedTables).filter(Boolean).length;
  };

  const handleSync = async () => {
    if (isSyncing || !user) return;
    if (!accessToken) {
      toast.error('No access token found. Please log in.');
      return;
    }
    if (!userId) {
      toast.error('No user ID found.');
      return;
    }

    const selectedTablesList = Object.keys(selectedTables).filter(table => selectedTables[table]);
    if (selectedTablesList.length === 0) {
      toast.error('Please select at least one table to sync.');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncResult(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      const result = await window.electronAPI?.invoke('sync:all', accessToken, userId, selectedTablesList);
      
      clearInterval(progressInterval);
      setSyncProgress(100);
      
      if (result.success) {
        const syncData = result.result;
        setSyncResult({
          success: true,
          message: syncData.message || `Sync completed successfully!`,
          timestamp: syncData.timestamp || new Date().toISOString(),
          recordsSynced: syncData.recordsSynced || 0,
          tablesSynced: syncData.tablesSynced || selectedTablesList.length,
          errors: []
        });

        // Update table status to success for selected tables only
        const updatedStatus = { ...tableStatus };
        selectedTablesList.forEach(table => {
          if (updatedStatus[table]) {
            updatedStatus[table].status = 'success';
          }
        });
        setTableStatus(updatedStatus);

        // Show appropriate message based on sync type
        if (syncData.recordsSynced === 0) {
          toast.success('No updates to sync - database is already up to date!');
        } else {
          toast.success(`Synced ${syncData.recordsSynced} records from ${syncData.tablesSynced} tables`);
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSyncResult({
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <IconCheck className="h-4 w-4 text-green-600" />;
      case 'error':
        return <IconX className="h-4 w-4 text-red-600" />;
      default:
        return <IconInbox className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8">
            <IconSettings className="h-4 w-4 mr-2" />
            Sync Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconCloudUpload className="h-5 w-5" />
            Database Synchronization
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sync Status Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sync Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${hasConflicts ? 'bg-yellow-500' : lastSyncTime ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-sm font-medium">
                    {hasConflicts ? 'Conflicts Detected' : lastSyncTime ? 'Last Sync Available' : 'Never Synced'}
                  </span>
                </div>
                {lastSyncTime && (
                  <Badge variant="outline" className="text-xs">
                    {lastSyncTime}
                  </Badge>
                )}
              </div>

              {hasConflicts && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <IconAlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    Recent activity detected. Sync recommended to avoid conflicts.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync Progress */}
          {isSyncing && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Sync Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={syncProgress} className="w-full" />
                <div className="text-sm text-muted-foreground">
                  {syncProgress < 100 ? 'Syncing database...' : 'Sync completed!'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Select Tables to Sync</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSelectAll}
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={handleDeselectAll}
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {getSelectedTablesCount()} of {Object.keys(selectedTables).length} tables selected
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(tableStatus).map(([table, status]) => (
                  <div key={table} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTables[table] || false}
                        onCheckedChange={(checked) => handleTableSelectionChange(table, checked as boolean)}
                        className="h-4 w-4"
                      />
                      {getStatusIcon(status.status)}
                      <span className="text-sm font-medium capitalize">
                        {table.replace('_', ' ')}
                      </span>
                    </div>
                    <Badge className={`text-xs ${getStatusColor(status.status)}`}>
                      {status.count} records
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sync Result */}
          {syncResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Last Sync Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className={`flex items-center gap-2 p-2 rounded-md ${
                  syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {syncResult.success ? (
                    <IconCheck className="h-4 w-4 text-green-600" />
                  ) : (
                    <IconX className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {syncResult.message}
                  </span>
                </div>
                {syncResult.dataSize && (
                  <div className="text-xs text-muted-foreground">
                    Data size: {(syncResult.dataSize / 1024).toFixed(2)} KB
                  </div>
                )}
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="text-xs text-red-600">
                    Errors: {syncResult.errors.join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Syncs selected tables to backup server via API
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setOpen(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
              <Button
                onClick={handleSync}
                disabled={isSyncing || !user || getSelectedTablesCount() === 0}
                size="sm"
                className="min-w-[100px]"
              >
                {isSyncing ? (
                  <>
                    <IconRefresh className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <IconCloudUpload className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 