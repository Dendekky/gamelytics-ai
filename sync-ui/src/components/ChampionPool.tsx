import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar"
import { Skeleton } from "./ui/skeleton"
import { RefreshCw, Trophy, Crown, Star } from "lucide-react"
import { 
  getChampionImageUrl, 
  getChampionFallback, 
  getMasteryLevelIcon, 
  getMasteryLevelColor,
  getMasteryLevelBadgeColor,
  formatMasteryPoints,
  getChampionNameById 
} from "../lib/champions"
import type { ChampionMasteryResponse, ChampionMasteryWithPerformance } from "../types/champion-mastery"

interface ChampionPoolProps {
  puuid: string
  region: string
  summonerName?: string
}

export function ChampionPool({ puuid, region, summonerName }: ChampionPoolProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch enhanced champion mastery data
  const { data: masteryData, isLoading, error, refetch } = useQuery({
    queryKey: ['champion-mastery-enhanced', puuid],
    queryFn: async (): Promise<ChampionMasteryResponse> => {
      const response = await fetch(
        `http://localhost:8000/api/v1/champion-mastery/${puuid}/enhanced?limit=20&days=30`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch champion mastery data')
      }
      return response.json()
    },
    enabled: !!puuid,
  })

  // Sync mastery data with Riot API
  const handleSyncMasteries = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/champion-mastery/${puuid}/sync?region=${region}`,
        { method: 'POST' }
      )
      
      if (!response.ok) {
        throw new Error('Failed to sync masteries')
      }
      
      // Refetch the mastery data
      await refetch()
    } catch (error) {
      console.error('Error syncing masteries:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ChampionPoolSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-2xl font-bold text-white mb-2">Error Loading Champion Pool</h3>
        <p className="text-slate-400 mb-6">Failed to load champion mastery data</p>
        <Button onClick={() => refetch()} variant="outline" className="border-purple-400/30">
          Try Again
        </Button>
      </div>
    )
  }

  if (!masteryData || masteryData.masteries.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Champion Pool</h2>
          <Button
            onClick={handleSyncMasteries}
            disabled={isRefreshing}
            variant="outline"
            className="border-purple-400/30 text-purple-300 hover:bg-purple-500/20"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Masteries
          </Button>
        </div>

        {/* Empty State */}
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-2xl font-bold text-white mb-2">No Champion Mastery Data</h3>
          <p className="text-slate-400 mb-6">Sync your masteries to see your champion pool</p>
          <Button
            onClick={handleSyncMasteries}
            disabled={isRefreshing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Masteries
          </Button>
        </div>
      </div>
    )
  }

  const { masteries, summary } = masteryData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Champion Pool</h2>
        <Button
          onClick={handleSyncMasteries}
          disabled={isRefreshing}
          variant="outline"
          className="border-purple-400/30 text-purple-300 hover:bg-purple-500/20"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Sync Masteries
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm text-slate-400">Total Champions</p>
                <p className="text-2xl font-bold text-white">{summary.total_champions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-slate-400">Total Points</p>
                <p className="text-2xl font-bold text-white">{formatMasteryPoints(summary.total_mastery_points)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm text-slate-400">Mastery 7</p>
                <p className="text-2xl font-bold text-white">{summary.mastery_7_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
              <div>
                <p className="text-sm text-slate-400">Avg Level</p>
                <p className="text-2xl font-bold text-white">{summary.average_mastery_level}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Champion Mastery Grid */}
      <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Champion Masteries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {masteries.map((mastery) => (
              <ChampionMasteryCard key={mastery.champion_id} mastery={mastery} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface ChampionMasteryCardProps {
  mastery: ChampionMasteryWithPerformance
}

function ChampionMasteryCard({ mastery }: ChampionMasteryCardProps) {
  const championName = mastery.champion_name || getChampionNameById(mastery.champion_id)
  
  return (
    <Card className="border-slate-600/30 bg-slate-700/20 hover:bg-slate-700/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* Champion Avatar */}
          <div className="relative">
            <Avatar className="w-16 h-16 border-2 border-purple-400/50">
              <AvatarImage 
                src={getChampionImageUrl(championName)} 
                alt={championName}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white font-bold">
                {getChampionFallback(championName)}
              </AvatarFallback>
            </Avatar>
            
            {/* Mastery Level Badge */}
            <div className={`absolute -bottom-1 -right-1 w-8 h-8 ${getMasteryLevelBadgeColor(mastery.mastery_level)} rounded-full flex items-center justify-center border-2 border-slate-900`}>
              <span className="text-white text-xs font-bold">{mastery.mastery_level}</span>
            </div>
          </div>

          {/* Champion Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-white truncate">{championName}</h4>
              <span className={`text-lg ${getMasteryLevelColor(mastery.mastery_level)}`}>
                {getMasteryLevelIcon(mastery.mastery_level)}
              </span>
            </div>
            
            {/* Mastery Points */}
            <p className="text-sm text-purple-300 font-medium">
              {formatMasteryPoints(mastery.mastery_points)} points
            </p>
            
            {/* Progress to Next Level */}
            {mastery.points_until_next_level && mastery.mastery_level < 7 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Progress to Level {mastery.mastery_level + 1}</span>
                  <span>{mastery.mastery_progress_percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${mastery.mastery_progress_percentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Performance Stats */}
            {mastery.total_games_played > 0 && (
              <div className="mt-3 flex items-center space-x-4 text-xs">
                <Badge className={`${mastery.win_rate >= 60 ? "bg-green-600" : mastery.win_rate >= 50 ? "bg-blue-600" : "bg-slate-600"} text-white`}>
                  {mastery.win_rate.toFixed(1)}% WR
                </Badge>
                <span className="text-slate-400">
                  {mastery.total_games_played}G
                </span>
                <span className="text-slate-400">
                  {mastery.avg_kda.toFixed(1)} KDA
                </span>
              </div>
            )}

            {/* Chest Status */}
            {mastery.chest_granted && (
              <div className="mt-2">
                <Badge variant="outline" className="border-yellow-400/30 text-yellow-300 text-xs">
                  🎁 Chest Earned
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChampionPoolSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 bg-slate-700" />
        <Skeleton className="h-10 w-32 bg-slate-700" />
      </div>

      {/* Summary Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="w-5 h-5 bg-slate-600" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-slate-600" />
                  <Skeleton className="h-6 w-12 bg-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Champion Grid Skeleton */}
      <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-slate-700" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-slate-600/30 bg-slate-700/20">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Skeleton className="w-16 h-16 rounded-full bg-slate-600" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24 bg-slate-600" />
                      <Skeleton className="h-3 w-16 bg-slate-600" />
                      <Skeleton className="h-2 w-full bg-slate-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
