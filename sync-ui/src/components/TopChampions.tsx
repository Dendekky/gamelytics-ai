import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Skeleton } from "./ui/skeleton"
import { ChampionMasterySync } from "./ChampionMasterySync"

interface TopChampionsProps {
  puuid: string
  region: string
  limit?: number
}

interface ChampionMastery {
  champion_id: number
  champion_name: string
  mastery_level: number
  mastery_points: number
  total_games_played?: number
  wins?: number
  win_rate?: number
}

interface ChampionMasteryEnhancedResponse {
  masteries: ChampionMastery[]
  summary: any
  total_count: number
}

export function TopChampions({ puuid, region, limit = 3 }: TopChampionsProps) {
  const queryClient = useQueryClient()
  const { data: championMasteries, isLoading, error } = useQuery({
    queryKey: ['top-champions', puuid, limit],
    queryFn: async (): Promise<ChampionMastery[]> => {
      console.log('Fetching top champions for puuid:', puuid)
      const url = `http://localhost:8000/api/v1/champion-mastery/enhanced/${puuid}?limit=${limit}`
      console.log('TopChampions API URL:', url)
      
      const response = await fetch(url)
      console.log('TopChampions response status:', response.status)
      
      if (!response.ok) {
        console.error('TopChampions enhanced API error:', response.status, response.statusText)
        
        // If enhanced endpoint fails with 404, try the basic endpoint
        if (response.status === 404) {
          console.log('Enhanced endpoint not found, trying basic endpoint...')
          const basicResponse = await fetch(`http://localhost:8000/api/v1/champion-mastery/${puuid}?limit=${limit}`)
          if (basicResponse.ok) {
            const basicData = await basicResponse.json()
            console.log('TopChampions basic data:', basicData)
            return basicData.masteries || []
          }
        }
        
        // If all endpoints fail, return empty array to show sync option
        console.log('All champion mastery endpoints failed, returning empty array')
        return []
      }
      
      const data: ChampionMasteryEnhancedResponse = await response.json()
      console.log('TopChampions enhanced data:', data)
      return data.masteries || []
    },
    enabled: !!puuid,
    retry: 1, // Only retry once to prevent infinite loading
  })

  if (isLoading) {
    return <TopChampionsSkeleton />
  }

  const handleSyncComplete = () => {
    // Refetch the champion masteries data
    queryClient.invalidateQueries({ queryKey: ['top-champions', puuid] })
  }

  if (error || !championMasteries || championMasteries.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-center py-4">
          <div className="text-2xl mb-2">🏆</div>
          <p className="text-slate-400 text-sm">
            {error ? 'Failed to load champion data' : 'No champion data found'}
          </p>
          <p className="text-slate-500 text-xs mb-3">
            Sync your champion masteries from Riot Games
          </p>
          <ChampionMasterySync 
            puuid={puuid} 
            region={region} 
            onSyncComplete={handleSyncComplete}
          />
        </div>
      </div>
    )
  }

  const getMasteryColor = (level: number) => {
    if (level >= 7) return "text-yellow-400"
    if (level >= 6) return "text-purple-400"
    if (level >= 5) return "text-blue-400"
    return "text-slate-400"
  }

  const formatWinRate = (winRate?: number) => {
    if (winRate === undefined || winRate === null) return "N/A"
    return `${Math.round(winRate)}%`
  }

  const formatGames = (games?: number) => {
    if (games === undefined || games === null) return "N/A"
    return `${games} games`
  }

  console.log('TopChampions component:', { championMasteries, isLoading, error })

  return (
    <div className="space-y-3">
      {championMasteries.map((champ, i) => (
        <div key={champ.champion_id} className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center ${getMasteryColor(champ.mastery_level)}`}>
              <span className="text-white text-xs font-bold">{i + 1}</span>
            </div>
            <div>
              <div className="text-white font-medium">{champ.champion_name}</div>
              <div className="text-xs text-slate-400">
                M{champ.mastery_level} • {champ.mastery_points.toLocaleString()} pts
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-purple-400 text-sm font-medium">
              {formatWinRate(champ.win_rate)} WR
            </div>
            <div className="text-slate-400 text-xs">
              {formatGames(champ.total_games_played)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TopChampionsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="w-8 h-8 rounded-full bg-slate-600" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-20 bg-slate-600" />
              <Skeleton className="h-3 w-16 bg-slate-600" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-4 w-12 bg-slate-600" />
            <Skeleton className="h-3 w-16 bg-slate-600" />
          </div>
        </div>
      ))}
    </div>
  )
}
