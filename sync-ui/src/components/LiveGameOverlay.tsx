import React, { useState, useEffect } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../stores/appStore';
import { LiveGameResponse } from '../types/live-game';
import { Monitor, Minimize2, Maximize2, Eye, EyeOff } from 'lucide-react';

interface OverlaySettings {
  opacity: number;
  size: 'small' | 'medium' | 'large';
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  alwaysOnTop: boolean;
  autoHide: boolean;
}

const LiveGameOverlay: React.FC = () => {
  const { summonerData } = useAppStore();
  const [overlayWindow, setOverlayWindow] = useState<WebviewWindow | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>({
    opacity: 0.9,
    size: 'medium',
    position: 'top-right',
    alwaysOnTop: true,
    autoHide: false
  });

  // Query for live game status
  const { data: liveGameData, isLoading } = useQuery({
    queryKey: ['liveGameOverlay', summonerData?.puuid],
    queryFn: async (): Promise<LiveGameResponse | null> => {
      if (!summonerData?.puuid) return null;
      
      const response = await fetch(
        `http://localhost:8000/api/v1/live-games/status/${summonerData.puuid}?region=${summonerData.region}`
      );
      
      if (response.status === 404) {
        return null; // Player not in game
      }
      
      if (!response.ok) {
        throw new Error('Failed to check live game status');
      }
      
      return response.json();
    },
    enabled: !!summonerData?.puuid && isOverlayVisible,
    refetchInterval: isOverlayVisible ? 15000 : false, // Refresh every 15 seconds when overlay is visible
    retry: false
  });

  // Create overlay window
  const createOverlay = async () => {
    try {
      const { width, height } = getOverlaySize(overlaySettings.size);
      const { x, y } = await getOverlayPosition(overlaySettings.position, width, height);

      const window = new WebviewWindow('live-game-overlay', {
        url: '/overlay',
        title: 'GameLytics AI - Live Game Overlay',
        width,
        height,
        x,
        y,
        resizable: true,
        alwaysOnTop: overlaySettings.alwaysOnTop,
        decorations: false,
        transparent: true,
        skipTaskbar: true,
        visible: false // Start hidden, then show after setup
      });

      // Wait for window to be ready
      await window.once('tauri://created', () => {
        console.log('Overlay window created');
      });

      await window.once('tauri://error', (e) => {
        console.error('Failed to create overlay window:', e);
      });

      // Set opacity (Note: this method may not be available in all Tauri versions)
      // await window.setOpacity(overlaySettings.opacity);

      // Show window
      await window.show();
      await window.setFocus();

      setOverlayWindow(window);
      setIsOverlayVisible(true);

      // Send initial data to overlay
      if (liveGameData?.data?.is_in_game) {
        await window.emit('live-game-data', liveGameData.data);
      }

    } catch (error) {
      console.error('Failed to create overlay:', error);
    }
  };

  // Close overlay window
  const closeOverlay = async () => {
    if (overlayWindow) {
      try {
        await overlayWindow.close();
        setOverlayWindow(null);
        setIsOverlayVisible(false);
      } catch (error) {
        console.error('Failed to close overlay:', error);
      }
    }
  };

  // Update overlay data when live game status changes
  useEffect(() => {
    if (overlayWindow && liveGameData?.data) {
      overlayWindow.emit('live-game-data', liveGameData.data);
    }
  }, [overlayWindow, liveGameData]);

  // Handle overlay settings changes
  const updateOverlaySettings = async (newSettings: Partial<OverlaySettings>) => {
    const updatedSettings = { ...overlaySettings, ...newSettings };
    setOverlaySettings(updatedSettings);

    if (overlayWindow) {
      try {
        // Update opacity (Note: this method may not be available in all Tauri versions)
        // if (newSettings.opacity !== undefined) {
        //   await overlayWindow.setOpacity(newSettings.opacity);
        // }

        // Update always on top
        if (newSettings.alwaysOnTop !== undefined) {
          await overlayWindow.setAlwaysOnTop(newSettings.alwaysOnTop);
        }

        // Update size and position (Note: may need proper LogicalSize/LogicalPosition)
        // if (newSettings.size || newSettings.position) {
        //   const { width, height } = getOverlaySize(updatedSettings.size);
        //   const { x, y } = await getOverlayPosition(updatedSettings.position, width, height);
        //   
        //   // These would need to use LogicalSize and LogicalPosition from Tauri
        //   // await overlayWindow.setSize(new LogicalSize(width, height));
        //   // await overlayWindow.setPosition(new LogicalPosition(x, y));
        // }
      } catch (error) {
        console.error('Failed to update overlay settings:', error);
      }
    }
  };

  // Toggle overlay visibility
  const toggleOverlay = async () => {
    if (isOverlayVisible) {
      await closeOverlay();
    } else {
      await createOverlay();
    }
  };

  return (
    <div className="space-y-6">
      {/* Overlay Controls */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-purple-400" />
            Real-time Overlay
            {isOverlayVisible && (
              <Badge variant="outline" className="text-green-400 border-green-500/30">
                Active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Controls */}
          <div className="flex items-center gap-3">
            <Button
              onClick={toggleOverlay}
              className={`${isOverlayVisible 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isOverlayVisible ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Close Overlay
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Launch Overlay
                </>
              )}
            </Button>

            {isOverlayVisible && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => overlayWindow?.minimize()}
                  variant="outline"
                  size="sm"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => overlayWindow?.maximize()}
                  variant="outline"
                  size="sm"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Overlay Settings */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Opacity */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Opacity: {Math.round(overlaySettings.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.1"
                value={overlaySettings.opacity}
                onChange={(e) => updateOverlaySettings({ opacity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Size
              </label>
              <select
                value={overlaySettings.size}
                onChange={(e) => updateOverlaySettings({ size: e.target.value as any })}
                className="w-full p-2 bg-slate-800 border border-slate-600 rounded text-white"
              >
                <option value="small">Small (300x200)</option>
                <option value="medium">Medium (400x300)</option>
                <option value="large">Large (500x400)</option>
              </select>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Position
              </label>
              <select
                value={overlaySettings.position}
                onChange={(e) => updateOverlaySettings({ position: e.target.value as any })}
                className="w-full p-2 bg-slate-800 border border-slate-600 rounded text-white"
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>

            {/* Always on Top */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="alwaysOnTop"
                checked={overlaySettings.alwaysOnTop}
                onChange={(e) => updateOverlaySettings({ alwaysOnTop: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="alwaysOnTop" className="text-sm text-slate-300">
                Always on top
              </label>
            </div>
          </div>

          {/* Status */}
          <div className="pt-4 border-t border-slate-700">
            <div className="text-sm text-slate-400">
              {isLoading && 'Checking live game status...'}
              {liveGameData?.data?.is_in_game && (
                <span className="text-green-400">
                  ✅ Live game detected - Overlay will show enemy analysis
                </span>
              )}
              {liveGameData && !liveGameData.data?.is_in_game && (
                <span className="text-slate-400">
                  ⏳ No active game - Overlay will activate when game starts
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-blue-400 text-lg">How to Use the Overlay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-slate-300">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-blue-400 font-bold">1.</span>
              <span>Launch the overlay before or during a League of Legends game</span>
            </div>
            <div className="flex items-start gap-2 mb-2">
              <span className="text-blue-400 font-bold">2.</span>
              <span>The overlay automatically detects when you're in a live game</span>
            </div>
            <div className="flex items-start gap-2 mb-2">
              <span className="text-blue-400 font-bold">3.</span>
              <span>Enemy team analysis and recommendations appear in real-time</span>
            </div>
            <div className="flex items-start gap-2 mb-2">
              <span className="text-blue-400 font-bold">4.</span>
              <span>Adjust opacity, size, and position to fit your setup</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">5.</span>
              <span>Overlay updates automatically every 15 seconds during games</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
const getOverlaySize = (size: OverlaySettings['size']) => {
  switch (size) {
    case 'small':
      return { width: 300, height: 200 };
    case 'medium':
      return { width: 400, height: 300 };
    case 'large':
      return { width: 500, height: 400 };
    default:
      return { width: 400, height: 300 };
  }
};

const getOverlayPosition = async (
  position: OverlaySettings['position'],
  width: number,
  height: number
) => {
  // Get screen dimensions (would need to implement this with Tauri APIs)
  const screenWidth = 1920; // Default, should get from Tauri
  const screenHeight = 1080; // Default, should get from Tauri
  
  const margin = 20;
  
  switch (position) {
    case 'top-left':
      return { x: margin, y: margin };
    case 'top-right':
      return { x: screenWidth - width - margin, y: margin };
    case 'bottom-left':
      return { x: margin, y: screenHeight - height - margin };
    case 'bottom-right':
      return { x: screenWidth - width - margin, y: screenHeight - height - margin };
    default:
      return { x: screenWidth - width - margin, y: margin };
  }
};

export default LiveGameOverlay;
