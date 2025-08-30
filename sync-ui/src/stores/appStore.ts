import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface SummonerResponse {
  puuid: string
  summoner_id: string
  account_id: string
  name?: string
  game_name?: string
  tag_line?: string
  level: number
  region: string
}

interface AppState {
  // Summoner data
  summonerData: SummonerResponse | null
  isLoading: boolean
  error: string
  
  // UI state
  activeTab: 'overview' | 'champions' | 'matches' | 'analytics'
  inputMode: 'single' | 'separate'
  
  // Form data
  riotId: string
  gameName: string
  tagLine: string
  region: string
  
  // Data refresh
  refreshTrigger: number
  
  // Actions
  setSummonerData: (data: SummonerResponse | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string) => void
  setActiveTab: (tab: 'overview' | 'champions' | 'matches' | 'analytics') => void
  setInputMode: (mode: 'single' | 'separate') => void
  setRiotId: (id: string) => void
  setGameName: (name: string) => void
  setTagLine: (tag: string) => void
  setRegion: (region: string) => void
  incrementRefreshTrigger: () => void
  resetForm: () => void
  disconnect: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      summonerData: null,
      isLoading: false,
      error: '',
      activeTab: 'overview',
      inputMode: 'single',
      riotId: '',
      gameName: '',
      tagLine: '',
      region: 'na1',
      refreshTrigger: 0,
      
      // Actions
      setSummonerData: (data) => set({ summonerData: data }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setInputMode: (mode) => set({ inputMode: mode }),
      setRiotId: (id) => set({ riotId: id }),
      setGameName: (name) => set({ gameName: name }),
      setTagLine: (tag) => set({ tagLine: tag }),
      setRegion: (region) => set({ region }),
      incrementRefreshTrigger: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
      resetForm: () => set({
        riotId: '',
        gameName: '',
        tagLine: '',
        error: ''
      }),
      disconnect: () => set({
        summonerData: null,
        error: '',
        riotId: '',
        gameName: '',
        tagLine: ''
      })
    }),
    {
      name: 'app-store'
    }
  )
)
