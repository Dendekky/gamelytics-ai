import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Crown, Sword, Shield, Eye, Coins } from "lucide-react"

interface DetailedMatchViewProps {
  matchId: string
  onBack: () => void
}

interface MatchParticipant {
  puuid: string
  participant_id: number
  team_id: number
  champion_id: number
  champion_name: string
  champion_level: number
  kills: number
  deaths: number
  assists: number
  kda_ratio: number
  total_damage_dealt_to_champions: number
  gold_earned: number
  total_minions_killed: number
  vision_score: number
  win: boolean
  items: {
    item0: number
    item1: number
    item2: number
    item3: number
    item4: number
    item5: number
    item6: number
  }
}

interface DetailedMatch {
  match_id: string
  game_creation: string
  game_duration: number
  duration_minutes: number
  game_mode: string
  game_type: string
  map_id: number
  queue_id: number
  winning_team: number
  participants: MatchParticipant[]
}

const getChampionImageUrl = (championName: string): string => {
  // Convert champion name to proper format for Data Dragon
  const formattedName = championName.replace(/[^a-zA-Z0-9]/g, '').replace(/\s+/g, '')
  return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${formattedName}.png`
}

const getItemImageUrl = (itemId: number): string => {
  if (itemId === 0) return '' // No item
  return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/item/${itemId}.png`
}

const getQueueName = (queueId: number): string => {
  const queueNames: { [key: number]: string } = {
    420: "Ranked Solo/Duo",
    440: "Ranked Flex",
    450: "ARAM",
    400: "Normal Draft",
    430: "Normal Blind",
    700: "Clash",
    900: "URF",
    1020: "One for All",
    1300: "Nexus Blitz",
    1400: "Ultimate Spellbook"
  }
  return queueNames[queueId] || `Queue ${queueId}`
}

