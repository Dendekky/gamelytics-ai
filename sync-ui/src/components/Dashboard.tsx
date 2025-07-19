import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"

interface SummonerRiotIdData {
  game_name: string
  tag_line: string
  region: string
}

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

  const parseRiotId = (input: string): { gameName: string; tagLine: string } | null => {
    // Parse "GameName#1234" format
    const match = input.match(/^(.+)#(.+)$/)
    if (match && match[1] && match[2]) {
      return {
        gameName: match[1].trim(),
        tagLine: match[2].trim()
      }
    }
    return null
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">GG-Sync</h1>
        <p className="text-muted-foreground text-lg">
          League of Legends Performance Analysis Engine
        </p>
      </div>

      {/* Summoner Setup Section */}
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>🔍 Connect Your Account</CardTitle>
          <CardDescription>
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
            >
              Riot ID
            </Button>
            <Button
              variant={inputMode === "separate" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("separate")}
              disabled={isLoading}
            >
              Separate Fields
            </Button>
          </div>

          {inputMode === "single" ? (
            <div className="space-y-2">
              <label htmlFor="riot-id" className="text-sm font-medium">
                Riot ID
              </label>
              <Input 
                id="riot-id"
                placeholder="GameName#1234"
                className="w-full"
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Format: GameName#TagLine (e.g., "PlayerName#1234")
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="game-name" className="text-sm font-medium">
                  Game Name
                </label>
                <Input 
                  id="game-name"
                  placeholder="PlayerName"
                  className="w-full"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  The part before # in your Riot ID
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="tag-line" className="text-sm font-medium">
                  Tag Line
                </label>
                <Input 
                  id="tag-line"
                  placeholder="1234"
                  className="w-full"
                  value={tagLine}
                  onChange={(e) => setTagLine(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  The part after # in your Riot ID
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="region" className="text-sm font-medium">
              Region
            </label>
            <Select 
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={isLoading}
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
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
          
          {summonerData && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
              ✅ Connected to {summonerData.game_name || summonerData.name || "Unknown"}
              {summonerData.tag_line && `#${summonerData.tag_line}`}
              {summonerData.level && ` (Level ${summonerData.level})`}
            </div>
          )}
          
          <Button 
            className="w-full" 
            onClick={handleConnectAccount}
            disabled={isLoading}
          >
            {isLoading ? "Connecting..." : "Connect Account"}
          </Button>

          {/* Help Section */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 How to find your Riot ID:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• In League client: hover over your name</li>
              <li>• In game: look at the scoreboard</li>
              <li>• Format is always: GameName#TagLine</li>
              <li>• Example: "Hide on bush#KR1"</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Analytics
            </CardTitle>
            <CardDescription>
              Deep performance insights and GPI-style radar charts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏆 Champions
            </CardTitle>
            <CardDescription>
              Champion-specific stats and mastery tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📜 Match History
            </CardTitle>
            <CardDescription>
              Detailed match breakdown and timeline analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 