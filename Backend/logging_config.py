import logging
import sys
import json
from datetime import datetime

class StructuredFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
        
    # Console handler with JSON formatting
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    logger.addHandler(handler)
    
    # Avoid duplicate logs from Flask/Gunicorn
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    
    return logger

logger = setup_logging()
