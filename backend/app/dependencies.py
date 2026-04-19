"""
FastAPI dependencies: database session + current user extraction.
"""

from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, UTC

from app.database import AsyncSessionLocal
from app.security import decode_token
from app.services.subscription_access import sync_user_subscription_summary

security_scheme = HTTPBearer(auto_error=False)


async def _auto_downgrade_expired_subscription(db: AsyncSession, user) -> bool:
    previous_tier = user.subscription_tier
    previous_expiry = user.subscription_expires_at
    sync_user_subscription_summary(user, now=datetime.now(UTC).replace(tzinfo=None))
    if user.subscription_tier != previous_tier or user.subscription_expires_at != previous_expiry:
        db.add(user)
        return True
    return False


async def get_db():
    """Yield an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Extract and validate the current user from the cookie token (or Bearer fallback).
    Returns the User ORM object or raises 401.
    
    Validates multi-session support:
    - Admins can have up to 4 active sessions
    - Regular users have only 1 active session
    """
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # Import here to avoid circular imports
    from app.models.user import User, UserSession

    result = await db.execute(
        select(User)
        .options(selectinload(User.subscription_entitlement_rows))
        .where(User.id == int(user_id))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    subscription_downgraded = await _auto_downgrade_expired_subscription(db, user)

    # Multi-device session validation
    session_id_from_token = payload.get("session_id")
    
    if session_id_from_token:
        # Check if session exists in the UserSession table
        result = await db.execute(
            select(UserSession).where(UserSession.session_id == session_id_from_token)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Session expired. Device logged in elsewhere."
            )
        
        # Update last_used_at timestamp
        session.last_used_at = datetime.now(UTC).replace(tzinfo=None)
        db.add(session)
        try:
            await db.commit()
        except Exception:
            await db.rollback()
    else:
        # Fallback for backward compatibility (old single-session system)
        if user.session_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Session expired. Device logged in elsewhere."
            )
        if subscription_downgraded:
            try:
                await db.commit()
            except Exception:
                await db.rollback()

    return user

async def get_unverified_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Extract current user from context but bypass is_active validation.
    Used strictly for verification routes.
    
    Validates multi-session support (same as get_current_user).
    """
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid payload")

    from app.models.user import User, UserSession
    result = await db.execute(
        select(User)
        .options(selectinload(User.subscription_entitlement_rows))
        .where(User.id == int(user_id))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    subscription_downgraded = await _auto_downgrade_expired_subscription(db, user)

    # Multi-device session validation
    session_id_from_token = payload.get("session_id")
    
    if session_id_from_token:
        # Check if session exists in the UserSession table
        result = await db.execute(
            select(UserSession).where(UserSession.session_id == session_id_from_token)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Session expired. Device logged in elsewhere."
            )
        
        # Update last_used_at timestamp
        session.last_used_at = datetime.now(UTC).replace(tzinfo=None)
        db.add(session)
        try:
            await db.commit()
        except Exception:
            await db.rollback()
    else:
        # Fallback for backward compatibility
        if user.session_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Session expired. Device logged in elsewhere."
            )
        if subscription_downgraded:
            try:
                await db.commit()
            except Exception:
                await db.rollback()

    return user


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Like get_current_user, but returns None instead of raising if not authenticated.
    Useful for endpoints that are public but show extra data for logged-in users.
    
    Validates multi-session support (same as get_current_user).
    """
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials
        
    if not token:
        return None

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    from app.models.user import User, UserSession

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    
    if user and not user.is_active:
        return None
    
    if user:
        subscription_downgraded = await _auto_downgrade_expired_subscription(db, user)

        # Multi-device session validation
        session_id_from_token = payload.get("session_id")
        
        if session_id_from_token:
            # Check if session exists in the UserSession table
            result = await db.execute(
                select(UserSession).where(UserSession.session_id == session_id_from_token)
            )
            session = result.scalar_one_or_none()
            
            if not session:
                return None
            
            # Update last_used_at timestamp
            session.last_used_at = datetime.now(UTC).replace(tzinfo=None)
            db.add(session)
            try:
                await db.commit()
            except Exception:
                pass  # Ignore errors in optional endpoint
        else:
            # Fallback for backward compatibility
            if user.session_id:
                return None
            if subscription_downgraded:
                try:
                    await db.commit()
                except Exception:
                    pass
        
    return user


async def require_admin(user=Depends(get_current_user)):
    """Require the current user to be an admin."""
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
