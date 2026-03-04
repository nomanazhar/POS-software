import { useEffect, useState } from 'react';

export function DebugAccountData() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        // Replace with actual customer account unique ID from your test case
        const accountUniqueId = '1_1_1758621724344'; 
        
        if (window.electronAPI) {
          const result = await window.electronAPI.invoke('debug:getCustomerTransactionData', accountUniqueId);
          console.log('[FRONTEND DEBUG] Customer transaction data:', result);
          
          if (result.success) {
            setData(result.data);
          } else {
            setError(result.error || 'Failed to fetch data');
          }
        }
      } catch (err) {
        console.error('[FRONTEND DEBUG] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    fetchAccountData();
  }, []);

  if (error) {
    return <div className="p-4 bg-red-100 text-red-800">Error: {error}</div>;
  }

  if (!data) {
    return <div className="p-4 bg-gray-100 text-gray-800">Loading...</div>;
  }

  return (
    <div className="p-4 bg-blue-100 text-blue-800 hidden">
      <h3 className="font-bold mb-2">Debug Account Transaction Data</h3>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
