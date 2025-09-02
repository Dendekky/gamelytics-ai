import { useQuery } from "@tanstack/react-query"
import { getChampionNameById } from '../lib/champions'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Skeleton } from "./ui/skeleton"

interface RecentMatchesProps {
  puuid: string
  limit?: number
}

interface RecentMatch {
  match_id: string
  champion_name: string
  champion_id?: number
  kills: number
  deaths: number
  assists: number
  kda_ratio: number
  cs: number
  gold_earned: number
  damage_to_champions: number
  vision_score: number
  win: boolean
  game_duration_minutes: number
  game_creation: string
}

export function RecentMatches({ puuid, limit = 3 }: RecentMatchesProps) {
  const { data: recentMatches, isLoading, error } = useQuery({
    queryKey: ['recent-matches', puuid, limit],
    queryFn: async (): Promise<RecentMatch[]> => {
      // First try to fetch new matches to ensure we have the latest data
      try {
        const syncResponse = await fetch(
          `http://localhost:8000/api/v1/matches/${puuid}?limit=${limit}&fetch_new=true&region=na1`,
          { method: 'GET' }
        )
        if (syncResponse.ok) {
          console.log('✅ Successfully synced new matches for RecentMatches')
        }
      } catch (syncError) {
        console.log('⚠️ Could not sync new matches, using cached data:', syncError)
      }
      
      // Now fetch the performance data (includes champion names and KDA)
      const response = await fetch(
        `http://localhost:8000/api/v1/matches/${puuid}/performance?limit=${limit}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch recent match performance')
      }
      const data = await response.json()
      return data || []
    },
    enabled: !!puuid,
    retry: 1, // Only retry once to prevent infinite loading
  })

  if (isLoading) {
    return <RecentMatchesSkeleton />
  }

  if (error || !recentMatches || recentMatches.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎮</div>
          <p className="text-slate-400">No recent matches found</p>
        </div>
      </div>
    )
  }

  const formatDuration = (minutes: number) => {
    const mins = Math.floor(minutes)
    const secs = Math.floor((minutes - mins) * 60)
    return `${mins}m ${secs}s`
  }

  const formatKDA = (kills: number, deaths: number, assists: number) => {
    const kda = deaths > 0 ? ((kills + assists) / deaths).toFixed(1) : `${kills + assists}.0`
    return `${kills}/${deaths}/${assists}`
  }

  const getChampionIcon = (championName: string) => {
    // Simple emoji mapping for common champions
    const championIcons: Record<string, string> = {
      "Amumu": "🤕",
      "Fiddlesticks": "🎭",
      "Jarvan IV": "👑",
      "Graves": "🔫",
      "Kha'Zix": "🦗",
      "Rengar": "🦁",
      "default": "🏆"
    }
    return championIcons[championName] || championIcons.default
  }

  return (
    <div className="space-y-3">
      {recentMatches.map((match) => (
        <div 
          key={match.match_id} 
          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
            match.win 
              ? "bg-green-900/20 border-green-600/30 hover:bg-green-900/30"
              : "bg-red-900/20 border-red-600/30 hover:bg-red-900/30"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              match.win ? "bg-green-600" : "bg-red-600"
            }`}>
              <span className="text-white font-bold">{getChampionIcon(match.champion_name || getChampionNameById(match.champion_id || 0))}</span>
            </div>
            <div>
              <div className="text-white font-medium">
                {match.champion_name || getChampionNameById(match.champion_id || 0)} • Ranked Solo
              </div>
              <div className={`text-sm ${
                match.win ? "text-green-400" : "text-red-400"
              }`}>
                {match.win ? "Victory" : "Defeat"} • {formatDuration(match.game_duration_minutes)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-medium ${
              match.win ? "text-green-400" : "text-red-400"
            }`}>
              {formatKDA(match.kills, match.deaths, match.assists)}
            </div>
            <div className="text-slate-400 text-sm">
              {match.kda_ratio ? match.kda_ratio.toFixed(1) : '0.0'} KDA
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function RecentMatchesSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-12 h-12 rounded-full bg-slate-600" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-slate-600" />
              <Skeleton className="h-3 w-24 bg-slate-600" />
            </div>
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-4 w-16 bg-slate-600" />
            <Skeleton className="h-3 w-12 bg-slate-600" />
          </div>
        </div>
      ))}
    </div>
  )
}
