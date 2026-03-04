import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ZoomControls() {
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    // Load saved zoom level from localStorage
    const savedZoom = localStorage.getItem('zoomLevel');
    if (savedZoom) {
      const zoom = parseInt(savedZoom, 10);
      applyZoom(zoom);
    }
  }, []);

  const applyZoom = (zoom: number) => {
    // Limit zoom between 50% and 200%
    const newZoom = Math.min(Math.max(zoom, 50), 200);
    document.documentElement.style.zoom = `${newZoom}%`;
    setZoomLevel(newZoom);
    localStorage.setItem('zoomLevel', newZoom.toString());
  };

  const zoomIn = () => applyZoom(zoomLevel + 10);
  const zoomOut = () => applyZoom(zoomLevel - 10);
  const resetZoom = () => applyZoom(100);

  return (
    <div className="flex items-center gap-1 border-2 border-white rounded-md ml-10 px-6">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={zoomOut}
        title="Zoom Out"
        className="h-8 w-8"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={resetZoom}
        title="Reset Zoom"
        className="h-8 px-2 text-xs"
      >
        {zoomLevel}%
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={zoomIn}
        title="Zoom In"
        className="h-8 w-8"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}
