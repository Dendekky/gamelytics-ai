import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"

export function Dashboard() {
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
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="region" className="text-sm font-medium">
              Region
            </label>
            <Select id="region">
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
          <Button className="w-full">
            Connect Account
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