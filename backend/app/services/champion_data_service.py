from typing import Dict, Optional
from app.services.riot_client import RiotClient
from app.services.cache_service import cache_champion_data


class ChampionDataService:
    """Service for managing champion static data from Riot's Data Dragon API"""
    
    _champion_data_cache: Optional[Dict[int, str]] = None
    
    @staticmethod
    @cache_champion_data(ttl_seconds=86400)  # Cache for 24 hours
    async def get_champion_id_to_name_mapping() -> Dict[int, str]:
        """
        Get a mapping of champion IDs to names from Data Dragon API
        
        Returns:
            Dictionary mapping champion IDs (int) to champion names (str)
        """
        riot_client = RiotClient()
        champion_data = await riot_client.get_champion_data()
        
        if not champion_data or 'data' not in champion_data:
            return {}
        
        # Build mapping from champion key (ID) to name
        id_to_name = {}
        for champion_info in champion_data['data'].values():
            champion_id = int(champion_info['key'])
            champion_name = champion_info['name']
            id_to_name[champion_id] = champion_name
        
        return id_to_name
    
    @staticmethod
    async def get_champion_name_by_id(champion_id: int) -> str:
        """
        Get champion name by ID, with fallback to generic name
        
        Args:
            champion_id: The champion ID
            
        Returns:
            Champion name or fallback "Champion {id}"
        """
        try:
            id_to_name_mapping = await ChampionDataService.get_champion_id_to_name_mapping()
            return id_to_name_mapping.get(champion_id, f"Champion {champion_id}")
        except Exception:
            # Fallback if API fails
            return f"Champion {champion_id}"
