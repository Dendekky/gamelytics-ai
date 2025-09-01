import httpx
from typing import Optional, Dict, Any, List
from app.core.config import settings
from .rate_limiter import rate_limited_request, update_rate_limiter_from_response


class RiotClient:
    def __init__(self):
        self.api_key = settings.RIOT_API_KEY
        self.timeout = 30.0
        
        # Regional API endpoints mapping
        self.regional_endpoints = {
            "na1": "https://na1.api.riotgames.com",
            "euw1": "https://euw1.api.riotgames.com", 
            "eun1": "https://eun1.api.riotgames.com",
            "kr": "https://kr.api.riotgames.com",
            "jp1": "https://jp1.api.riotgames.com",
            "br1": "https://br1.api.riotgames.com",
            "la1": "https://la1.api.riotgames.com",
            "la2": "https://la2.api.riotgames.com",
            "oc1": "https://oc1.api.riotgames.com",
            "tr1": "https://tr1.api.riotgames.com",
            "ru": "https://ru.api.riotgames.com",
        }
        
        # Continental endpoints for match data and account info
        self.continental_endpoints = {
            "americas": "https://americas.api.riotgames.com",
            "europe": "https://europe.api.riotgames.com", 
            "asia": "https://asia.api.riotgames.com",
        }
        
        # Region to continental mapping
        self.region_to_continental = {
            "na1": "americas", "br1": "americas", "la1": "americas", "la2": "americas",
            "euw1": "europe", "eun1": "europe", "tr1": "europe", "ru": "europe",
            "kr": "asia", "jp1": "asia", "oc1": "asia",
        }
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Riot API requests"""
        return {
            "X-Riot-Token": self.api_key,
            "Content-Type": "application/json",
        }
    
    async def _make_rate_limited_request(self, url: str, endpoint_name: str = None) -> Optional[Dict[str, Any]]:
        """
        Make a rate-limited request to the Riot API
        
        Args:
            url: The full URL to request
            endpoint_name: Name of the endpoint for rate limiting tracking
            
        Returns:
            JSON response data or None if not found
        """
        headers = self._get_headers()
        
        # Apply rate limiting
        await rate_limited_request(endpoint_name)
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers)
                
                # Update rate limiter with response info
                update_rate_limiter_from_response(response.status_code, dict(response.headers))
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    return None  # Not found
                elif response.status_code == 403:
                    raise ValueError("Invalid or expired API key")
                elif response.status_code == 429:
                    raise ValueError("Rate limit exceeded")
                else:
                    response.raise_for_status()
                    
        except httpx.TimeoutException:
            raise ValueError("Request timed out")
        except httpx.RequestError as e:
            raise ValueError(f"Request failed: {str(e)}")
    
    def _get_regional_base_url(self, region: str) -> str:
        """Get the regional API base URL"""
        return self.regional_endpoints.get(region.lower())
    
    def _get_continental_base_url(self, region: str) -> str:
        """Get the continental API base URL"""
        continental = self.region_to_continental.get(region.lower())
        return self.continental_endpoints.get(continental) if continental else None
    
    async def get_account_by_riot_id(self, game_name: str, tag_line: str, region: str) -> Optional[Dict[str, Any]]:
        """
        Get account information by Riot ID (gameName#tagLine) from Account-v1 API
        This is the modern replacement for the deprecated summoner by-name endpoint
        """
        if not self.api_key:
            raise ValueError("RIOT_API_KEY is not configured")
        
        base_url = self._get_continental_base_url(region)
        if not base_url:
            raise ValueError(f"Unsupported region: {region}")
        
        url = f"{base_url}/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        return await self._make_rate_limited_request(url, "account-v1")
    
    async def get_summoner_by_puuid(self, puuid: str, region: str) -> Optional[Dict[str, Any]]:
        """
        Get summoner information by PUUID from Summoner-v4 API
        Use this after getting PUUID from account-v1 API
        """
        if not self.api_key:
            raise ValueError("RIOT_API_KEY is not configured")
        
        base_url = self._get_regional_base_url(region)
        if not base_url:
            raise ValueError(f"Unsupported region: {region}")
                
        url = f"{base_url}/lol/summoner/v4/summoners/by-puuid/{puuid}"
        return await self._make_rate_limited_request(url, "summoner-v4")
        
    async def get_summoner_by_riot_id(self, game_name: str, tag_line: str, region: str) -> Optional[Dict[str, Any]]:
        """
        Complete flow: Get account by Riot ID, then get summoner info by PUUID
        This combines account-v1 and summoner-v4 APIs for complete summoner information
        """
        # First, get the account information using Riot ID
        account_data = await self.get_account_by_riot_id(game_name, tag_line, region)
        print(f"ACCOUNT DATA: {account_data}")
        if not account_data:
            return None
        
        # Then, get summoner information using the PUUID
        puuid = account_data.get("puuid")
        if not puuid:
            raise ValueError("No PUUID found in account data")
        
        summoner_data = await self.get_summoner_by_puuid(puuid, region)
        if not summoner_data:
            return None
        
        print(f"SUMMONER DATA: {summoner_data}")
        
        # Combine the data for a complete response
        return {
            **summoner_data,
            "gameName": account_data.get("gameName"),
            "tagLine": account_data.get("tagLine"),
            "puuid": account_data.get("puuid")  # Ensure PUUID is included
        }

    # DEPRECATED: This method uses the deprecated by-name endpoint
    async def get_summoner_by_name(self, name: str, region: str) -> Optional[Dict[str, Any]]:
        """
        DEPRECATED: Get summoner information by name from Riot API
        
        This endpoint has been deprecated by Riot Games. Use get_summoner_by_riot_id() instead.
        Riot IDs have the format: gameName#tagLine (e.g., "PlayerName#1234")
        """
        if not self.api_key:
            raise ValueError("RIOT_API_KEY is not configured")
        
        base_url = self._get_regional_base_url(region)
        if not base_url:
            raise ValueError(f"Unsupported region: {region}")
        
        url = f"{base_url}/lol/summoner/v4/summoners/by-name/{name}"
        headers = self._get_headers()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers)

                print(f"DEPRECATED ENDPOINT RESPONSE: {response.status_code}")
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    return None  # Summoner not found
                elif response.status_code == 403:
                    raise ValueError("Invalid or expired API key, or endpoint is deprecated/restricted")
                elif response.status_code == 429:
                    raise ValueError("Rate limit exceeded")
                else:
                    response.raise_for_status()
                    
        except httpx.TimeoutException:
            raise ValueError("Request timed out")
        except httpx.RequestError as e:
            raise ValueError(f"Request failed: {str(e)}")
    
    async def get_match_history(self, puuid: str, region: str, count: int = 20) -> list[str]:
        """
        Get match history for a summoner by PUUID
        """
        if not self.api_key:
            raise ValueError("RIOT_API_KEY is not configured")
        
        base_url = self._get_continental_base_url(region)
        if not base_url:
            raise ValueError(f"Unsupported region: {region}")
        
        url = f"{base_url}/lol/match/v5/matches/by-puuid/{puuid}/ids?count={count}"
        result = await self._make_rate_limited_request(url, "match-v5")
        return result if result is not None else []
    
    async def get_match_details(self, match_id: str, region: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed match information by match ID
        """
        if not self.api_key:
            raise ValueError("RIOT_API_KEY is not configured")
        
        base_url = self._get_continental_base_url(region)
        if not base_url:
            raise ValueError(f"Unsupported region: {region}")
        
        url = f"{base_url}/lol/match/v5/matches/{match_id}"
        return await self._make_rate_limited_request(url, "match-v5")
    
    async def get_champion_masteries(self, summoner_id: str, region: str) -> List[Dict[str, Any]]:
        """
        Get champion mastery information for a summoner
        """
        if not self.api_key:
            raise ValueError("RIOT_API_KEY is not configured")
        
        base_url = self._get_regional_base_url(region)
        if not base_url:
            raise ValueError(f"Unsupported region: {region}")
        
        url = f"{base_url}/lol/champion-mastery/v4/champion-masteries/by-summoner/{summoner_id}"
        result = await self._make_rate_limited_request(url, "champion-mastery-v4")
        return result if result is not None else []
    
    async def get_champion_mastery_by_champion(self, summoner_id: str, champion_id: int, region: str) -> Optional[Dict[str, Any]]:
        """
        Get champion mastery for a specific champion
        """
        if not self.api_key:
            raise ValueError("RIOT_API_KEY is not configured")
        
        base_url = self._get_regional_base_url(region)
        if not base_url:
            raise ValueError(f"Unsupported region: {region}")
        
        url = f"{base_url}/lol/champion-mastery/v4/champion-masteries/by-summoner/{summoner_id}/by-champion/{champion_id}"
        return await self._make_rate_limited_request(url, "champion-mastery-v4")
    
    # ============================================================================
    # 🔴 LIVE GAME DETECTION & SPECTATOR API
    # ============================================================================
    
    async def get_active_game(self, summoner_id: str, region: str) -> Optional[Dict[str, Any]]:
        """
        Get active game information for a summoner using Spectator API
        
        Args:
            summoner_id: The summoner ID (not PUUID) for the player
            region: Regional endpoint to use
            
        Returns:
            Active game data if player is in game, None if not in game
        """
        if not self.api_key:
            raise ValueError("RIOT_API_KEY is not configured")
        
        base_url = self._get_regional_base_url(region)
        if not base_url:
            raise ValueError(f"Unsupported region: {region}")
        
        url = f"{base_url}/lol/spectator/v4/active-games/by-summoner/{summoner_id}"
        return await self._make_rate_limited_request(url, "spectator-v4")
    
    async def get_featured_games(self, region: str) -> Optional[Dict[str, Any]]:
        """
        Get list of featured games (high MMR/streamer games)
        
        Args:
            region: Regional endpoint to use
            
        Returns:
            Featured games data or None if no featured games
        """
        if not self.api_key:
            raise ValueError("RIOT_API_KEY is not configured")
        
        base_url = self._get_regional_base_url(region)
        if not base_url:
            raise ValueError(f"Unsupported region: {region}")
        
        url = f"{base_url}/lol/spectator/v4/featured-games"
        return await self._make_rate_limited_request(url, "spectator-v4")
    
    async def check_if_in_game(self, puuid: str, region: str) -> Optional[Dict[str, Any]]:
        """
        Complete flow: Check if a player (by PUUID) is currently in a live game
        
        This method combines summoner lookup and active game detection:
        1. Uses PUUID to get summoner_id
        2. Uses summoner_id to check for active game
        
        Args:
            puuid: Player PUUID
            region: Region for API calls
            
        Returns:
            Active game data if in game, None if not in game or not found
        """
        try:
            # First get summoner data to get summoner_id
            summoner_data = await self.get_summoner_by_puuid(puuid, region)
            if not summoner_data:
                return None
            
            summoner_id = summoner_data.get("id")
            if not summoner_id:
                return None
            
            # Now check for active game
            active_game = await self.get_active_game(summoner_id, region)
            
            if active_game:
                # Enhance the active game data with summoner info
                active_game["target_summoner"] = {
                    "puuid": puuid,
                    "summoner_id": summoner_id,
                    "summoner_name": summoner_data.get("name"),
                    "summoner_level": summoner_data.get("summonerLevel")
                }
            
            return active_game
            
        except Exception as e:
            print(f"Error checking if player in game: {str(e)}")
            return None