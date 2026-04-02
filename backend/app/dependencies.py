"""
FastAPI dependencies: database session + current user extraction.
"""

from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.security import decode_token

security_scheme = HTTPBearer(auto_error=False)


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
    from app.models.user import User

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    # Anti-screenshot / Concurrent Device strict lockout
    if user.session_id and payload.get("session_id") != user.session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Session expired. Device logged in elsewhere."
        )

    return user

async def get_unverified_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Extract current user from context but bypass is_active validation.
    Used strictly for verification routes.
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

    from app.models.user import User
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if user.session_id and payload.get("session_id") != user.session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Session expired. Device logged in elsewhere."
        )

    return user


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Like get_current_user, but returns None instead of raising if not authenticated.
    Useful for endpoints that are public but show extra data for logged-in users.
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

    from app.models.user import User

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    
    if user and not user.is_active:
        return None
        
    if user and user.session_id and payload.get("session_id") != user.session_id:
        return None
        
    return user


async def require_admin(user=Depends(get_current_user)):
    """Require the current user to be an admin."""
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
