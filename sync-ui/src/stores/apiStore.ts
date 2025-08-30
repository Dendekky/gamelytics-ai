import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useAppStore } from './appStore'

interface ApiState {
  // Actions
  connectAccount: () => Promise<void>
  syncMatches: () => Promise<void>
}

export const useApiStore = create<ApiState>()(
  devtools(
    (set, get) => ({
      connectAccount: async () => {
        const appStore = useAppStore.getState()
        const { 
          riotId, 
          gameName, 
          tagLine, 
          region, 
          inputMode,
          setLoading, 
          setError, 
          setSummonerData 
        } = appStore

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

        setLoading(true)
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

          const data = await response.json()
          setSummonerData(data)
          setError("")
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to connect account")
          setSummonerData(null)
        } finally {
          setLoading(false)
        }
      },

      syncMatches: async () => {
        const appStore = useAppStore.getState()
        const { summonerData, incrementRefreshTrigger } = appStore

        if (!summonerData) return

        try {
          const syncResponse = await fetch(
            `http://localhost:8000/api/v1/matches/${summonerData.puuid}?fetch_new=true&limit=20&region=${summonerData.region}`,
            { method: 'GET' }
          )
          if (syncResponse.ok) {
            console.log('✅ Successfully synced new matches')
            incrementRefreshTrigger()
          }
        } catch (error) {
          console.error('❌ Failed to sync matches:', error)
        }
      }
    }),
    {
      name: 'api-store'
    }
  )
)

// Helper function to parse Riot ID
const parseRiotId = (input: string): { gameName: string; tagLine: string } | null => {
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
