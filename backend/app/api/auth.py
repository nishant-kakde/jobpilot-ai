import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    get_current_user,
    record_audit_log,
    limiter
)
from app.models.models import User, Profile, UserPreference, RefreshToken
from app.schemas.schemas import UserRegister, UserLogin, Token, UserOut, RefreshTokenRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
@limiter.limit("10/minute")
async def register(request: Request, user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    existing_q = select(User).where(User.email == user_in.email.lower())
    existing_res = await db.execute(existing_q)
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Create User
    new_user = User(
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name
    )
    db.add(new_user)
    await db.flush()

    # Create Initial Profile
    new_profile = Profile(
        user_id=new_user.id,
        current_city="Remote",
        preferred_locations=["Remote", "New York", "San Francisco"],
        target_job_titles=["Data Analyst", "Software Engineer"]
    )
    db.add(new_profile)

    # Create Default Preferences
    new_pref = UserPreference(user_id=new_user.id)
    db.add(new_pref)

    # Generate tokens
    access_token = create_access_token(data={"sub": new_user.id, "email": new_user.email})
    refresh_token_str, expires_at = create_refresh_token(user_id=new_user.id)

    db_refresh = RefreshToken(
        user_id=new_user.id,
        token=refresh_token_str,
        expires_at=expires_at
    )
    db.add(db_refresh)

    await db.commit()
    await db.refresh(new_user)

    client_ip = request.client.host if request.client else None
    await record_audit_log(
        db=db,
        action="auth.register",
        user_id=new_user.id,
        resource_type="user",
        resource_id=new_user.id,
        ip_address=client_ip,
        details={"email": new_user.email}
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=Token)
@limiter.limit("15/minute")
async def login(request: Request, credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.email == credentials.email.lower())
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    client_ip = request.client.host if request.client else None

    if not user or not verify_password(credentials.password, user.hashed_password):
        await record_audit_log(
            db=db,
            action="auth.login_failed",
            ip_address=client_ip,
            details={"attempted_email": credentials.email}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated.")

    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    refresh_token_str, expires_at = create_refresh_token(user_id=user.id)

    db_refresh = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=expires_at
    )
    db.add(db_refresh)
    await db.commit()

    await record_audit_log(
        db=db,
        action="auth.login",
        user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        ip_address=client_ip
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(request: Request, body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_access_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    user_id = payload.get("sub")
    query = select(RefreshToken).where(
        (RefreshToken.token == body.refresh_token) &
        (RefreshToken.user_id == user_id)
    )
    res = await db.execute(query)
    token_record = res.scalar_one_or_none()

    now = datetime.datetime.now(datetime.timezone.utc)
    # Ensure token record exists, is not revoked, and not expired
    if not token_record or token_record.is_revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked or is invalid.")

    token_exp = token_record.expires_at
    if token_exp.tzinfo is None:
        token_exp = token_exp.replace(tzinfo=datetime.timezone.utc)
    if token_exp < now:
        token_record.is_revoked = True
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired.")

    # Fetch User
    user_q = select(User).where(User.id == user_id)
    user_res = await db.execute(user_q)
    user = user_res.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

    # Rotate refresh token: revoke old token
    token_record.is_revoked = True

    # Generate new pair
    new_access_token = create_access_token(data={"sub": user.id, "email": user.email})
    new_refresh_str, new_expires_at = create_refresh_token(user_id=user.id)

    new_db_refresh = RefreshToken(
        user_id=user.id,
        token=new_refresh_str,
        expires_at=new_expires_at
    )
    db.add(new_db_refresh)
    await db.commit()

    client_ip = request.client.host if request.client else None
    await record_audit_log(
        db=db,
        action="auth.refresh",
        user_id=user.id,
        ip_address=client_ip
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_str,
        "token_type": "bearer",
        "user": user
    }

@router.post("/logout")
async def logout(body: RefreshTokenRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(RefreshToken).where(
        (RefreshToken.token == body.refresh_token) &
        (RefreshToken.user_id == current_user.id)
    )
    res = await db.execute(query)
    token_record = res.scalar_one_or_none()
    if token_record:
        token_record.is_revoked = True
        await db.commit()

    await record_audit_log(
        db=db,
        action="auth.logout",
        user_id=current_user.id,
        resource_type="user",
        resource_id=current_user.id
    )
    return {"status": "success", "message": "Logged out successfully."}

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
