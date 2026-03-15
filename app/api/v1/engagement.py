from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Optional
from datetime import datetime, timedelta, timezone
import uuid

from app.models.models import UserModel
from app.api.deps import get_current_user
from app.api.v1.schemas import EngagementBlock, EngagementSessionStart, EngagementVote, EngagementVoteResult

router = APIRouter()

SESSION_TTL = timedelta(minutes=5)

ENGAGEMENT_BLOCKS = [
    EngagementBlock(
        id="survey-2024",
        title="Resident Pulse Survey",
        description="Quick check-in about community sentiment.",
        block_type="survey",
        options=[
            {"id": "q1", "label": "How satisfied are you with building maintenance?", "type": "single", "choices": ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very dissatisfied"]},
            {"id": "q2", "label": "Which amenity do you use most?", "type": "single", "choices": ["Gym", "Pool", "Lounge", "Parking", "Garden"]},
        ],
        metadata={"subtitle": "2 questions · 20 seconds"},
    ),
    EngagementBlock(
        id="poll-2024",
        title="Presidential Election Simulation",
        description="Cast your vote in the mock election.",
        block_type="poll",
        options=[
            {"id": "candidate-a", "label": "Alex Carter"},
            {"id": "candidate-b", "label": "Jordan Lee"},
            {"id": "candidate-c", "label": "Morgan Reyes"},
        ],
        metadata={"subtitle": "Live poll"},
    ),
    EngagementBlock(
        id="feedback-2024",
        title="Community Feedback Counter",
        description="Tap to show support for new recycling initiative.",
        block_type="counter",
        options=[{"id": "support", "label": "Support"}],
        metadata={"unit": "supporters"},
    ),
]

ACTIVE_SESSIONS: Dict[str, Dict[str, datetime]] = {}
SESSION_VOTES: Dict[str, Dict[str, Dict[str, int]]] = {}
USER_SESSIONS: Dict[int, str] = {}
SESSION_USER_VOTES: Dict[str, Dict[int, Dict[str, set]]] = {}


def _cleanup_sessions():
    now = datetime.now(timezone.utc)
    expired = []
    for session_id, info in ACTIVE_SESSIONS.items():
        if info["expires_at"] <= now:
            expired.append(session_id)
    for session_id in expired:
        ACTIVE_SESSIONS.pop(session_id, None)
        SESSION_VOTES.pop(session_id, None)
        SESSION_USER_VOTES.pop(session_id, None)
        for user_id, active_session in list(USER_SESSIONS.items()):
            if active_session == session_id:
                USER_SESSIONS.pop(user_id, None)


def _get_session(user_id: int, session_id: str) -> Dict[str, datetime]:
    _cleanup_sessions()
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    session = ACTIVE_SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=410, detail="Session expired")
    if USER_SESSIONS.get(user_id) != session_id:
        raise HTTPException(status_code=403, detail="Session not active")
    if session["expires_at"] <= datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Session expired")
    return session


def _ensure_votes(session_id: str) -> Dict[str, Dict[str, int]]:
    if session_id not in SESSION_VOTES:
        SESSION_VOTES[session_id] = {block.id: {} for block in ENGAGEMENT_BLOCKS}
    return SESSION_VOTES[session_id]


def _ensure_user_votes(session_id: str) -> Dict[int, Dict[str, set]]:
    if session_id not in SESSION_USER_VOTES:
        SESSION_USER_VOTES[session_id] = {}
    return SESSION_USER_VOTES[session_id]


@router.get("/blocks", response_model=List[EngagementBlock])
def list_blocks(current_user: UserModel = Depends(get_current_user)):
    """List engagement blocks."""
    _cleanup_sessions()
    return ENGAGEMENT_BLOCKS


@router.post("/sessions", response_model=EngagementSessionStart)
def start_session(current_user: UserModel = Depends(get_current_user)):
    """Start an engagement session. Votes are valid only while session is active."""
    _cleanup_sessions()
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    ACTIVE_SESSIONS[session_id] = {"user_id": current_user.id, "created_at": now, "expires_at": now + SESSION_TTL}
    USER_SESSIONS[current_user.id] = session_id
    _ensure_votes(session_id)
    return EngagementSessionStart(session_id=session_id, expires_at=ACTIVE_SESSIONS[session_id]["expires_at"])


@router.delete("/sessions/{session_id}")
def end_session(session_id: str, current_user: UserModel = Depends(get_current_user)):
    """End a session. Votes are invalid once session is closed."""
    session = ACTIVE_SESSIONS.get(session_id)
    if session and session.get("user_id") == current_user.id:
        ACTIVE_SESSIONS.pop(session_id, None)
        SESSION_VOTES.pop(session_id, None)
        SESSION_USER_VOTES.pop(session_id, None)
        USER_SESSIONS.pop(current_user.id, None)
    _cleanup_sessions()
    return {"message": "Session ended"}


@router.post("/votes", response_model=EngagementVoteResult)
def cast_vote(vote: EngagementVote, current_user: UserModel = Depends(get_current_user)):
    """Cast a vote for a block option. Requires active session."""
    session = _get_session(current_user.id, vote.session_id)
    votes = _ensure_votes(vote.session_id)
    user_votes = _ensure_user_votes(vote.session_id)
    block_votes = votes.get(vote.block_id)
    if block_votes is None:
        raise HTTPException(status_code=404, detail="Block not found")
    block = next((b for b in ENGAGEMENT_BLOCKS if b.id == vote.block_id), None)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    valid_options = set()
    if block.block_type == "survey":
        for question in block.options:
            for choice in question.get("choices", []):
                valid_options.add(f"{question.get('id')}:{choice}")
    else:
        valid_options = {option.get("id") for option in block.options}

    if vote.option_id not in valid_options:
        raise HTTPException(status_code=400, detail="Invalid option")

    voter_record = user_votes.setdefault(current_user.id, {})
    voted_options = voter_record.setdefault(vote.block_id, set())
    if vote.option_id in voted_options:
        raise HTTPException(status_code=409, detail="Vote already submitted")

    if block.block_type in {"poll", "counter"} and voted_options:
        raise HTTPException(status_code=409, detail="Vote already submitted")

    if block.block_type == "survey":
        question_id = vote.option_id.split(":", 1)[0]
        if any(option.split(":", 1)[0] == question_id for option in voted_options):
            raise HTTPException(status_code=409, detail="Vote already submitted")

    block_votes[vote.option_id] = block_votes.get(vote.option_id, 0) + 1
    voted_options.add(vote.option_id)

    return EngagementVoteResult(
        block_id=vote.block_id,
        option_id=vote.option_id,
        totals=block_votes,
        session_expires_at=session["expires_at"],
    )


@router.get("/results/{block_id}", response_model=EngagementVoteResult)
def get_results(block_id: str, session_id: str, current_user: UserModel = Depends(get_current_user)):
    """Get results for a block within an active session."""
    session = _get_session(current_user.id, session_id)
    votes = _ensure_votes(session_id)
    block_votes = votes.get(block_id)
    if block_votes is None:
        raise HTTPException(status_code=404, detail="Block not found")
    return EngagementVoteResult(
        block_id=block_id,
        option_id=None,
        totals=block_votes,
        session_expires_at=session["expires_at"],
    )
