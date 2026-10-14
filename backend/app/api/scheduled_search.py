from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.services.scheduler_service import scheduler_service

router = APIRouter(prefix="/scheduled", tags=["Scheduled Automation"])

@router.post("/trigger")
async def trigger_scheduled_run(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Executes an immediate daily automated job search and reminder check.
    """
    search_result = await scheduler_service.run_daily_job_search(db=db, user_id=current_user.id)
    reminder_result = await scheduler_service.check_reminders(db=db, user_id=current_user.id)
    return {
        "status": "success",
        "search_summary": search_result,
        "reminder_summary": reminder_result
    }
