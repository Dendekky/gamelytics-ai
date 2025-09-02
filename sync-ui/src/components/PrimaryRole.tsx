import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "./ui/skeleton"

interface PrimaryRoleProps {
  puuid: string
  days?: number
}

interface RolePerformance {
  role: string
  total_games: number
  wins: number
  losses: number
  win_rate: number
  avg_kda: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
}

export function PrimaryRole({ puuid, days = 30 }: PrimaryRoleProps) {
  const { data: roleData, isLoading, error } = useQuery({
    queryKey: ['role-performance', puuid, days],
    queryFn: async (): Promise<RolePerformance[]> => {
      console.log('Fetching role performance for puuid:', puuid)
      const response = await fetch(
        `http://localhost:8000/api/v1/analytics/roles/${puuid}?days=${days}`
      )
      if (!response.ok) {
        console.error('Role performance API error:', response.status, response.statusText)
        throw new Error('Failed to fetch role performance')
      }
      const data = await response.json()
      console.log('Role performance data:', data)
      
      // Handle different response formats
      if (Array.isArray(data)) {
        return data
      } else if (data && data.role_stats && Array.isArray(data.role_stats)) {
        return data.role_stats
      } else {
        console.warn('Unexpected role performance data format:', data)
        return []
      }
    },
    enabled: !!puuid,
    retry: 1, // Only retry once to prevent infinite loading
  })

  if (isLoading) {
    return <PrimaryRoleSkeleton />
  }

  if (error || !roleData || !Array.isArray(roleData) || roleData.length === 0) {
    return (
      <div className="text-center space-y-2">
        <div className="text-4xl">⚖️</div>
        <div className="text-xl font-bold text-slate-400">Unknown</div>
        <div className="text-slate-400 text-sm">No role data available</div>
      </div>
    )
  }

  // Find the role with the most games
  const primaryRole = roleData.reduce((prev, current) => 
    (current.total_games > prev.total_games) ? current : prev
  )

  if (!primaryRole) {
    return (
      <div className="text-center space-y-2">
        <div className="text-4xl">⚖️</div>
        <div className="text-xl font-bold text-slate-400">Unknown</div>
        <div className="text-slate-400 text-sm">No role data available</div>
      </div>
    )
  }

  const getRoleIcon = (role: string): string => {
    const roleIcons: Record<string, string> = {
      "TOP": "⚔️",
      "JUNGLE": "🌿", 
      "MIDDLE": "✨",
      "BOTTOM": "🏹",
      "UTILITY": "🛡️",
      "SUPPORT": "🛡️"
    }
    return roleIcons[role.toUpperCase()] || "🎮"
  }

  const formatRole = (role: string): string => {
    const roleNames: Record<string, string> = {
      "TOP": "Top Lane",
      "JUNGLE": "Jungle",
      "MIDDLE": "Mid Lane", 
      "BOTTOM": "ADC",
      "UTILITY": "Support",
      "SUPPORT": "Support"
    }
    return roleNames[role.toUpperCase()] || role
  }

  return (
    <div className="text-center space-y-2">
      <div className="text-4xl">{getRoleIcon(primaryRole.role)}</div>
      <div className="text-xl font-bold text-purple-400">{formatRole(primaryRole.role)}</div>
      <div className="text-slate-400 text-sm">
        {primaryRole.total_games} games • {Math.round(primaryRole.win_rate)}% WR
      </div>
    </div>
  )
}

function PrimaryRoleSkeleton() {
  return (
    <div className="text-center space-y-2">
      <Skeleton className="w-12 h-12 mx-auto bg-slate-700" />
      <Skeleton className="h-6 w-20 mx-auto bg-slate-700" />
      <Skeleton className="h-4 w-24 mx-auto bg-slate-700" />
    </div>
  )
}
