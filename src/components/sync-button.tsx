import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { IconCloudUpload, IconRefresh, IconAlertTriangle, IconSettings, IconChevronDown } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { SyncDialog } from './sync-dialog';

interface SyncButtonProps {
  className?: string;
}

export function SyncButton({ className }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime] = useState<string | null>(null);
  const [hasConflicts, setHasConflicts] = useState(false);
  const user = useAuthStore((state) => state.auth.user);
  const accessToken = useAuthStore((state) => state.auth.accessToken);
  const userId = user?.id;

  // Check for conflicts on mount
  useEffect(() => {
    const checkConflicts = async () => {
      setHasConflicts(false);
    };
    checkConflicts();
  }, []);

  const syncToBackend = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }
    if (!accessToken) {
      toast.error('No access token found. Please log in.');
      return;
    }
    if (!userId) {
      toast.error('No user ID found.');
      return;
    }
    setIsSyncing(true);
    try {
      const result = await window.electronAPI?.invoke('sync:all', accessToken, userId);
      if (result.success) {
        const syncData = result.result;
        if (syncData.recordsSynced === 0) {
          toast.success('No updates to sync - database is already up to date!');
        } else {
          toast.success(`Synced ${syncData.recordsSynced} records from ${syncData.tablesSynced} tables`);
        }
      } else {
        toast.error(`Sync failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    if (isSyncing) return;
    try {
      await syncToBackend();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={isSyncing}
            variant={hasConflicts ? "destructive" : "outline"}
            size="sm"
            className="h-8"
            title={hasConflicts ? "Conflicts detected - sync recommended" : "Sync database to backend"}
          >
            {isSyncing ? (
              <IconRefresh className="h-4 w-4 mr-2 animate-spin" />
            ) : hasConflicts ? (
              <IconAlertTriangle className="h-4 w-4 mr-2" />
            ) : (
              <IconCloudUpload className="h-4 w-4 mr-2" />
            )}
            {isSyncing ? 'Syncing...' : hasConflicts ? 'Sync*' : 'Sync DB'}
            <IconChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleSync} disabled={isSyncing}>
            <IconCloudUpload className="h-4 w-4 mr-2" />
            Quick Sync
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <SyncDialog 
              trigger={
                <div className="flex items-center w-full">
                  <IconSettings className="h-4 w-4 mr-2" />
                  Sync Settings
                </div>
              }
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {lastSyncTime && (
        <span className="text-xs text-muted-foreground">
          Last: {lastSyncTime}
        </span>
      )}
    </div>
  );
} 