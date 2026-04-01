from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.pricing import PricingRegion

async def get_pricing_region(db: AsyncSession, country_code: str) -> PricingRegion:
    """
    Returns the appropriate pricing region for a given country code.
    If the country is found in any region's `countries` JSON list, it returns that region.
    If not, it falls back to the default region (e.g. 'international').
    """
    result = await db.execute(select(PricingRegion))
    regions = result.scalars().all()
    
    default_region = None
    
    for region in regions:
        if region.is_default:
            default_region = region
            
        # Ensure it's a list
        countries = region.countries if isinstance(region.countries, list) else []
        
        if country_code and country_code.upper() in countries:
            return region
            
    return default_region
