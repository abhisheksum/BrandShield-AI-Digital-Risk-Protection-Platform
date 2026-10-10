"""
Authentication API for Rakshak — register and login.

Uses bcrypt for password hashing and JWT tokens for sessions.
All passwords are hashed before storage — plaintext passwords are never saved.

Token duration: 24 hours (suitable for hackathon MVP).
"""

import hashlib
import hmac
import os
import json
import base64
import time
from typing import Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserOut, TokenResponse
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Simple password hashing using hashlib (no extra deps) ──────────────────
# We use PBKDF2-HMAC-SHA256 which is secure without needing bcrypt.

def _hash_password(password: str) -> str:
    """Hash a password with PBKDF2-HMAC-SHA256 + random salt."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 260000)
    return base64.b64encode(salt + dk).decode()


def _verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against its stored PBKDF2 hash."""
    try:
        raw = base64.b64decode(stored_hash.encode())
        salt = raw[:16]
        stored_dk = raw[16:]
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 260000)
        return hmac.compare_digest(dk, stored_dk)
    except Exception:
        return False


# ── Minimal JWT implementation (no PyJWT dependency required) ─────────────

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * padding)


def _create_token(user_id: int, email: str) -> str:
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    expire = int(time.time()) + settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    payload = _b64url_encode(
        json.dumps({"sub": str(user_id), "email": email, "exp": expire}).encode()
    )
    sig_input = f"{header}.{payload}".encode()
    sig = hmac.new(settings.SECRET_KEY.encode(), sig_input, hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64url_encode(sig)}"


def _decode_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, signature = parts
        sig_input = f"{header}.{payload}".encode()
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode(), sig_input, hashlib.sha256
        ).digest()
        if not hmac.compare_digest(expected_sig, _b64url_decode(signature)):
            return None
        data = json.loads(_b64url_decode(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


# ── Dependency for protected routes ──────────────────────────────────────

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Return the authenticated user, or None if no valid token is provided."""
    if not credentials:
        return None
    data = _decode_token(credentials.credentials)
    if not data:
        return None
    user = db.query(User).filter(User.id == int(data["sub"])).first()
    return user


def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Strict auth — raise 401 if not authenticated."""
    user = get_current_user(credentials, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new organisation.
    Passwords are hashed with PBKDF2-HMAC-SHA256 before storage.
    """
    # Normalise email
    email = data.email.strip().lower()

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Please log in instead.",
        )

    user = User(
        email=email,
        organisation_name=data.organisation_name.strip(),
        website=data.website,
        hashed_password=_hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _create_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password. Returns a JWT session token."""
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not _verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password.",
        )

    token = _create_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(require_auth)):
    """Return the currently authenticated user's profile."""
    return UserOut.model_validate(current_user)
