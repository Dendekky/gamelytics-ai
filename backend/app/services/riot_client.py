import httpx
from typing import Optional, Dict, Any
from app.core.config import settings


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
        headers = self._get_headers()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    return None  # Account not found
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
        headers = self._get_headers()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    return None  # Summoner not found
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
        
        url = f"{base_url}/lol/match/v5/matches/by-puuid/{puuid}/ids"
        headers = self._get_headers()
        params = {"count": count}
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers, params=params)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    return []  # No matches found
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
        headers = self._get_headers()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    return None  # Match not found
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