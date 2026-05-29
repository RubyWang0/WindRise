import logging
import json
from datetime import datetime
from typing import Any, Dict

# Basic logging setup
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("agent_tracer")

def trace(event_type: str, session_id: str, data: Dict[str, Any] = None):
    """
    Global tracer for observability.
    Logs events structured as JSON.
    """
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        "session_id": session_id,
        "data": data or {}
    }
    logger.info(f"TRACE: {json.dumps(log_entry, ensure_ascii=False)}")
