import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { IconCloudUpload, IconCheck, IconX, IconRefresh, IconAlertTriangle, IconInbox } from '@tabler/icons-react';
import { toast } from 'sonner';

interface SyncStatusProps {
  className?: string;
}

export function SyncStatus({ className }: SyncStatusProps) {
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [syncHistory, setSyncHistory] = useState<Array<{
    timestamp: string;
    success: boolean;
    message: string;
  }>>([]);

  useEffect(() => {
    // Load last sync time
    // Per-table sync: lastSync logic removed

    // Check for conflicts
    // Per-table sync: conflict detection logic removed
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    
    try {
      const result = await window.electronAPI?.invoke('sync:all');
      
      if (result.success) {
        const syncData = result.result;
        // Update sync history
        setSyncHistory(prev => [{
          timestamp: new Date().toLocaleString(),
          success: true,
          message: syncData.message || 'Sync completed successfully'
        }, ...prev.slice(0, 4)]); // Keep last 5 entries

        setLastSyncTime(new Date(syncData.timestamp).toLocaleString());
        setHasConflicts(false);
        
        if (syncData.recordsSynced === 0) {
          toast.success('No updates to sync - database is already up to date!');
        } else {
          toast.success(`Synced ${syncData.recordsSynced} records from ${syncData.tablesSynced} tables`);
        }
      } else {
        setSyncHistory(prev => [{
          timestamp: new Date().toLocaleString(),
          success: false,
          message: result.error || 'Sync failed'
        }, ...prev.slice(0, 4)]);
        toast.error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncHistory(prev => [{
        timestamp: new Date().toLocaleString(),
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }, ...prev.slice(0, 4)]);
      toast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = () => {
    if (isSyncing) return 'bg-blue-500';
    if (hasConflicts) return 'bg-yellow-500';
    if (lastSyncTime) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (isSyncing) return 'Syncing...';
    if (hasConflicts) return 'Conflicts Detected';
    if (lastSyncTime) return 'Synced';
    return 'Never Synced';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <IconCloudUpload className="h-4 w-4" />
          Database Sync Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            size="sm"
            variant="outline"
            className="h-7"
          >
            {isSyncing ? (
              <IconRefresh className="h-3 w-3 animate-spin" />
            ) : (
              <IconCloudUpload className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Last Sync Time */}
        {lastSyncTime && (
          <div className="text-xs text-muted-foreground">
            Last sync: {lastSyncTime}
          </div>
        )}

        {/* Conflict Warning */}
        {hasConflicts && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <IconAlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-xs text-yellow-800">
              Recent activity detected. Sync recommended.
            </span>
          </div>
        )}

        {/* Sync History */}
        {syncHistory.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Recent Syncs:</div>
            {syncHistory.map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {entry.success ? (
                  <IconCheck className="h-3 w-3 text-green-600" />
                ) : (
                  <IconX className="h-3 w-3 text-red-600" />
                )}
                <span className="text-muted-foreground">{entry.timestamp}</span>
                <span className={entry.success ? 'text-green-600' : 'text-red-600'}>
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <IconInbox className="h-4 w-4 text-blue-600" />
          <span className="text-xs text-blue-800">
            Syncs all local data to backup server
          </span>
        </div>
      </CardContent>
    </Card>
  );
} 