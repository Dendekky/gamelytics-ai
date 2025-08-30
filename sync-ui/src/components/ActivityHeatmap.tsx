import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Skeleton } from "./ui/skeleton"
import { Clock, Calendar, Trophy, Zap } from "lucide-react"
import type { ActivityHeatmapData } from "../types/activity"

interface ActivityHeatmapProps {
  puuid: string
  days?: number
}

export function ActivityHeatmap({ puuid, days = 30 }: ActivityHeatmapProps) {
  // Fetch activity heatmap data
  const { data: activityData, isLoading, error } = useQuery({
    queryKey: ['activity-heatmap', puuid, days],
    queryFn: async (): Promise<ActivityHeatmapData> => {
      const response = await fetch(
        `http://localhost:8000/api/v1/analytics/activity/${puuid}?days=${days}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch activity heatmap')
      }
      return response.json()
    },
    enabled: !!puuid,
  })

  if (isLoading) {
    return <ActivityHeatmapSkeleton />
  }

  if (error || !activityData) {
    return (
      <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-slate-400">Unable to load activity data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (activityData.total_games === 0) {
    return (
      <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Activity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🌙</div>
            <p className="text-slate-400">No games played in the last {days} days</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Create heatmap grid for easier rendering
  const heatmapGrid: Record<string, Record<number, number>> = {}
  dayNames.forEach(day => {
    heatmapGrid[day] = {}
    hours.forEach(hour => {
      heatmapGrid[day][hour] = 0
    })
  })

  // Fill in the actual data
  activityData.heatmap_data.forEach(point => {
    heatmapGrid[point.day][point.hour] = point.intensity
  })

  const getIntensityColor = (intensity: number): string => {
    if (intensity === 0) return "bg-slate-800/50"
    if (intensity <= 0.2) return "bg-purple-900/40"
    if (intensity <= 0.4) return "bg-purple-800/60"
    if (intensity <= 0.6) return "bg-purple-700/80"
    if (intensity <= 0.8) return "bg-purple-600"
    return "bg-purple-500"
  }

  const formatHour = (hour: number): string => {
    if (hour === 0) return "12AM"
    if (hour < 12) return `${hour}AM`
    if (hour === 12) return "12PM"
    return `${hour - 12}PM`
  }

  const getActivityIcon = (pattern: string): string => {
    switch (pattern) {
      case "Morning Gamer": return "🌅"
      case "Afternoon Gamer": return "☀️"
      case "Evening Gamer": return "🌆"
      case "Night Owl": return "🦉"
      default: return "⚖️"
    }
  }

  return (
    <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Activity Heatmap
          </CardTitle>
          <Badge variant="outline" className="border-purple-400/30 text-purple-300">
            Last {days} days
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Activity Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Trophy className="w-4 h-4 text-yellow-400 mr-1" />
              <span className="text-2xl font-bold text-white">{activityData.total_games}</span>
            </div>
            <p className="text-xs text-slate-400">Total Games</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="w-4 h-4 text-blue-400 mr-1" />
              <span className="text-2xl font-bold text-white">{activityData.total_hours_played}h</span>
            </div>
            <p className="text-xs text-slate-400">Hours Played</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <span className="text-lg mr-1">{getActivityIcon(activityData.activity_pattern)}</span>
              <span className="text-sm font-medium text-white">{activityData.activity_pattern}</span>
            </div>
            <p className="text-xs text-slate-400">Gaming Style</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Zap className="w-4 h-4 text-purple-400 mr-1" />
              <span className="text-sm font-medium text-white">
                {activityData.peak_day} {activityData.peak_hour !== null ? formatHour(activityData.peak_hour) : ""}
              </span>
            </div>
            <p className="text-xs text-slate-400">Peak Time</p>
          </div>
        </div>

        {/* Heatmap Grid - Compact Version */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Gaming Activity by Day & Hour</h4>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-slate-800/50 rounded-sm"></div>
                <span>Less</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-sm"></div>
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Compact Hour labels - only show key hours */}
          <div className="flex">
            <div className="w-16"></div> {/* Space for day labels */}
            <div className="flex-1 grid grid-cols-24 gap-px">
              {hours.map(hour => (
                <div key={hour} className="text-xs text-slate-400 text-center">
                  {hour % 6 === 0 ? hour.toString() : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Compact Heatmap rows */}
          <div className="space-y-px">
            {dayNames.map(day => (
              <div key={day} className="flex items-center">
                <div className="w-16 text-xs text-slate-400 text-right pr-2">
                  {day.slice(0, 3)}
                </div>
                <div className="flex-1 grid grid-cols-24 gap-px">
                  {hours.map(hour => {
                    const intensity = heatmapGrid[day][hour]
                    const gamesCount = activityData.heatmap_data.find(
                      p => p.day === day && p.hour === hour
                    )?.games || 0
                    
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className={`w-3 h-3 ${getIntensityColor(intensity)} rounded-sm border border-slate-700/20 hover:border-purple-400/50 transition-colors cursor-pointer`}
                        title={`${day} ${formatHour(hour)}: ${gamesCount} game(s)`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Activity Summary */}
        {(activityData.peak_day || activityData.peak_hour !== null) && (
          <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
            <h4 className="text-sm font-medium text-white mb-2">Activity Insights</h4>
            <div className="text-sm text-slate-300 space-y-1">
              {activityData.peak_day && (
                <p>• Most active on <strong className="text-purple-300">{activityData.peak_day}</strong></p>
              )}
              {activityData.peak_hour !== null && (
                <p>• Peak gaming hour: <strong className="text-purple-300">{formatHour(activityData.peak_hour)}</strong></p>
              )}
              <p>• Playing style: <strong className="text-purple-300">{activityData.activity_pattern}</strong></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityHeatmapSkeleton() {
  return (
    <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40 bg-slate-700" />
          <Skeleton className="h-6 w-20 bg-slate-700" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-6 w-12 mx-auto bg-slate-700" />
              <Skeleton className="h-3 w-16 mx-auto bg-slate-700" />
            </div>
          ))}
        </div>

        {/* Heatmap skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-60 bg-slate-700" />
          <div className="space-y-1">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-16 h-4 bg-slate-700" />
                <div className="flex-1 grid grid-cols-24 gap-0.5">
                  {[...Array(24)].map((_, j) => (
                    <Skeleton key={j} className="aspect-square bg-slate-700" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
