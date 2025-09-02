import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { type PlayerMatchPerformance, QUEUE_TYPES, MAP_NAMES } from "@/types/match"
import { getChampionImageUrl as getDynamicChampionImageUrl } from '../lib/champions'

interface MatchCardProps {
  match: PlayerMatchPerformance
  onClick?: () => void
}

export function MatchCard({ match, onClick }: MatchCardProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  const formatDuration = (minutes: number) => {
    const mins = Math.floor(minutes)
    const secs = Math.floor((minutes - mins) * 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatKDA = (kills: number, deaths: number, assists: number) => {
    return `${kills}/${deaths}/${assists}`
  }

  const getKDAColor = (kda: number) => {
    if (kda >= 3.0) return "text-green-600 font-bold"
    if (kda >= 2.0) return "text-green-500"
    if (kda >= 1.0) return "text-yellow-600"
    return "text-red-500"
  }

  const getChampionImageUrl = (championName: string) => {
    // Use our dynamic champion image URL function
    return getDynamicChampionImageUrl(championName)
  }

  const getChampionFallback = (championName: string) => {
    return championName.slice(0, 2).toUpperCase()
  }

  return (
    <Card 
      className={`group transition-all hover:shadow-lg border-slate-700/50 bg-slate-800/30 backdrop-blur ${
        match.win 
          ? 'border-l-4 border-l-green-400 hover:bg-green-900/10' 
          : 'border-l-4 border-l-red-400 hover:bg-red-900/10'
      } ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-6">
          {/* Left section - Time and Result */}
          <div className="flex flex-col items-center min-w-[80px]">
            <Badge 
              className={`mb-2 px-3 py-1 font-semibold ${
                match.win 
                  ? 'bg-green-600 text-white' 
                  : 'bg-red-600 text-white'
              }`}
            >
              {match.win ? "VICTORY" : "DEFEAT"}
            </Badge>
            <div className="text-slate-300 text-sm text-center">
              <div className="font-medium">{formatDuration(match.game_duration_minutes)}</div>
              <div className="text-xs text-slate-400">{formatTimeAgo(match.game_creation)}</div>
            </div>
          </div>

          {/* Champion and Role */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-14 w-14 border-2 border-purple-400/50">
                <AvatarImage 
                  src={getChampionImageUrl(match.champion_name)} 
                  alt={match.champion_name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white font-bold">
                  {getChampionFallback(match.champion_name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center border-2 border-slate-900">
                <span className="text-white text-xs font-bold">{match.team_position === "JUNGLE" ? "🌿" : "⚔️"}</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-white">{match.champion_name}</h3>
              <p className="text-sm text-slate-400">
                {QUEUE_TYPES[420] || "Ranked Solo"}
              </p>
            </div>
          </div>

          {/* KDA Stats */}
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="text-center">
              <div className={`text-lg font-bold ${
                match.kda_ratio >= 3.0 ? 'text-green-400' :
                match.kda_ratio >= 2.0 ? 'text-blue-400' :
                match.kda_ratio >= 1.0 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {formatKDA(match.kills, match.deaths, match.assists)}
              </div>
              <div className="text-sm text-slate-400">
                {match.kda_ratio.toFixed(2)} KDA
              </div>
            </div>
          </div>

          {/* Game Stats */}
          <div className="flex space-x-6 text-sm flex-1 justify-center">
            <div className="text-center">
              <div className="font-medium text-white">{match.cs}</div>
              <div className="text-xs text-slate-400">CS</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-white">{(match.cs / match.game_duration_minutes).toFixed(1)}</div>
              <div className="text-xs text-slate-400">CS/min</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-white">{(match.damage_to_champions / 1000).toFixed(1)}k</div>
              <div className="text-xs text-slate-400">Damage</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-white">{match.vision_score}</div>
              <div className="text-xs text-slate-400">Vision</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-white">{(match.gold_earned / 1000).toFixed(1)}k</div>
              <div className="text-xs text-slate-400">Gold</div>
            </div>
          </div>

          {/* Items placeholder - would need item data from backend */}
          <div className="flex space-x-1">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="w-8 h-8 bg-slate-700/50 rounded border border-slate-600 flex items-center justify-center">
                <span className="text-slate-500 text-xs">🔹</span>
              </div>
            ))}
          </div>

          {/* Click indicator */}
          {onClick && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-purple-400 text-xs">→</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
