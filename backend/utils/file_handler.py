"""
File handler utilities — manages temporary file lifecycle.
Each processing job gets its own directory under /tmp/{job_id}/ so concurrent
requests don't collide. Files are cleaned up after download.
"""

import os
import uuid
import shutil
from pathlib import Path

# Use a local ./tmp directory in dev so Windows doesn't restrict /tmp access
TMP_BASE = Path(os.getenv("TMP_DIR", "./tmp"))


def create_job_dir(job_id: str) -> Path:
    """Create and return the temp directory for a given job."""
    job_dir = TMP_BASE / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    return job_dir


def get_job_dir(job_id: str) -> Path:
    """Return the temp directory path for a job (without creating it)."""
    return TMP_BASE / job_id


def new_job_id() -> str:
    """Generate a new unique job ID."""
    return str(uuid.uuid4())


def cleanup_job(job_id: str) -> None:
    """
    Delete all temp files for a completed job.
    Call this after the user has downloaded the final video —
    we don't need to keep these files around.
    """
    job_dir = TMP_BASE / job_id
    if job_dir.exists():
        shutil.rmtree(job_dir)


def job_exists(job_id: str) -> bool:
    """Check if a job directory exists (i.e., the job was created)."""
    return (TMP_BASE / job_id).exists()
