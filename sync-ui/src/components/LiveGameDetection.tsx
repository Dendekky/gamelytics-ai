import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { useAppStore } from '../stores/appStore';
import { 
  LiveGameResponse, 
  EnemyPlayerAnalysis,
  THREAT_LEVEL_COLORS,
  THREAT_LEVEL_BACKGROUNDS
} from '../types/live-game';
import { getChampionNameById } from '../lib/champions';
import { Activity, Eye, Sword, Shield, Target, Users, AlertTriangle } from 'lucide-react';
import LiveGameOverlay from './LiveGameOverlay';

const LiveGameDetection: React.FC = () => {
  const { summonerData } = useAppStore();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);

  // Query for live game status
  const { data: liveGameData, isLoading, error, refetch } = useQuery({
    queryKey: ['liveGame', summonerData?.puuid],
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
    enabled: !!summonerData?.puuid,
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds if auto-refresh is on
    retry: false
  });

  // Auto-refresh toggle
  useEffect(() => {
    if (liveGameData?.data?.is_in_game && !autoRefresh) {
      setAutoRefresh(true); // Auto-enable refresh when in game
    }
  }, [liveGameData?.data?.is_in_game]);

  // Notification system
  useEffect(() => {
    if (liveGameData?.data?.is_in_game) {
      setNotifications(prev => {
        const newNotifications = [...prev];
        if (!newNotifications.includes('🎮 Live game detected!')) {
          newNotifications.push('🎮 Live game detected!');
        }
        return newNotifications.slice(-3); // Keep last 3 notifications
      });
    }
  }, [liveGameData?.data?.is_in_game]);

  if (!summonerData) {
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-6">
          <p className="text-slate-400">Connect your account to enable live game detection</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <LiveGameSkeleton />;
  }

  if (error) {
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>Error checking live game status</span>
          </div>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const liveGame = liveGameData?.data;

  if (!liveGame?.is_in_game) {
    return <NotInGameDisplay refetch={refetch} autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />;
  }

  return (
    <div className="space-y-6">
      {/* Real-time Overlay Controls */}
      <LiveGameOverlay />
      
      {/* Live Game Header */}
      <Card className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse" />
              <CardTitle className="text-green-400">🔴 LIVE GAME</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-400 border-green-500/30">
                {getGamePhase(liveGame.game_info?.game_length || 0)}
              </Badge>
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                className="text-green-400 border-green-500/30 hover:bg-green-900/20"
              >
                Refresh
              </Button>
            </div>
          </div>
          <CardDescription className="text-slate-300">
            {formatGameTime(liveGame.game_info?.game_length || 0)} • {liveGame.game_info?.game_mode || 'Unknown Mode'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="bg-blue-900/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="space-y-1">
              {notifications.map((notification, index) => (
                <div key={index} className="text-blue-400 text-sm">
                  {notification}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Enemy Team Analysis */}
        <EnemyTeamAnalysis enemyAnalysis={liveGame.enemy_analysis} />
        
        {/* Game Recommendations */}
        <GameRecommendations recommendations={liveGame.recommendations} />
      </div>

      {/* Team Compositions */}
      <TeamCompositions teamComposition={liveGame.team_composition} />

      {/* Auto-refresh controls */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400">Auto-refresh every 30 seconds</span>
            </div>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant="outline"
              size="sm"
              className={autoRefresh ? 'text-green-400 border-green-500/30' : ''}
            >
              {autoRefresh ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const NotInGameDisplay: React.FC<{
  refetch: () => void;
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
}> = ({ refetch, autoRefresh, setAutoRefresh }) => (
  <div className="space-y-6">
    {/* Real-time Overlay Controls */}
    <LiveGameOverlay />
    
    <Card className="bg-slate-900/50 border-slate-700">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Eye className="h-5 w-5 text-slate-400" />
        Live Game Detection
      </CardTitle>
      <CardDescription>
        Monitoring for active games...
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="text-center py-8">
        <div className="h-12 w-12 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
          <Users className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-slate-400 mb-4">No active game detected</p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Check Now
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant="outline"
            size="sm"
            className={autoRefresh ? 'text-green-400 border-green-500/30' : ''}
          >
            Auto-check: {autoRefresh ? 'On' : 'Off'}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
  </div>
);

const EnemyTeamAnalysis: React.FC<{ enemyAnalysis?: any }> = ({ enemyAnalysis }) => {
  if (!enemyAnalysis) return null;

  return (
    <Card className="bg-red-900/20 border-red-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-400">
          <Target className="h-5 w-5" />
          Enemy Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Threats */}
        {enemyAnalysis.team_threats?.length > 0 && (
          <div>
            <h4 className="font-medium text-red-400 mb-2">High Priority Threats</h4>
            <div className="space-y-2">
              {enemyAnalysis.team_threats.map((threat: any, index: number) => (
                <div key={index} className="p-2 bg-red-900/30 rounded border border-red-500/20">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-red-300">
                      {threat.summoner_name} - {getChampionNameById(threat.champion_id)}
                    </span>
                    <Badge variant="destructive" className="text-xs">
                      HIGH THREAT
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{threat.reason}</p>
                  <p className="text-xs text-blue-400 mt-1">💡 {threat.counter_strategy}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Analysis */}
        {enemyAnalysis.individual_analysis?.length > 0 && (
          <div>
            <h4 className="font-medium text-slate-300 mb-2">Enemy Players</h4>
            <div className="space-y-2">
              {enemyAnalysis.individual_analysis.map((player: EnemyPlayerAnalysis, index: number) => (
                <div 
                  key={index} 
                  className={`p-2 rounded border ${THREAT_LEVEL_BACKGROUNDS[player.threat_level]}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">
                      {player.summoner_name}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${THREAT_LEVEL_COLORS[player.threat_level]}`}
                    >
                      {player.threat_level.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {getChampionNameById(player.champion_id)} • Lv.{player.summoner_level}
                    {player.win_rate_estimate && (
                      <span className="ml-2">• {player.win_rate_estimate.toFixed(1)}% WR</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Strategies */}
        {enemyAnalysis.recommended_strategies?.length > 0 && (
          <div>
            <h4 className="font-medium text-blue-400 mb-2">Recommended Strategies</h4>
            <ul className="space-y-1">
              {enemyAnalysis.recommended_strategies.map((strategy: string, index: number) => (
                <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  {strategy}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const GameRecommendations: React.FC<{ recommendations?: any }> = ({ recommendations }) => {
  if (!recommendations) return null;

  return (
    <Card className="bg-blue-900/20 border-blue-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-400">
          <Sword className="h-5 w-5" />
          Live Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.immediate_actions?.length > 0 && (
          <div>
            <h4 className="font-medium text-yellow-400 mb-2">⚡ Immediate Actions</h4>
            <ul className="space-y-1">
              {recommendations.immediate_actions.map((action: string, index: number) => (
                <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.macro_strategy?.length > 0 && (
          <div>
            <h4 className="font-medium text-green-400 mb-2">🎯 Macro Strategy</h4>
            <ul className="space-y-1">
              {recommendations.macro_strategy.map((strategy: string, index: number) => (
                <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">•</span>
                  {strategy}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.item_builds?.length > 0 && (
          <div>
            <h4 className="font-medium text-purple-400 mb-2">🛡️ Item Recommendations</h4>
            <ul className="space-y-1">
              {recommendations.item_builds.map((item: string, index: number) => (
                <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TeamCompositions: React.FC<{ teamComposition?: any }> = ({ teamComposition }) => {
  if (!teamComposition) return null;

  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-400" />
          Team Compositions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Your Team */}
          <div>
            <h4 className="font-medium text-blue-400 mb-3">Your Team (Blue)</h4>
            <div className="space-y-2">
              {teamComposition.your_team?.map((player: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-blue-900/20 rounded border border-blue-500/20">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {getChampionNameById(player.champion_id).charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-200">{player.summoner_name}</div>
                    <div className="text-xs text-slate-400">
                      {getChampionNameById(player.champion_id)} • Lv.{player.summoner_level}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enemy Team */}
          <div>
            <h4 className="font-medium text-red-400 mb-3">Enemy Team (Red)</h4>
            <div className="space-y-2">
              {teamComposition.enemy_team?.map((player: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-red-900/20 rounded border border-red-500/20">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {getChampionNameById(player.champion_id).charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-200">{player.summoner_name}</div>
                    <div className="text-xs text-slate-400">
                      {getChampionNameById(player.champion_id)} • Lv.{player.summoner_level}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LiveGameSkeleton: React.FC = () => (
  <div className="space-y-6">
    <Card className="bg-slate-900/50 border-slate-700">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
    </Card>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Helper functions
const formatGameTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getGamePhase = (gameLength: number): string => {
  const minutes = gameLength / 60;
  if (minutes < 15) return 'Early Game';
  if (minutes < 30) return 'Mid Game';
  return 'Late Game';
};

export default LiveGameDetection;
