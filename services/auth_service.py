# ============================================================
# AUTH SERVICE — Login, Registration, JWT Tokens
# Passwords: hashed with bcrypt (never stored in plaintext)
# Sessions:  JWT tokens (self-contained, survive restarts)
# ============================================================

from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext
from jose import jwt, JWTError

from services.db_service import (
    get_user_by_username,
    get_all_users,
    add_user,
)

print("[AuthService] Auth microservice loaded (JWT + bcrypt)")

# ── Password hashing context ──────────────────────────────
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Hash a plaintext password for storage."""
    return pwd_ctx.hash(plain)


def verify_password(plain: str, stored: str) -> bool:
    """
    Verify a password against the stored hash.
    Falls back to plain comparison ONLY for legacy rows
    that were never hashed.
    """
    try:
        return pwd_ctx.verify(plain, stored)
    except Exception:
        # stored value wasn't a valid bcrypt hash — legacy row
        return plain == stored


# ── JWT configuration ──────────────────────────────────────
def _load_config():
    import json, os
    path = os.path.join(os.path.dirname(__file__), '..', 'config.json')
    with open(path, 'r') as f:
        return json.load(f)

_CFG = _load_config()
_AUTH_CFG = _CFG.get('auth', {})

JWT_SECRET  = _AUTH_CFG.get('secret_key', 'change_this_secret_key')
JWT_ALGO    = "HS256"
TOKEN_TTL_MINUTES = _AUTH_CFG.get('token_expire_minutes', 480)  # 8 hours default

if JWT_SECRET == 'change_this_secret_key':
    print("[AuthService] WARNING: using default JWT secret key!")
    print("[AuthService] Set a real 'secret_key' in config.json 'auth' section.")


def authenticate_user(username: str, password: str):
    print(f"[AuthService] Login attempt: {username}")

    user = get_user_by_username(username)
    if not user:
        print(f"[AuthService] Not found: {username}")
        return None

    if not verify_password(password, user['password']):
        print(f"[AuthService] Wrong password!")
        return None

    print(f"[AuthService] Login success: {username} ({user['role']})")
    return user


def create_token(user: dict) -> str:
    """
    Creates a JWT that carries the username, role, and
    expiry INSIDE the token itself (signed with JWT_SECRET).
    No server-side storage needed — the token is
    self-verifying, so it survives backend restarts.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub" : user['username'],          # 'subject' — standard JWT claim
        "role": user['role'],
        "name": user['name'],
        "iat" : now,                       # issued at
        "exp" : now + timedelta(minutes=TOKEN_TTL_MINUTES),  # expiry
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
    return token


def verify_token(token: str):
    """
    Decodes and verifies a JWT. Returns the payload dict
    (username, role, name) if valid, or None if the token
    is missing, expired, or tampered with.
    Used by backend.py's require_auth() on every protected route.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return {
            "username": payload.get("sub"),
            "role"    : payload.get("role"),
            "name"    : payload.get("name"),
        }
    except JWTError as e:
        print(f"[AuthService] Token invalid: {e}")
        return None


def revoke_token(token: str):
    """
    JWTs are stateless by design — there is no server-side
    store to remove them from. True revocation before natural
    expiry would need a denylist (out of scope for this demo).
    This function exists so backend.py's /auth/logout route
    has a consistent interface; it is a no-op here.
    """
    pass


def get_users_list():
    return get_all_users()


def register_user(username, password, name, role='Viewer'):
    # Always hash before storing — never save plaintext
    return add_user(username, hash_password(password), name, role)