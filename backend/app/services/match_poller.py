import asyncio
import logging
import json
from sqlalchemy import select
from sqlalchemy.orm import joinedload
try:
    from pywebpush import webpush, WebPushException
except ModuleNotFoundError:  # pragma: no cover - optional in test/dev environments
    webpush = None

    class WebPushException(Exception):
        pass

from app.database import AsyncSessionLocal
from app.models.notification import MatchSubscription
from app.services.sports_api import fetch_live_updates
from app.config import settings

logger = logging.getLogger(__name__)

def send_push_to_subscriptions(subscriptions: list, payload: dict):
    """Send standard web push to a list of subscription JSONs."""
    if not subscriptions or webpush is None:
        return
        
    payload_str = json.dumps(payload)
    for sub in subscriptions:
        try:
            webpush(
                subscription_info=sub,
                data=payload_str,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_SUBJECT or "mailto:admin@tambuatips.com"}
            )
        except WebPushException as ex:
            logger.error(f"Push WebPushException: {repr(ex.response.text if hasattr(ex, 'response') else ex)}")
        except Exception as ex:
            logger.error(f"Push Error: {str(ex)}")

async def poll_live_matches():
    """Background task to poll live matches and send push notifications."""
    logger.info("Started Background Match Poller.")
    while True:
        try:
            await asyncio.sleep(180)  # Check every 3 minutes
            
            async with AsyncSessionLocal() as db:
                # 1. Get all active subscriptions
                query = (
                    select(MatchSubscription)
                    .options(joinedload(MatchSubscription.user))
                    .where(MatchSubscription.last_status_notified != "finished")
                )
                result = await db.execute(query)
                subs = result.scalars().all()
                
                if not subs:
                    continue  # No specific matches to poll
                
                # 2. Get unique match IDs
                unique_match_ids = list(set([s.match_id for s in subs]))
                
                # 3. Fetch real-time statuses from API-Football
                live_updates = await fetch_live_updates(unique_match_ids)
                
                # Create a map of match_id -> live_update
                update_map = {f["id"]: f for f in live_updates}
                
                # 4. Check status changes and dispatch
                for sub in subs:
                    match_data = update_map.get(sub.match_id)
                    if not match_data:
                        continue
                    
                    current_status = match_data.get("status", "upcoming")
                    score = match_data.get("score", "0 - 0")
                    
                    home_team = match_data.get("homeTeam") or sub.home_team or "Home"
                    away_team = match_data.get("awayTeam") or sub.away_team or "Away"
                    
                    if current_status != sub.last_status_notified:
                        
                        # Decide payload depending on state transition
                        payload = None
                        
                        if current_status == "live" and sub.last_status_notified == "upcoming":
                            payload = {
                                "title": "⚽ Match Started!",
                                "body": f"{home_team} vs {away_team} is now live. Follow the action on TambuaTips!",
                                "url": f"/match/{sub.match_id}"
                            }
                        elif current_status == "finished" and sub.last_status_notified == "live":
                            payload = {
                                "title": "🏁 Full Time!",
                                "body": f"{home_team} vs {away_team} finished {score}.",
                                "url": f"/match/{sub.match_id}"
                            }
                            
                        # If we have a payload and user has push subscriptions
                        if payload and sub.user and isinstance(sub.user.push_subscriptions, list):
                            # Send Push
                            # For safety, avoid blocking the loop synchronously
                            send_push_to_subscriptions(sub.user.push_subscriptions, payload)
                            
                        # Update database state
                        sub.last_status_notified = current_status
                        db.add(sub)
                
                await db.commit()
                
        except asyncio.CancelledError:
            logger.info("Match Poller shutting down gracefully.")
            break
        except Exception as e:
            logger.error(f"Error in match poller loop: {str(e)}", exc_info=True)
            # Sleep briefly to avoid aggressive loop on crash
            await asyncio.sleep(60)
