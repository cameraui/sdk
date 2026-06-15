from __future__ import annotations

from typing import Any, Protocol


class LoggerService(Protocol):
    """
    Logger interface used throughout the SDK.

    Each method accepts an arbitrary list of arguments (joined with spaces by
    the host) and emits a log entry at the corresponding severity:

      - log:       general informational message (default level).
      - warn:      potential problem that does not stop execution.
      - error:     a failure or unexpected condition.
      - success:   confirmation of a completed operation.
      - debug:     diagnostic detail; only emitted when debug logging is enabled.
      - trace:     very fine-grained diagnostic detail; only emitted when trace
                   logging is enabled.
      - attention: highlighted message that should stand out in the log stream.
    """

    def log(self, *args: Any) -> None:
        """Log an info message."""
        ...

    def error(self, *args: Any) -> None:
        """Log an error message."""
        ...

    def warn(self, *args: Any) -> None:
        """Log a warning message."""
        ...

    def success(self, *args: Any) -> None:
        """Log a success message (confirmation of a completed operation)."""
        ...

    def debug(self, *args: Any) -> None:
        """Log a debug message (diagnostic detail; only emitted when debug logging is enabled)."""
        ...

    def trace(self, *args: Any) -> None:
        """Log a trace message (very fine-grained detail; only emitted when trace logging is enabled)."""
        ...

    def attention(self, *args: Any) -> None:
        """Log an attention message (highlighted message that should stand out in the log stream)."""
        ...


__all__ = [
    "LoggerService",
]
