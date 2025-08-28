import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line
} from 'recharts'

interface AnalyticsProps {
  puuid: string
  summonerName?: string
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

interface ChampionPerformance {
  champion_name: string
  champion_id: number
  total_games: number
  wins: number
  losses: number
  win_rate: number
  avg_kda: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  avg_cs_per_min: number
  avg_damage_to_champions: number
  avg_vision_score: number
  last_played: string
}

interface GPIMetrics {
  aggression: number
  farming: number
  survivability: number
  vision: number
  versatility: number
  consistency: number
}

export function Analytics({ puuid, summonerName }: AnalyticsProps) {
  const days = 30

  // Fetch overview statistics
  const { data: overviewStats, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview', puuid, days],
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
  })

  // Fetch champion performance
  const { data: championPerformance, isLoading: championLoading } = useQuery({
    queryKey: ['analytics-champions', puuid, days],
    queryFn: async (): Promise<ChampionPerformance[]> => {
      const response = await fetch(
        `http://localhost:8000/api/v1/analytics/champions/${puuid}?days=${days}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch champion performance')
      }
      return response.json()
    },
    enabled: !!puuid,
  })

  // Fetch GPI metrics
  const { data: gpiMetrics, isLoading: gpiLoading } = useQuery({
    queryKey: ['analytics-gpi', puuid, days],
    queryFn: async (): Promise<GPIMetrics> => {
      const response = await fetch(
        `http://localhost:8000/api/v1/analytics/gpi/${puuid}?days=${days}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch GPI metrics')
      }
      return response.json()
    },
    enabled: !!puuid,
  })

  // Prepare radar chart data
  const radarData = gpiMetrics ? [
    { metric: 'Aggression', value: gpiMetrics.aggression },
    { metric: 'Farming', value: gpiMetrics.farming },
    { metric: 'Survivability', value: gpiMetrics.survivability },
    { metric: 'Vision', value: gpiMetrics.vision },
    { metric: 'Versatility', value: gpiMetrics.versatility },
    { metric: 'Consistency', value: gpiMetrics.consistency },
  ] : []

  // Prepare champion chart data (top 8 champions)
  const championChartData = championPerformance?.slice(0, 8).map(champ => ({
    name: champ.champion_name,
    winRate: champ.win_rate,
    games: champ.total_games,
    kda: champ.avg_kda
  })) || []

  if (overviewLoading || championLoading || gpiLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
          <p className="text-muted-foreground">
            {summonerName && `${summonerName} • `}
            Last {days} days
          </p>
        </div>
      </div>

      {/* Overview Stats Grid */}
      {overviewStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Games Played
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.total_games}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.win_rate}%</div>
              <Badge variant={overviewStats.win_rate >= 60 ? "default" : overviewStats.win_rate >= 50 ? "secondary" : "destructive"}>
                {overviewStats.wins}W {overviewStats.losses}L
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg KDA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.avg_kda}</div>
              <div className="text-sm text-muted-foreground">
                {overviewStats.avg_kills} / {overviewStats.avg_deaths} / {overviewStats.avg_assists}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                CS/min
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.avg_cs_per_min}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vision Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.avg_vision_score}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Playtime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.total_playtime_hours}h</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GPI Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Radar</CardTitle>
            <p className="text-sm text-muted-foreground">
              GPI-style metrics on a 0-10 scale
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 10]} 
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Champion Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Champion Win Rates</CardTitle>
            <p className="text-sm text-muted-foreground">
              Top played champions by win rate
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={championChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}${name === 'winRate' ? '%' : ''}`,
                    name === 'winRate' ? 'Win Rate' : name === 'games' ? 'Games' : 'KDA'
                  ]}
                />
                <Bar dataKey="winRate" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Champion Performance Table */}
      {championPerformance && championPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Champion Statistics</CardTitle>
            <p className="text-sm text-muted-foreground">
              Detailed performance by champion
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Champion</th>
                    <th className="text-center py-2">Games</th>
                    <th className="text-center py-2">Win Rate</th>
                    <th className="text-center py-2">KDA</th>
                    <th className="text-center py-2">CS/min</th>
                    <th className="text-center py-2">Avg Damage</th>
                  </tr>
                </thead>
                <tbody>
                  {championPerformance.slice(0, 10).map((champ) => (
                    <tr key={champ.champion_id} className="border-b hover:bg-muted/50">
                      <td className="py-2 font-medium">{champ.champion_name}</td>
                      <td className="text-center py-2">{champ.total_games}</td>
                      <td className="text-center py-2">
                        <Badge variant={champ.win_rate >= 60 ? "default" : champ.win_rate >= 50 ? "secondary" : "outline"}>
                          {champ.win_rate}%
                        </Badge>
                      </td>
                      <td className="text-center py-2">{champ.avg_kda}</td>
                      <td className="text-center py-2">{champ.avg_cs_per_min}</td>
                      <td className="text-center py-2">{Math.round(champ.avg_damage_to_champions).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
