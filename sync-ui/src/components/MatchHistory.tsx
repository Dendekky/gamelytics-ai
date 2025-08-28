import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MatchCard } from "./MatchCard"
import { DetailedMatchView } from "./DetailedMatchView"
import { type PlayerMatchPerformance } from "@/types/match"

interface MatchHistoryProps {
  puuid: string
  summonerName?: string
}

export function MatchHistory({ puuid, summonerName }: MatchHistoryProps) {
  const [limit, setLimit] = useState(20)
  const [fetchingNew, setFetchingNew] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  // Fetch match performance data
  const { data: matchPerformance, isLoading, error, refetch } = useQuery({
    queryKey: ['match-performance', puuid, limit],
    queryFn: async (): Promise<PlayerMatchPerformance[]> => {
      const response = await fetch(
        `http://localhost:8000/api/v1/matches/${puuid}/performance?limit=${limit}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch match history')
      }
      return response.json()
    },
    enabled: !!puuid,
  })

  // Function to fetch new matches from Riot API
  const fetchNewMatches = async () => {
    setFetchingNew(true)
    try {
      // First, trigger fetching new matches from Riot API
      const response = await fetch(
        `http://localhost:8000/api/v1/matches/${puuid}?fetch_new=true&limit=${Math.max(limit, 20)}&region=na1`,
        { method: 'GET' }
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch new matches')
      }
      
      // Refetch the performance data to get updated results
      await refetch()
    } catch (error) {
      console.error('Error fetching new matches:', error)
    } finally {
      setFetchingNew(false)
    }
  }

  // Calculate stats from match data
  const calculateStats = (matches: PlayerMatchPerformance[]) => {
    if (!matches || matches.length === 0) {
      return { winRate: 0, avgKDA: 0, avgCS: 0, totalGames: 0 }
    }

    const wins = matches.filter(match => match.win).length
    const totalGames = matches.length
    const winRate = (wins / totalGames) * 100

    const avgKDA = matches.reduce((sum, match) => sum + match.kda_ratio, 0) / totalGames
    const avgCS = matches.reduce((sum, match) => sum + match.cs, 0) / totalGames

    return { winRate, avgKDA, avgCS, totalGames }
  }

  const stats = matchPerformance ? calculateStats(matchPerformance) : null

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading stats */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center space-y-2">
                  <Skeleton className="h-8 w-16 mx-auto" />
                  <Skeleton className="h-4 w-12 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loading match cards */}
        <Card>
          <CardHeader>
            <CardTitle>Match History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Failed to load match history</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!matchPerformance || matchPerformance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">No match history found</p>
            <Button onClick={fetchNewMatches} disabled={fetchingNew}>
              {fetchingNew ? "Fetching..." : "Fetch Recent Matches"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If a match is selected, show detailed view
  if (selectedMatchId) {
    return (
      <DetailedMatchView 
        matchId={selectedMatchId} 
        onBack={() => setSelectedMatchId(null)} 
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Performance
              {summonerName && (
                <span className="text-base font-normal text-muted-foreground">
                  {summonerName}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.winRate.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.avgKDA.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Avg KDA</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.avgCS.toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">Avg CS</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.totalGames}
                </div>
                <div className="text-sm text-muted-foreground">Games</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Match History
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{matchPerformance.length} matches</Badge>
              <div className="flex space-x-2">
                <Button 
                  onClick={fetchNewMatches} 
                  disabled={fetchingNew}
                  size="sm"
                  variant="outline"
                >
                  {fetchingNew ? "Syncing..." : "Sync New"}
                </Button>
                <Button 
                  onClick={() => setLimit(prev => Math.min(prev + 10, 50))} 
                  disabled={isLoading || limit >= 50}
                  size="sm"
                  variant="outline"
                >
                  Load More
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {matchPerformance.map((match) => (
            <MatchCard 
              key={match.match_id} 
              match={match} 
              onClick={() => setSelectedMatchId(match.match_id)}
            />
          ))}
          
          {matchPerformance.length >= limit && (
            <div className="text-center pt-4">
              <Button 
                onClick={() => setLimit(prev => prev + 10)} 
                variant="outline"
                disabled={isLoading}
              >
                Load More Matches
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
