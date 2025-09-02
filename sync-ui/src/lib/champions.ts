// Champion utility functions

// Cache for champion data and version
let championDataCache: Record<string, any> | null = null
let championDataCacheTime = 0
let latestVersionCache: string | null = null
let versionCacheTime = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
const VERSION_CACHE_DURATION = 60 * 60 * 1000 // 1 hour for version checks

async function getLatestVersion(): Promise<string> {
  const now = Date.now()
  
  // Return cached version if it's still valid
  if (latestVersionCache && (now - versionCacheTime) < VERSION_CACHE_DURATION) {
    return latestVersionCache
  }
  
  try {
    const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json')
    const versions = await response.json()
    
    latestVersionCache = versions[0] // First version is the latest
    versionCacheTime = now
    
    return latestVersionCache!
  } catch (error) {
    console.warn('Failed to fetch latest version, using fallback:', error)
    return latestVersionCache || '15.17.1' // Fallback to known working version
  }
}

async function getChampionData(): Promise<Record<string, any>> {
  const now = Date.now()
  
  // Return cached data if it's still valid
  if (championDataCache && (now - championDataCacheTime) < CACHE_DURATION) {
    return championDataCache
  }
  
  try {
    const latestVersion = await getLatestVersion()
    const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`)
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
    const [championData, latestVersion] = await Promise.all([
      getChampionData(),
      getLatestVersion()
    ])
    
    // Find the champion by name to get the correct key for the image URL
    const champion = Object.values(championData).find((champ: any) => 
      champ.name === championName
    ) as any
    
    if (champion && champion.id) {
      // Use the champion's ID from the API data (this handles all special cases correctly)
      return `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champion.id}.png`
    }
  } catch (error) {
    console.warn('Error getting champion image URL:', error)
  }
  
  // Fallback: format the name as before
  const latestVersion = await getLatestVersion()
  const formattedName = championName.replace(/[^a-zA-Z0-9]/g, '').replace(/\s+/g, '')
  return `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${formattedName}.png`
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
  const version = latestVersionCache || '15.17.1' // Use cached version or fallback
  
  // If we have cached data, use it
  if (championDataCache) {
    const champion = Object.values(championDataCache).find((champ: any) => 
      champ.name === championName
    ) as any
    
    if (champion && champion.id) {
      return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`
    }
  }
  
  // Fallback formatting
  const formattedName = championName.replace(/[^a-zA-Z0-9]/g, '').replace(/\s+/g, '')
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${formattedName}.png`
}

// Export the latest version function for use in other components
export const getLatestDataDragonVersion = getLatestVersion

// Main export - synchronous version that uses cache when available
export const getChampionImageUrl = getChampionImageUrlSync

export const getChampionFallback = (championName: string): string => {
  return championName.slice(0, 2).toUpperCase()
}

// Helper function for getting any Data Dragon asset URL with latest version
export const getDataDragonAssetUrl = async (assetType: 'champion' | 'item' | 'profileicon', assetName: string | number): Promise<string> => {
  const latestVersion = await getLatestVersion()
  return `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/${assetType}/${assetName}.png`
}

// Synchronous version for components that can't handle async
export const getDataDragonAssetUrlSync = (assetType: 'champion' | 'item' | 'profileicon', assetName: string | number): string => {
  const version = latestVersionCache || '15.17.1'
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/${assetType}/${assetName}.png`
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
