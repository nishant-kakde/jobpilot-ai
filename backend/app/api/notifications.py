from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Notification
from app.schemas.schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationOut])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Notification).where(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50)
    res = await db.execute(query)
    return res.scalars().all()

@router.put("/{id}/read", response_model=NotificationOut)
async def mark_as_read(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Notification).where(
        (Notification.id == id) & (Notification.user_id == current_user.id)
    )
    res = await db.execute(query)
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif

@router.post("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Notification).where(
        (Notification.user_id == current_user.id) & (Notification.is_read == False)
    )
    res = await db.execute(query)
    for notif in res.scalars().all():
        notif.is_read = True
    await db.commit()
    return {"status": "all_marked_read"}
