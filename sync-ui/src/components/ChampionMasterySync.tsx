import { useState } from "react"
import { Button } from "./ui/button"

interface ChampionMasterySyncProps {
  puuid: string
  region?: string
  onSyncComplete?: () => void
}

export function ChampionMasterySync({ puuid, region = "na1", onSyncComplete }: ChampionMasterySyncProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSync = async () => {
    setIsLoading(true)
    setError("")
    setSuccess(false)

    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/champion-mastery/${puuid}/sync?region=${region}`,
        { method: 'POST' }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to sync champion masteries')
      }

      const data = await response.json()
      console.log('Champion mastery sync result:', data)
      setSuccess(true)
      
      if (onSyncComplete) {
        onSyncComplete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-2">
        <div className="text-green-400 text-sm">✓ Champion masteries synced!</div>
      </div>
    )
  }

  return (
    <div className="text-center py-2">
      <Button
        onClick={handleSync}
        disabled={isLoading}
        size="sm"
        variant="outline"
        className="border-purple-400/30 text-purple-300 hover:bg-purple-600/20"
      >
        {isLoading ? 'Syncing...' : 'Sync Champion Data'}
      </Button>
      {error && (
        <div className="text-red-400 text-xs mt-1">{error}</div>
      )}
    </div>
  )
}
