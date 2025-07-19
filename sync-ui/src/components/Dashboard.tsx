import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"

interface SummonerData {
  name: string
  region: string
}

interface SummonerResponse {
  puuid: string
  summoner_id: string
  account_id: string
  name: string
  level: number
  region: string
}

export function Dashboard() {
  const [summonerName, setSummonerName] = useState("")
  const [region, setRegion] = useState("na1")
  const [isLoading, setIsLoading] = useState(false)
  const [summonerData, setSummonerData] = useState<SummonerResponse | null>(null)
  const [error, setError] = useState("")

  const handleConnectAccount = async () => {
    if (!summonerName.trim()) {
      setError("Please enter a summoner name")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("http://localhost:8000/api/v1/summoners/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: summonerName.trim(),
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
            Enter your summoner name to get started with performance analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="summoner-name" className="text-sm font-medium">
              Summoner Name
            </label>
            <Input 
              id="summoner-name"
              placeholder="Enter your summoner name..."
              className="w-full"
              value={summonerName}
              onChange={(e) => setSummonerName(e.target.value)}
              disabled={isLoading}
            />
          </div>
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
              <option value="americas">North America</option>
              <option value="europe">Europe West</option>
              <option value="europe">Europe Nordic & East</option>
              <option value="asia">Korea</option>
              <option value="asia">Japan</option>
              <option value="americas">Brazil</option>
              <option value="americas">Latin America North</option>
              <option value="americas">Latin America South</option>
              <option value="asia">Oceania</option>
              <option value="asia">Turkey</option>
              <option value="asia">Russia</option>
            </Select>
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
          
          {summonerData && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
              ✅ Connected to {summonerData.name} (Level {summonerData.level})
            </div>
          )}
          
          <Button 
            className="w-full" 
            onClick={handleConnectAccount}
            disabled={isLoading}
          >
            {isLoading ? "Connecting..." : "Connect Account"}
          </Button>
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