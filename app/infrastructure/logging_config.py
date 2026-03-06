import logging
import sys
import json
import os
from datetime import datetime
from logging import LogRecord

# Define trace level
TRACE_LEVEL_NUM = 5
logging.addLevelName(TRACE_LEVEL_NUM, "TRACE")

def trace(self, message, *args, **kws):
    if self.isEnabledFor(TRACE_LEVEL_NUM):
        self._log(TRACE_LEVEL_NUM, message, args, **kws)

logging.Logger.trace = trace

class JSONFormatter(logging.Formatter):
    def format(self, record: LogRecord) -> str:
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "filename": record.filename,
            "lineno": record.lineno,
            "message": record.getMessage(),
            "module": record.module,
            "funcName": record.funcName
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

class ColorFormatter(logging.Formatter):
    COLORS = {
        "TRACE": "\033[90m",
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[1;31m"
    }
    RESET = "\033[0m"

    def format(self, record: LogRecord) -> str:
        base_message = super().format(record)
        color = self.COLORS.get(record.levelname, self.RESET)
        return f"{color}{base_message}{self.RESET}"

def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)  # Default level

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_formatter = ColorFormatter(
        "%(levelname)s - %(filename)s:%(lineno)d - %(message)s"
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # File Handler (JSON for ElasticSearch)
    log_file = "app.log"
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(JSONFormatter())
    logger.addHandler(file_handler)

    return logger

logger = setup_logging()
