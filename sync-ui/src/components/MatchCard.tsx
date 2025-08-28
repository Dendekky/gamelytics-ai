import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { type PlayerMatchPerformance, QUEUE_TYPES, MAP_NAMES } from "@/types/match"

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
    // Using DataDragon CDN for champion images (more reliable)
    const formattedName = championName.replace(/[^a-zA-Z0-9]/g, '').replace(/\s+/g, '')
    return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${formattedName}.png`
  }

  const getChampionFallback = (championName: string) => {
    return championName.slice(0, 2).toUpperCase()
  }

  return (
    <Card 
      className={`group transition-all hover:shadow-md ${match.win ? 'border-l-4 border-l-green-500 bg-green-50/30' : 'border-l-4 border-l-red-500 bg-red-50/30'} ${onClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Left side - Champion and Result */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-slate-300">
                <AvatarImage 
                  src={getChampionImageUrl(match.champion_name)} 
                  alt={match.champion_name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
                  {getChampionFallback(match.champion_name)}
                </AvatarFallback>
              </Avatar>
              <Badge 
                variant={match.win ? "success" : "destructive"} 
                className="absolute -bottom-1 -right-1 px-1 py-0 text-xs"
              >
                {match.win ? "W" : "L"}
              </Badge>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg">{match.champion_name}</h3>
              <p className="text-sm text-muted-foreground">
                {formatTimeAgo(match.game_creation)}
              </p>
            </div>
          </div>

          {/* Center - KDA and Stats */}
          <div className="flex flex-col items-center space-y-2">
            <div className="text-center">
              <div className="text-lg font-bold">
                {formatKDA(match.kills, match.deaths, match.assists)}
              </div>
              <div className={`text-sm ${getKDAColor(match.kda_ratio)}`}>
                {match.kda_ratio.toFixed(2)} KDA
              </div>
            </div>
            
            <div className="flex space-x-4 text-sm text-muted-foreground">
              <div className="text-center">
                <div className="font-medium">{match.cs}</div>
                <div className="text-xs">CS</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{(match.damage_to_champions / 1000).toFixed(1)}k</div>
                <div className="text-xs">DMG</div>
              </div>
              <div className="text-center">
                <div className="font-medium">{match.vision_score}</div>
                <div className="text-xs">Vision</div>
              </div>
            </div>
          </div>

          {/* Right side - Game Info */}
          <div className="text-right">
            <div className="font-medium">{formatDuration(match.game_duration_minutes)}</div>
            <div className="text-sm text-muted-foreground">
              {QUEUE_TYPES[420] || "Custom Game"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {(match.gold_earned / 1000).toFixed(1)}k gold
            </div>
            {onClick && (
              <div className="text-xs text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Click for details →
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
