from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy import select

from app.models.campaign import Campaign
from app.database import AsyncSessionLocal
import html

router = APIRouter(
    prefix="/api/seo",
    tags=["SEO"]
)

@router.get("/campaign-preview/{slug}", response_class=HTMLResponse)
async def campaign_preview(slug: str, request: Request):
    """
    Renders a raw HTML metadata payload designed purely for social media bots (WhatsApp, FB, Twitter).
    A <script> redirect instantly boots normal browsers back to the React app route.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Campaign).where(Campaign.slug == slug).limit(1))
        campaign = result.scalar_one_or_none()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        # Sanitize variables for HTML insertion
        title = html.escape(campaign.title)
        desc = html.escape(f"Check out the {campaign.title} on TambuaTips!")
        image_url = html.escape(campaign.og_image_url if campaign.og_image_url else "https://tambuatips.com/og-image.png")
        base_url = "https://tambuatips.com"
        
        # Build raw HTML response for scrapers
        # The meta refresh + JS ensures human browsers pop back to actual react router
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>{title} — TambuaTips</title>
            
            <!-- Open Graph / Facebook -->
            <meta property="og:type" content="website">
            <meta property="og:url" content="{base_url}/?c={slug}">
            <meta property="og:title" content="{title}">
            <meta property="og:description" content="{desc}">
            <meta property="og:image" content="{image_url}">

            <!-- Twitter -->
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:url" content="{base_url}/?c={slug}">
            <meta name="twitter:title" content="{title}">
            <meta name="twitter:description" content="{desc}">
            <meta name="twitter:image" content="{image_url}">
            
            <meta http-equiv="refresh" content="0; url={base_url}/?c={slug}">
            <script>
                window.location.replace("{base_url}/?c={slug}");
            </script>
        </head>
        <body>
            <p>Redirecting to <a href="{base_url}/?c={slug}">TambuaTips...</a></p>
        </body>
        </html>
        """
        return html_content
