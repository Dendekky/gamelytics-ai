import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RolePerformance } from "./RolePerformance"
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

  console.log('Analytics component rendering with puuid:', puuid, 'summonerName:', summonerName)

  // Fetch overview statistics
  const { data: overviewStats, isLoading: overviewLoading, error: overviewError } = useQuery({
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
  const { data: championPerformance, isLoading: championLoading, error: championError } = useQuery({
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
  const { data: gpiMetrics, isLoading: gpiLoading, error: gpiError } = useQuery({
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

  // Log any errors
  if (overviewError) console.error('Overview stats error:', overviewError)
  if (championError) console.error('Champion performance error:', championError)
  if (gpiError) console.error('GPI metrics error:', gpiError)

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

  // Show error state if any query failed
  if (overviewError || championError || gpiError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Performance Analytics</h2>
            <p className="text-slate-300">
              {summonerName && `${summonerName} • `}
              Last {days} days
            </p>
          </div>
        </div>
        
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-slate-400">Unable to load analytics data</p>
              <p className="text-slate-500 text-sm mt-2">
                {overviewError?.message || championError?.message || gpiError?.message || 'An error occurred while fetching data'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (overviewLoading || championLoading || gpiLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
              <CardHeader>
                <Skeleton className="h-5 w-24 bg-slate-700" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 bg-slate-700" />
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
          <h2 className="text-2xl font-bold text-white">Performance Analytics</h2>
          <p className="text-slate-300">
            {summonerName && `${summonerName} • `}
            Last {days} days
          </p>
        </div>
      </div>

      {/* Overview Stats Grid */}
      {overviewStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Games Played
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{overviewStats.total_games}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{overviewStats.win_rate}%</div>
              <Badge className={`${overviewStats.win_rate >= 60 ? "bg-green-600" : overviewStats.win_rate >= 50 ? "bg-blue-600" : "bg-red-600"} text-white`}>
                {overviewStats.wins}W {overviewStats.losses}L
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Avg KDA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{overviewStats.avg_kda}</div>
              <div className="text-sm text-slate-400">
                {overviewStats.avg_kills} / {overviewStats.avg_deaths} / {overviewStats.avg_assists}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                CS/min
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{overviewStats.avg_cs_per_min}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Vision Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{overviewStats.avg_vision_score}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Playtime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{overviewStats.total_playtime_hours}h</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GPI Radar Chart */}
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Performance Radar</CardTitle>
            <p className="text-sm text-slate-400">
              GPI-style metrics on a 0-10 scale
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#475569" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#e2e8f0' }} />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 10]} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  stroke="#64748b"
                />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Champion Performance Chart */}
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Champion Win Rates</CardTitle>
            <p className="text-sm text-slate-400">
              Top played champions by win rate
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={championChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#e2e8f0' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  stroke="#64748b"
                />
                <YAxis tick={{ fontSize: 11, fill: '#e2e8f0' }} stroke="#64748b" />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}${name === 'winRate' ? '%' : ''}`,
                    name === 'winRate' ? 'Win Rate' : name === 'games' ? 'Games' : 'KDA'
                  ]}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                />
                <Bar dataKey="winRate" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Champion Performance Table */}
      {championPerformance && championPerformance.length > 0 && (
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Champion Statistics</CardTitle>
            <p className="text-sm text-slate-400">
              Detailed performance by champion
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-2 text-slate-300">Champion</th>
                    <th className="text-center py-2 text-slate-300">Games</th>
                    <th className="text-center py-2 text-slate-300">Win Rate</th>
                    <th className="text-center py-2 text-slate-300">KDA</th>
                    <th className="text-center py-2 text-slate-300">CS/min</th>
                    <th className="text-center py-2 text-slate-300">Avg Damage</th>
                  </tr>
                </thead>
                <tbody>
                  {championPerformance.slice(0, 10).map((champ) => (
                    <tr key={champ.champion_id} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="py-2 font-medium text-white">{champ.champion_name}</td>
                      <td className="text-center py-2 text-slate-300">{champ.total_games}</td>
                      <td className="text-center py-2">
                        <Badge className={`${champ.win_rate >= 60 ? "bg-green-600" : champ.win_rate >= 50 ? "bg-blue-600" : "bg-slate-600"} text-white`}>
                          {champ.win_rate}%
                        </Badge>
                      </td>
                      <td className="text-center py-2 text-slate-300">{champ.avg_kda}</td>
                      <td className="text-center py-2 text-slate-300">{champ.avg_cs_per_min}</td>
                      <td className="text-center py-2 text-slate-300">{Math.round(champ.avg_damage_to_champions).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Performance Analysis */}
      <RolePerformance puuid={puuid} days={days} />
    </div>
  )
}