export function DetailedMatchView({ matchId, onBack }: DetailedMatchViewProps) {
  const { data: match, isLoading, error } = useQuery({
    queryKey: ['detailed-match', matchId],
    queryFn: async (): Promise<DetailedMatch> => {
      const response = await fetch(
        `http://localhost:8000/api/v1/matches/detail/${matchId}?include_participants=true`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch match details')
      }
      return response.json()
    },
    enabled: !!matchId,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              Failed to load match details. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Separate teams
  const team1 = match.participants.filter(p => p.team_id === 100).sort((a, b) => a.participant_id - b.participant_id)
  const team2 = match.participants.filter(p => p.team_id === 200).sort((a, b) => a.participant_id - b.participant_id)
  
  const team1Won = match.winning_team === 100
  const team2Won = match.winning_team === 200

  // Calculate team stats
  const getTeamStats = (team: MatchParticipant[]) => {
    return {
      kills: team.reduce((sum, p) => sum + p.kills, 0),
      deaths: team.reduce((sum, p) => sum + p.deaths, 0),
      assists: team.reduce((sum, p) => sum + p.assists, 0),
      gold: team.reduce((sum, p) => sum + p.gold_earned, 0),
      damage: team.reduce((sum, p) => sum + p.total_damage_dealt_to_champions, 0),
      cs: team.reduce((sum, p) => sum + p.total_minions_killed, 0),
      vision: team.reduce((sum, p) => sum + p.vision_score, 0)
    }
  }

  const team1Stats = getTeamStats(team1)
  const team2Stats = getTeamStats(team2)

  const matchDate = new Date(match.game_creation).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Match History
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Match Details</h2>
            <p className="text-muted-foreground">
              {getQueueName(match.queue_id)} • {matchDate} • {match.duration_minutes}m
            </p>
          </div>
        </div>
      </div>

      {/* Match Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Match Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold">
                {team1Won ? 'Blue Team Victory' : 'Red Team Victory'}
              </div>
              <div className="text-lg text-muted-foreground">
                {team1Stats.kills + team1Stats.assists}/{team1Stats.deaths} vs{' '}
                {team2Stats.kills + team2Stats.assists}/{team2Stats.deaths}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sword className="w-5 h-5" />
              Total Damage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-600 font-medium">Blue Team</span>
                <span>{team1Stats.damage.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600 font-medium">Red Team</span>
                <span>{team2Stats.damage.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Total Gold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-600 font-medium">Blue Team</span>
                <span>{(team1Stats.gold / 1000).toFixed(1)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600 font-medium">Red Team</span>
                <span>{(team2Stats.gold / 1000).toFixed(1)}k</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Blue Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              Blue Team
              {team1Won && <Crown className="w-5 h-5 text-yellow-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {team1.map((participant) => (
                <div key={participant.participant_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  {/* Champion */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Avatar className="w-10 h-10">
                      <img 
                        src={getChampionImageUrl(participant.champion_name)}
                        alt={participant.champion_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/api/placeholder/40/40'
                        }}
                      />
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{participant.champion_name}</div>
                      <div className="text-sm text-muted-foreground">Level {participant.champion_level}</div>
                    </div>
                  </div>

                  {/* KDA */}
                  <div className="text-center min-w-[80px]">
                    <div className="font-medium">
                      {participant.kills}/{participant.deaths}/{participant.assists}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {participant.kda_ratio} KDA
                    </div>
                  </div>

                  {/* CS & Gold */}
                  <div className="text-center min-w-[80px]">
                    <div className="font-medium">{participant.total_minions_killed} CS</div>
                    <div className="text-sm text-muted-foreground">
                      {(participant.gold_earned / 1000).toFixed(1)}k gold
                    </div>
                  </div>

                  {/* Items */}
                  <div className="flex gap-1">
                    {[
                      participant.items.item0,
                      participant.items.item1,
                      participant.items.item2,
                      participant.items.item3,
                      participant.items.item4,
                      participant.items.item5,
                      participant.items.item6
                    ].map((itemId, index) => (
                      <div key={index} className="w-8 h-8 bg-gray-200 rounded border">
                        {itemId !== 0 && (
                          <img
                            src={getItemImageUrl(itemId)}
                            alt={`Item ${itemId}`}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Red Team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              Red Team
              {team2Won && <Crown className="w-5 h-5 text-yellow-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {team2.map((participant) => (
                <div key={participant.participant_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  {/* Champion */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Avatar className="w-10 h-10">
                      <img 
                        src={getChampionImageUrl(participant.champion_name)}
                        alt={participant.champion_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/api/placeholder/40/40'
                        }}
                      />
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{participant.champion_name}</div>
                      <div className="text-sm text-muted-foreground">Level {participant.champion_level}</div>
                    </div>
                  </div>

                  {/* KDA */}
                  <div className="text-center min-w-[80px]">
                    <div className="font-medium">
                      {participant.kills}/{participant.deaths}/{participant.assists}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {participant.kda_ratio} KDA
                    </div>
                  </div>

                  {/* CS & Gold */}
                  <div className="text-center min-w-[80px]">
                    <div className="font-medium">{participant.total_minions_killed} CS</div>
                    <div className="text-sm text-muted-foreground">
                      {(participant.gold_earned / 1000).toFixed(1)}k gold
                    </div>
                  </div>

                  {/* Items */}
                  <div className="flex gap-1">
                    {[
                      participant.items.item0,
                      participant.items.item1,
                      participant.items.item2,
                      participant.items.item3,
                      participant.items.item4,
                      participant.items.item5,
                      participant.items.item6
                    ].map((itemId, index) => (
                      <div key={index} className="w-8 h-8 bg-gray-200 rounded border">
                        {itemId !== 0 && (
                          <img
                            src={getItemImageUrl(itemId)}
                            alt={`Item ${itemId}`}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Statistics Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Team Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="font-medium text-sm text-muted-foreground mb-2">Kills</div>
              <div className="text-2xl font-bold text-blue-600">{team1Stats.kills}</div>
              <div className="text-sm text-muted-foreground">vs</div>
              <div className="text-2xl font-bold text-red-600">{team2Stats.kills}</div>
            </div>
            
            <div className="text-center">
              <div className="font-medium text-sm text-muted-foreground mb-2">Total CS</div>
              <div className="text-2xl font-bold text-blue-600">{team1Stats.cs}</div>
              <div className="text-sm text-muted-foreground">vs</div>
              <div className="text-2xl font-bold text-red-600">{team2Stats.cs}</div>
            </div>
            
            <div className="text-center">
              <div className="font-medium text-sm text-muted-foreground mb-2">Vision Score</div>
              <div className="text-2xl font-bold text-blue-600">{team1Stats.vision}</div>
              <div className="text-sm text-muted-foreground">vs</div>
              <div className="text-2xl font-bold text-red-600">{team2Stats.vision}</div>
            </div>
            
            <div className="text-center">
              <div className="font-medium text-sm text-muted-foreground mb-2">Total Damage</div>
              <div className="text-lg font-bold text-blue-600">{(team1Stats.damage / 1000).toFixed(0)}k</div>
              <div className="text-sm text-muted-foreground">vs</div>
              <div className="text-lg font-bold text-red-600">{(team2Stats.damage / 1000).toFixed(0)}k</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
