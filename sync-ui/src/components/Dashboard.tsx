import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MatchHistory } from "./MatchHistory"
import { Analytics } from "./Analytics"

interface SummonerResponse {
  puuid: string
  summoner_id: string
  account_id: string
  name?: string // Optional, may be null due to deprecation
  game_name?: string
  tag_line?: string
  level: number
  region: string
}

export function Dashboard() {
  const [riotId, setRiotId] = useState("") // For single input like "GameName#1234"
  const [gameName, setGameName] = useState("") // For separate inputs
  const [tagLine, setTagLine] = useState("")
  const [region, setRegion] = useState("na1")
  const [inputMode, setInputMode] = useState<"single" | "separate">("single")
  const [isLoading, setIsLoading] = useState(false)
  const [summonerData, setSummonerData] = useState<SummonerResponse | null>(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"overview" | "champions" | "matches" | "analytics">("overview")

  const parseRiotId = (input: string): { gameName: string; tagLine: string } | null => {
    // Parse "GameName#1234" format
    const match = input.match(/^(.+)#(.+)$/)
    if (match && match[1] && match[2]) {
      return {
        gameName: match[1].trim(),
        tagLine: match[2].trim()
      }
    }
    return {
      gameName: input,
      tagLine: ""
    }
  }

  const handleConnectAccount = async () => {
    let finalGameName = ""
    let finalTagLine = ""

    if (inputMode === "single") {
      if (!riotId.trim()) {
        setError("Please enter a Riot ID (GameName#1234)")
        return
      }

      const parsed = parseRiotId(riotId.trim())
      if (!parsed) {
        setError("Invalid Riot ID format. Please use: GameName#1234")
        return
      }

      finalGameName = parsed.gameName
      finalTagLine = parsed.tagLine
    } else {
      if (!gameName.trim() || !tagLine.trim()) {
        setError("Please enter both game name and tag line")
        return
      }

      finalGameName = gameName.trim()
      finalTagLine = tagLine.trim()
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("http://localhost:8000/api/v1/summoners/lookup-by-riot-id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          game_name: finalGameName,
          tag_line: finalTagLine,
          region: region,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to connect account")
      }

      const data: SummonerResponse = await response.json()
      setSummonerData(data)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect account")
      setSummonerData(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                GameLytics AI
              </h1>
              <Badge variant="outline" className="border-purple-400/30 text-purple-300">
                Beta
              </Badge>
            </div>
            {!summonerData && (
              <Button onClick={() => {/* Open search modal */}} variant="outline" className="border-purple-400/30 text-purple-300">
                Connect Account
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {!summonerData ? (
          /* Account Connection */
          <div className="max-w-md mx-auto">
            <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">🔍 Connect Your Account</CardTitle>
                <CardDescription className="text-slate-300">
                  Enter your Riot ID to get started with performance analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Input Mode Toggle */}
                <div className="flex space-x-2">
                  <Button
                    variant={inputMode === "single" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInputMode("single")}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Riot ID
                  </Button>
                  <Button
                    variant={inputMode === "separate" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInputMode("separate")}
                    disabled={isLoading}
                    className="border-purple-400/30"
                  >
                    Separate Fields
                  </Button>
                </div>

                {inputMode === "single" ? (
                  <div className="space-y-2">
                    <label htmlFor="riot-id" className="text-sm font-medium text-white">
                      Riot ID
                    </label>
                    <Input 
                      id="riot-id"
                      placeholder="GameName#1234"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                      value={riotId}
                      onChange={(e) => setRiotId(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-slate-400">
                      Format: GameName#TagLine (e.g., "PlayerName#1234")
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label htmlFor="game-name" className="text-sm font-medium text-white">
                        Game Name
                      </label>
                      <Input 
                        id="game-name"
                        placeholder="PlayerName"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="tag-line" className="text-sm font-medium text-white">
                        Tag Line
                      </label>
                      <Input 
                        id="tag-line"
                        placeholder="1234"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                        value={tagLine}
                        onChange={(e) => setTagLine(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="region" className="text-sm font-medium text-white">
                    Region
                  </label>
                  <Select 
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  >
                    <option value="na1">North America</option>
                    <option value="euw1">Europe West</option>
                    <option value="eun1">Europe Nordic & East</option>
                    <option value="kr">Korea</option>
                    <option value="jp1">Japan</option>
                    <option value="br1">Brazil</option>
                    <option value="la1">Latin America North</option>
                    <option value="la2">Latin America South</option>
                    <option value="oc1">Oceania</option>
                    <option value="tr1">Turkey</option>
                    <option value="ru">Russia</option>
                  </Select>
                </div>
                
                {error && (
                  <div className="text-sm text-red-400 bg-red-900/20 border border-red-500/20 p-3 rounded-md">
                    {error}
                  </div>
                )}
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700" 
                  onClick={handleConnectAccount}
                  disabled={isLoading}
                >
                  {isLoading ? "Connecting..." : "Connect Account"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Main Dashboard */
          <div className="space-y-8">
            {/* Player Profile Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-purple-400/50">
                    <AvatarImage src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/588.png`} />
                    <AvatarFallback className="bg-purple-600 text-white text-xl">
                      {(summonerData.game_name || summonerData.name || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-xs px-2 py-1 rounded-full border-2 border-slate-900">
                    {summonerData.level}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {summonerData.game_name || summonerData.name || "Unknown"}
                    {summonerData.tag_line && (
                      <span className="text-slate-400 font-normal">#{summonerData.tag_line}</span>
                    )}
                  </h2>
                  <div className="flex items-center space-x-3 mt-1">
                    <Badge className="bg-purple-600 text-white">#{region.toUpperCase()}</Badge>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      Level {summonerData.level}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSummonerData(null)
                  setError("")
                  setRiotId("")
                  setGameName("")
                  setTagLine("")
                }}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Disconnect
              </Button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg w-fit backdrop-blur border border-slate-700/50">
              {[
                { id: "overview", label: "Overview", icon: "📊" },
                { id: "champions", label: "Champion Pool", icon: "🏆" },
                { id: "matches", label: "Match History", icon: "📜" },
                { id: "analytics", label: "Analytics", icon: "📈" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[600px]">
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Performance Summary */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
                      <CardHeader>
                        <CardTitle className="text-white">Recent Activity</CardTitle>
                        <CardDescription className="text-slate-300">Last 20 games</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4 mb-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-400">15W</div>
                            <div className="text-sm text-slate-400">Wins</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-400">5L</div>
                            <div className="text-sm text-slate-400">Losses</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">75%</div>
                            <div className="text-sm text-slate-400">Win Rate</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">2.4</div>
                            <div className="text-sm text-slate-400">Avg KDA</div>
                          </div>
                        </div>
                        {/* Activity Heatmap Placeholder */}
                        <div className="h-24 bg-slate-700/30 rounded-lg flex items-center justify-center border border-slate-600/30">
                          <span className="text-slate-400 text-sm">Activity Heatmap (Coming Soon)</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Recent Matches */}
                    <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
                      <CardHeader>
                        <CardTitle className="text-white">Recent Matches</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[1,2,3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold">🏆</span>
                                </div>
                                <div>
                                  <div className="text-white font-medium">Ranked Solo</div>
                                  <div className="text-slate-400 text-sm">Victory • 23m 45s</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-purple-400 font-medium">12/3/8</div>
                                <div className="text-slate-400 text-sm">4.0 KDA</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sidebar Stats */}
                  <div className="space-y-6">
                    <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
                      <CardHeader>
                        <CardTitle className="text-white">Primary Role</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center space-y-2">
                          <div className="text-4xl">🌿</div>
                          <div className="text-xl font-bold text-purple-400">Jungle</div>
                          <div className="text-slate-400 text-sm">22 games • 59.1% WR</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur">
                      <CardHeader>
                        <CardTitle className="text-white">Top Champions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {["Amumu", "Fiddlesticks", "Jarvan IV"].map((champ, i) => (
                            <div key={champ} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">{i+1}</span>
                                </div>
                                <span className="text-white">{champ}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-purple-400 text-sm">65% WR</div>
                                <div className="text-slate-400 text-xs">8 games</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "champions" && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🏆</div>
                  <h3 className="text-2xl font-bold text-white mb-2">Champion Pool Analysis</h3>
                  <p className="text-slate-400 mb-6">Detailed champion statistics and performance insights</p>
                  <Badge variant="outline" className="border-purple-400/30 text-purple-300">
                    Coming Soon
                  </Badge>
                </div>
              )}

              {activeTab === "matches" && (
                <MatchHistory 
                  puuid={summonerData.puuid} 
                  summonerName={summonerData.game_name && summonerData.tag_line 
                    ? `${summonerData.game_name}#${summonerData.tag_line}`
                    : summonerData.name || "Unknown Summoner"
                  }
                />
              )}

              {activeTab === "analytics" && (
                <Analytics 
                  puuid={summonerData.puuid} 
                  summonerName={summonerData.game_name && summonerData.tag_line 
                    ? `${summonerData.game_name}#${summonerData.tag_line}`
                    : summonerData.name || "Unknown Summoner"
                  }
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 