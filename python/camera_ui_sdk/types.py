from __future__ import annotations

from typing import Any, Protocol


class LoggerService(Protocol):
    """
    Logger interface used throughout the SDK.

    Every method takes an arbitrary list of arguments, joined with spaces by the
    host, and writes one log entry at the matching severity. ``debug`` and
    ``trace`` are dropped unless that level is enabled for the plugin.

    Example:
        ```python
        self.logger.log("connected to", host)
        ```
    """

    def log(self, *args: Any) -> None:
        """Log an informational entry."""
        ...

    def error(self, *args: Any) -> None:
        """Log a failure or unexpected condition."""
        ...

    def warn(self, *args: Any) -> None:
        """Log a problem that does not stop execution."""
        ...

    def success(self, *args: Any) -> None:
        """Log a confirmation of a completed operation."""
        ...

    def debug(self, *args: Any) -> None:
        """Log a diagnostic entry, dropped unless debug logging is enabled."""
        ...

    def trace(self, *args: Any) -> None:
        """Log a fine-grained diagnostic entry, dropped unless trace logging is enabled."""
        ...

    def attention(self, *args: Any) -> None:
        """Log a highlighted entry that stands out in the log stream."""
        ...


__all__ = [
    "LoggerService",
]
