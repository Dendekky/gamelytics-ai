import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Skeleton } from "./ui/skeleton"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Crown, Target, TrendingUp, Lightbulb } from "lucide-react"
import type { RolePerformanceData, RoleBenchmarkData, RoleStats } from "../types/role-performance"
import { ROLE_NAMES, ROLE_ICONS, ROLE_COLORS } from "../types/role-performance"

interface RolePerformanceProps {
  puuid: string
  days?: number
}

export function RolePerformance({ puuid, days = 30 }: RolePerformanceProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  // Fetch role performance data
  const { data: roleData, isLoading, error } = useQuery({
    queryKey: ['role-performance', puuid, days],
    queryFn: async (): Promise<RolePerformanceData> => {
      const response = await fetch(
        `http://localhost:8000/api/v1/analytics/roles/${puuid}?days=${days}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch role performance')
      }
      return response.json()
    },
    enabled: !!puuid,
  })

  // Fetch detailed role benchmarks for selected role
  const { data: benchmarkData, isLoading: benchmarkLoading } = useQuery({
    queryKey: ['role-benchmarks', puuid, selectedRole, days],
    queryFn: async (): Promise<RoleBenchmarkData> => {
      const response = await fetch(
        `http://localhost:8000/api/v1/analytics/roles/${puuid}/${selectedRole}?days=${days}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch role benchmarks')
      }
      return response.json()
    },
    enabled: !!puuid && !!selectedRole,
  })

  if (isLoading) {
    return <RolePerformanceSkeleton />
  }

  if (error || !roleData) {
    return (
      <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-2">⚔️</div>
            <p className="text-slate-400">Unable to load role performance data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (roleData.total_games === 0) {
    return (
      <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            Role Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎭</div>
            <p className="text-slate-400">No games played in the last {days} days</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data
  const pieChartData = roleData.role_stats.map(role => ({
    name: ROLE_NAMES[role.role] || role.role,
    value: role.total_games,
    color: getColorForRole(role.role)
  }))

  const barChartData = roleData.role_stats.map(role => ({
    role: ROLE_NAMES[role.role] || role.role,
    winRate: role.win_rate,
    kda: role.avg_kda,
    performance: role.performance_score
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6" />
            Role Performance
          </h2>
          <p className="text-slate-400">Analyze your performance across different roles</p>
        </div>
        <Badge variant="outline" className="border-purple-400/30 text-purple-300">
          Last {days} days
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm text-slate-400">Most Played Role</p>
                <p className="text-xl font-bold text-white flex items-center gap-1">
                  <span>{ROLE_ICONS[roleData.most_played_role || "UNKNOWN"]}</span>
                  {ROLE_NAMES[roleData.most_played_role || "UNKNOWN"]}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-slate-400">Best Performing Role</p>
                <p className="text-xl font-bold text-white flex items-center gap-1">
                  <span>{ROLE_ICONS[roleData.best_performing_role || "UNKNOWN"]}</span>
                  {ROLE_NAMES[roleData.best_performing_role || "UNKNOWN"]}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-slate-400">Total Games</p>
                <p className="text-xl font-bold text-white">{roleData.total_games}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Distribution Pie Chart */}
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Comparison Bar Chart */}
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Win Rate by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="role" 
                    stroke="#9ca3af"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Bar dataKey="winRate" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Stats Table */}
      <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Role Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400 font-medium">Role</th>
                  <th className="text-center py-2 text-slate-400 font-medium">Games</th>
                  <th className="text-center py-2 text-slate-400 font-medium">Win Rate</th>
                  <th className="text-center py-2 text-slate-400 font-medium">KDA</th>
                  <th className="text-center py-2 text-slate-400 font-medium">CS/min</th>
                  <th className="text-center py-2 text-slate-400 font-medium">Vision</th>
                  <th className="text-center py-2 text-slate-400 font-medium">Score</th>
                  <th className="text-center py-2 text-slate-400 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {roleData.role_stats.map((role) => (
                  <tr key={role.role} className="border-b border-slate-700 hover:bg-slate-700/30">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{ROLE_ICONS[role.role]}</span>
                        <span className="font-medium text-white">{ROLE_NAMES[role.role] || role.role}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 text-slate-300">{role.total_games}</td>
                    <td className="text-center py-3">
                      <Badge className={`${role.win_rate >= 60 ? "bg-green-600" : role.win_rate >= 50 ? "bg-blue-600" : "bg-slate-600"} text-white`}>
                        {role.win_rate}%
                      </Badge>
                    </td>
                    <td className="text-center py-3 text-slate-300">{role.avg_kda}</td>
                    <td className="text-center py-3 text-slate-300">{role.avg_cs_per_min}</td>
                    <td className="text-center py-3 text-slate-300">{role.avg_vision_score}</td>
                    <td className="text-center py-3">
                      <span className="text-purple-300 font-medium">{role.performance_score}</span>
                    </td>
                    <td className="text-center py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-400/30 text-purple-300 hover:bg-purple-500/20"
                        onClick={() => setSelectedRole(role.role)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Role Analysis */}
      {selectedRole && (
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <span>{ROLE_ICONS[selectedRole]}</span>
                {ROLE_NAMES[selectedRole]} Analysis
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRole(null)}
                className="border-slate-600 text-slate-400"
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {benchmarkLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 bg-slate-700" />
                ))}
              </div>
            ) : benchmarkData ? (
              <RoleBenchmarkDetails benchmark={benchmarkData} />
            ) : (
              <p className="text-slate-400">No data available for this role</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface RoleBenchmarkDetailsProps {
  benchmark: RoleBenchmarkData
}

function RoleBenchmarkDetails({ benchmark }: RoleBenchmarkDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Benchmark Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{benchmark.benchmarks.avg_kda}</div>
          <div className="text-sm text-slate-400">Avg KDA</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{benchmark.benchmarks.avg_cs_per_min}</div>
          <div className="text-sm text-slate-400">CS/min</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{benchmark.benchmarks.avg_vision}</div>
          <div className="text-sm text-slate-400">Vision Score</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{benchmark.win_rate}%</div>
          <div className="text-sm text-slate-400">Win Rate</div>
        </div>
      </div>

      {/* Insights */}
      {benchmark.insights.length > 0 && (
        <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance Insights
          </h4>
          <div className="space-y-2">
            {benchmark.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-green-400 text-sm">•</span>
                <span className="text-sm text-slate-300">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {benchmark.recommendations.length > 0 && (
        <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Improvement Recommendations
          </h4>
          <div className="space-y-2">
            {benchmark.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-yellow-400 text-sm">•</span>
                <span className="text-sm text-slate-300">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getColorForRole(role: string): string {
  const colors: Record<string, string> = {
    "TOP": "#ef4444",
    "JUNGLE": "#22c55e",
    "MIDDLE": "#3b82f6",
    "BOTTOM": "#eab308",
    "UTILITY": "#a855f7",
    "UNKNOWN": "#6b7280"
  }
  return colors[role] || colors["UNKNOWN"]
}

function RolePerformanceSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 bg-slate-700" />
        <Skeleton className="h-6 w-20 bg-slate-700" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="w-5 h-5 bg-slate-600" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-slate-600" />
                  <Skeleton className="h-6 w-20 bg-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
            <CardHeader>
              <Skeleton className="h-6 w-32 bg-slate-700" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 bg-slate-700" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
