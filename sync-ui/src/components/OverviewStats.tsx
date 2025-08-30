import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Skeleton } from "./ui/skeleton"

interface OverviewStatsProps {
  puuid: string
  days?: number
}

interface PlayerOverviewStats {
  total_games: number
  wins: number
  losses: number
  win_rate: number
  avg_kda: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  avg_cs_per_min: number
  avg_vision_score: number
  total_playtime_hours: number
  timeframe_days: number
}

export function OverviewStats({ puuid, days = 20 }: OverviewStatsProps) {
  const { data: overviewStats, isLoading, error } = useQuery({
    queryKey: ['overview-stats', puuid, days],
    queryFn: async (): Promise<PlayerOverviewStats> => {
      const response = await fetch(
        `http://localhost:8000/api/v1/analytics/overview/${puuid}?days=${days}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch overview stats')
      }
      return response.json()
    },
    enabled: !!puuid,
    retry: 1, // Only retry once to prevent infinite loading
  })

  if (isLoading) {
    return <OverviewStatsSkeleton />
  }

  if (error || !overviewStats) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <div className="text-2xl font-bold text-slate-500">--</div>
            <div className="text-sm text-slate-400">No Data</div>
          </div>
        ))}
      </div>
    )
  }

  const formatWinRate = (rate: number) => `${Math.round(rate)}%`
  const formatKDA = (kda: number) => kda.toFixed(1)

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-400">{overviewStats.wins}W</div>
        <div className="text-sm text-slate-400">Wins</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-red-400">{overviewStats.losses}L</div>
        <div className="text-sm text-slate-400">Losses</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-400">{formatWinRate(overviewStats.win_rate)}</div>
        <div className="text-sm text-slate-400">Win Rate</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-400">{formatKDA(overviewStats.avg_kda)}</div>
        <div className="text-sm text-slate-400">Avg KDA</div>
      </div>
    </div>
  )
}

function OverviewStatsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="text-center space-y-2">
          <Skeleton className="h-8 w-12 mx-auto bg-slate-700" />
          <Skeleton className="h-4 w-16 mx-auto bg-slate-700" />
        </div>
      ))}
    </div>
  )
}
