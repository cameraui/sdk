/**
 * Logger interface used throughout the SDK.
 *
 * Each method accepts an arbitrary list of arguments (joined with spaces by
 * the host) and emits a log entry at the corresponding severity:
 *
 *   - log:       general informational message (default level).
 *   - info:      same as log; informational message.
 *   - warn:      potential problem that does not stop execution.
 *   - error:     a failure or unexpected condition.
 *   - success:   confirmation of a completed operation.
 *   - debug:     diagnostic detail; only emitted when debug logging is enabled.
 *   - trace:     very fine-grained diagnostic detail; only emitted when trace
 *                logging is enabled.
 *   - attention: highlighted message that should stand out in the log stream.
 */
export interface LoggerService {
  /** Log an info message. */
  log: (...args: any[]) => void;
  /** Log an error message. */
  error: (...args: any[]) => void;
  /** Log a warning message. */
  warn: (...args: any[]) => void;
  /** Log a success message (confirmation of a completed operation). */
  success: (...args: any[]) => void;
  /** Log a debug message (diagnostic detail; only emitted when debug logging is enabled). */
  debug: (...args: any[]) => void;
  /** Log a trace message (very fine-grained detail; only emitted when trace logging is enabled). */
  trace: (...args: any[]) => void;
  /** Log an attention message (highlighted message that should stand out in the log stream). */
  attention: (...args: any[]) => void;
}
