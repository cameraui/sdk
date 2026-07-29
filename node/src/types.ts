/**
 * Logger interface used throughout the SDK.
 *
 * Every method takes an arbitrary list of arguments, joined with spaces by the
 * host, and writes one log entry at the matching severity. `debug` and `trace`
 * are dropped unless that level is enabled for the plugin.
 */
export interface LoggerService {
  /** Log an informational entry. */
  log: (...args: any[]) => void;
  /** Log a failure or unexpected condition. */
  error: (...args: any[]) => void;
  /** Log a problem that does not stop execution. */
  warn: (...args: any[]) => void;
  /** Log a confirmation of a completed operation. */
  success: (...args: any[]) => void;
  /** Log a diagnostic entry, dropped unless debug logging is enabled. */
  debug: (...args: any[]) => void;
  /** Log a fine-grained diagnostic entry, dropped unless trace logging is enabled. */
  trace: (...args: any[]) => void;
  /** Log a highlighted entry that stands out in the log stream. */
  attention: (...args: any[]) => void;
}
