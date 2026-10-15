import asyncio
import logging
from typing import Optional, Dict, Any
from arq.connections import create_pool, RedisSettings
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services.scheduler_service import scheduler_service
from app.services.notification_service import notification_service

logger = logging.getLogger("jobpilot.worker")

# ----------------- ARQ Job Functions -----------------
async def run_daily_job_sweep_task(ctx: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Background task executing daily sweep for a candidate."""
    logger.info(f"Starting background job sweep for user: {user_id}")
    async with AsyncSessionLocal() as db:
        res = await scheduler_service.run_daily_job_search(db=db, user_id=user_id)
        rem = await scheduler_service.check_reminders(db=db, user_id=user_id)
        return {"search": res, "reminders": rem}

async def send_notification_task(
    ctx: Dict[str, Any],
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "system",
    link_url: Optional[str] = None
) -> Dict[str, Any]:
    """Background task to dispatch multi-channel notifications."""
    async with AsyncSessionLocal() as db:
        notif = await notification_service.create_in_app_notification(
            db=db,
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            link_url=link_url
        )
        return {"notification_id": notif.id}

async def startup(ctx: Dict[str, Any]):
    logger.info("ARQ Worker initialized.")

async def shutdown(ctx: Dict[str, Any]):
    logger.info("ARQ Worker shut down.")

class WorkerSettings:
    functions = [run_daily_job_sweep_task, send_notification_task]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)

# ----------------- Unified Enqueue Helper with Fallback -----------------
_redis_pool = None

async def get_redis_pool():
    global _redis_pool
    if _redis_pool is None:
        try:
            _redis_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
        except Exception as err:
            logger.debug(f"Redis not available ({err}), fallback to in-process executor.")
            _redis_pool = None
    return _redis_pool

async def enqueue_background_job(function_name: str, *args, **kwargs):
    """
    Unified dispatcher: enqueues to Redis ARQ worker if available,
    or falls back seamlessly to an in-process asyncio task.
    """
    try:
        pool = await get_redis_pool()
        if pool:
            job = await pool.enqueue_job(function_name, *args, **kwargs)
            logger.info(f"Enqueued job {function_name} to ARQ (job_id: {job.job_id})")
            return {"job_id": job.job_id, "mode": "arq"}
    except Exception as e:
        logger.warning(f"ARQ dispatch failed ({e}), falling back to in-process task.")

    # In-process asynchronous execution
    if function_name == "run_daily_job_sweep_task":
        user_id = args[0] if args else kwargs.get("user_id")
        asyncio.create_task(run_daily_job_sweep_task({}, user_id))
    elif function_name == "send_notification_task":
        asyncio.create_task(send_notification_task({}, *args, **kwargs))

    return {"status": "dispatched", "mode": "in_process"}
