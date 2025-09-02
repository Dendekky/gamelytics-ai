// Champion utility functions

// Cache for champion data
let championDataCache: Record<string, any> | null = null
let championDataCacheTime = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

async function getChampionData(): Promise<Record<string, any>> {
  const now = Date.now()
  
  // Return cached data if it's still valid
  if (championDataCache && (now - championDataCacheTime) < CACHE_DURATION) {
    return championDataCache
  }
  
  try {
    const response = await fetch('https://ddragon.leagueoflegends.com/cdn/14.1.1/data/en_US/champion.json')
    const data = await response.json()
    
    championDataCache = data.data || {}
    championDataCacheTime = now
    
    return championDataCache || {}
  } catch (error) {
    console.warn('Failed to fetch champion data, using fallback:', error)
    return championDataCache || {}
  }
}

export const getChampionImageUrlAsync = async (championName: string): Promise<string> => {
  try {
    const championData = await getChampionData()
    
    // Find the champion by name to get the correct key for the image URL
    const champion = Object.values(championData).find((champ: any) => 
      champ.name === championName
    ) as any
    
    if (champion && champion.id) {
      // Use the champion's ID from the API data (this handles all special cases correctly)
      return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${champion.id}.png`
    }
  } catch (error) {
    console.warn('Error getting champion image URL:', error)
  }
  
  // Fallback: format the name as before
  const formattedName = championName.replace(/[^a-zA-Z0-9]/g, '').replace(/\s+/g, '')
  return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${formattedName}.png`
}

// Pre-populate the cache on app startup
export const initializeChampionData = async (): Promise<void> => {
  try {
    await getChampionData()
    console.log('Champion data cache initialized')
  } catch (error) {
    console.warn('Failed to initialize champion data cache:', error)
  }
}

// Synchronous version for components that can't handle async
// This will use cached data if available, or fallback to basic formatting
export const getChampionImageUrlSync = (championName: string): string => {
  // If we have cached data, use it
  if (championDataCache) {
    const champion = Object.values(championDataCache).find((champ: any) => 
      champ.name === championName
    ) as any
    
    if (champion && champion.id) {
      return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${champion.id}.png`
    }
  }
  
  // Fallback formatting
  const formattedName = championName.replace(/[^a-zA-Z0-9]/g, '').replace(/\s+/g, '')
  return `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${formattedName}.png`
}

// Main export - synchronous version that uses cache when available
export const getChampionImageUrl = getChampionImageUrlSync

export const getChampionFallback = (championName: string): string => {
  return championName.slice(0, 2).toUpperCase()
}

export const getMasteryLevelIcon = (level: number): string => {
  const icons: Record<number, string> = {
    1: "🏅",
    2: "🥉", 
    3: "🥈",
    4: "🥇",
    5: "🎖️",
    6: "💎",
    7: "👑"
  }
  return icons[level] || "⭐"
}

export const getMasteryLevelColor = (level: number): string => {
  const colors: Record<number, string> = {
    1: "text-gray-400",
    2: "text-orange-400",
    3: "text-orange-500", 
    4: "text-blue-400",
    5: "text-blue-500",
    6: "text-purple-400",
    7: "text-yellow-400"
  }
  return colors[level] || "text-gray-400"
}

export const getMasteryLevelBadgeColor = (level: number): string => {
  const colors: Record<number, string> = {
    1: "bg-gray-600",
    2: "bg-orange-600",
    3: "bg-orange-500", 
    4: "bg-blue-600",
    5: "bg-blue-500",
    6: "bg-purple-600",
    7: "bg-yellow-600"
  }
  return colors[level] || "bg-gray-600"
}

export const formatMasteryPoints = (points: number): string => {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`
  } else if (points >= 1000) {
    return `${Math.floor(points / 1000)}k`
  }
  return points.toString()
}

// Dynamic champion ID to name mapping using cached Data Dragon data
export const getChampionNameById = (championId: number): string => {
  // If we have cached data, use it
  if (championDataCache) {
    const champion = Object.values(championDataCache).find((champ: any) => 
      parseInt(champ.key) === championId
    ) as any
    
    if (champion && champion.name) {
      return champion.name
    }
  }
  
  // Fallback to generic name
  return `Champion ${championId}`
}
