/**
 * Plugin configuration type.
 * Generic wrapper for typed plugin configuration objects.
 */
export type PluginConfig<T = Record<string, any>> = T;

/**
 * Available schema field types for configuration UI.
 */
export type JsonSchemaType = 'string' | 'number' | 'boolean' | 'array' | 'button' | 'submit';

/**
 * Condition operator for conditional field visibility.
 */
export type SchemaConditionOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'in' | 'nin';

/**
 * Condition that controls when a field is visible.
 * The field is shown only when the condition evaluates to true against
 * the current form values.
 *
 * Combine multiple conditions on a field via an array — all must pass
 * (logical AND).
 *
 * @example
 * ```typescript
 * // Show 'apiKey' only when 'authMode' equals 'token':
 * { key: 'apiKey', type: 'string', title: 'API Key', description: '',
 *   condition: { key: 'authMode', value: 'token' } }
 *
 * // Show 'port' only when 'protocol' is one of the listed values:
 * condition: { key: 'protocol', operator: 'in', value: ['http', 'https'] }
 * ```
 */
export interface SchemaCondition {
  /** Key of another field whose value drives visibility. */
  key: string;
  /** Expected value — single value, or array for `'in'` / `'nin'`. */
  value: any;
  /** Comparison operator (default: `'eq'`). */
  operator?: SchemaConditionOperator;
}

/**
 * Base schema interface for all schema types.
 * Contains common fields like type, key, title, description.
 */
export interface JsonFactorySchema {
  /** Field type */
  type: JsonSchemaType;
  /** Unique field identifier */
  key: string;
  /** Display title */
  title: string;
  /** Field description/help text */
  description: string;
  /** Optional group name for organizing fields */
  group?: string;
}

/**
 * Base schema without callbacks - used for nested schemas.
 * Extends factory schema with common display options.
 */
export interface JsonBaseSchemaWithoutCallbacks<T extends string | string[] | number | number[] | boolean | boolean[] = any> extends JsonFactorySchema {
  /** Hide field from UI */
  hidden?: boolean;
  /** Mark field as required */
  required?: boolean;
  /** Make field read-only */
  readonly?: boolean;
  /** Placeholder text for empty fields */
  placeholder?: string;
  /** Default value when not set */
  defaultValue?: T;
  /** Condition for conditional field visibility. Array = all must be true (AND). */
  condition?: SchemaCondition | SchemaCondition[];
}

/**
 * Base schema with callbacks - full schema interface.
 * Adds storage and callback options for dynamic behavior.
 *
 * @example
 * ```typescript
 * // Persisted number with onSet hook for live re-config:
 * { type: 'number', key: 'pollSec', title: 'Poll (seconds)', description: '',
 *   defaultValue: 30, minimum: 5, maximum: 300, step: 5, store: true,
 *   onSet: async (newValue, oldValue) => this.reschedule(newValue) }
 *
 * // Action button (no value stored, just fires on click):
 * { type: 'button', key: 'reset', title: 'Reset to defaults', description: '',
 *   color: 'danger', onSet: async () => this.resetDefaults() }
 * ```
 */
export interface JsonBaseSchema<T extends string | string[] | number | number[] | boolean | boolean[] = any> extends JsonBaseSchemaWithoutCallbacks<T> {
  /** Whether to persist this field to storage */
  store?: boolean;
  /** Callback after a write. `setValue` fires it whether or not the value changed; `setConfig` fires it only for keys that changed. */
  onSet?: (newValue: any, oldValue: any) => Promise<void>;
  /** Callback to get computed value */
  onGet?: () => Promise<any>;
}

/**
 * String-specific schema options.
 *
 * Use `format` to render the value with a specialized UI control:
 * - `'date-time'` — ISO 8601 date+time picker.
 * - `'date'` — date-only picker.
 * - `'time'` — time-only picker.
 * - `'email'` — email input with format validation.
 * - `'uuid'` — UUID input with format validation.
 * - `'ipv4'` — IPv4 address input.
 * - `'ipv6'` — IPv6 address input.
 * - `'password'` — masked input that hides characters.
 * - `'qrCode'` — value is rendered as a QR code (read-only display).
 * - `'image'` — value is a data URL or path; rendered as a thumbnail.
 */
export interface JsonStringSchema {
  type: 'string';
  /** String format for validation/display. See type docs for behavior per format. */
  format?: 'date-time' | 'date' | 'time' | 'email' | 'uuid' | 'ipv4' | 'ipv6' | 'password' | 'qrCode' | 'image';
  /** Minimum string length (inclusive). */
  minLength?: number;
  /** Maximum string length (inclusive). */
  maxLength?: number;
}

/**
 * Number-specific schema options.
 */
export interface JsonNumberSchema {
  type: 'number';
  /** Minimum value */
  minimum?: number;
  /** Maximum value */
  maximum?: number;
  /** Step increment for number input */
  step?: number;
}

/**
 * Boolean-specific schema options.
 */
export interface JsonBooleanSchema {
  type: 'boolean';
}

/**
 * Enum/select schema options.
 */
export interface JsonEnumSchema {
  type: 'string';
  /** Available options */
  enum: string[];
  /** Allow multiple selection */
  multiple?: boolean;
}

/**
 * Array schema options.
 */
export interface JsonArraySchema {
  type: 'array';
  /** Whether array items are expanded by default */
  opened?: boolean;
  /** Schema for array items */
  items: Omit<JsonSchemaWithoutCallbacks, 'key'>;
}

/**
 * Complete string schema with callbacks.
 */
export interface JsonSchemaString extends JsonBaseSchema<string>, JsonStringSchema {
  type: 'string';
}

/**
 * String schema without callbacks (for nested use).
 */
export interface JsonSchemaStringWithoutCallbacks extends JsonBaseSchemaWithoutCallbacks<string>, JsonStringSchema {
  type: 'string';
}

/**
 * Complete number schema with callbacks.
 */
export interface JsonSchemaNumber extends JsonBaseSchema<number>, JsonNumberSchema {
  type: 'number';
}

/**
 * Number schema without callbacks (for nested use).
 */
export interface JsonSchemaNumberWithoutCallbacks extends JsonBaseSchemaWithoutCallbacks<number>, JsonNumberSchema {
  type: 'number';
}

/**
 * Complete boolean schema with callbacks.
 */
export interface JsonSchemaBoolean extends JsonBaseSchema<boolean>, JsonBooleanSchema {
  type: 'boolean';
}

/**
 * Boolean schema without callbacks (for nested use).
 */
export interface JsonSchemaBooleanWithoutCallbacks extends JsonBaseSchemaWithoutCallbacks<boolean>, JsonBooleanSchema {
  type: 'boolean';
}

/**
 * Complete enum schema with callbacks.
 */
export interface JsonSchemaEnum extends JsonBaseSchema<string | string[]>, JsonEnumSchema {
  type: 'string';
}

/**
 * Enum schema without callbacks (for nested use).
 */
export interface JsonSchemaEnumWithoutCallbacks extends JsonBaseSchemaWithoutCallbacks<string | string[]>, JsonEnumSchema {
  type: 'string';
}

/**
 * Complete array schema with callbacks.
 */
export interface JsonSchemaArray extends JsonBaseSchema<string[] | number[] | boolean[]>, JsonArraySchema {
  type: 'array';
}

/**
 * Array schema without callbacks (for nested use).
 */
export interface JsonSchemaArrayWithoutCallbacks extends JsonBaseSchemaWithoutCallbacks<string[] | number[] | boolean[]>, JsonArraySchema {
  type: 'array';
}

/**
 * Button schema - triggers an action without storing a value.
 */
export interface JsonSchemaButton extends JsonFactorySchema {
  type: 'button';
  /** Button color variant */
  color?: 'success' | 'info' | 'warn' | 'danger';
  /** Click handler */
  onSet: () => Promise<void>;
}

/**
 * Submit button schema - submits form data and can return updated schema.
 */
export interface JsonSchemaSubmit extends JsonFactorySchema {
  type: 'submit';
  /** Button color variant */
  color?: 'success' | 'info' | 'warn' | 'danger';
  /** Submit handler - receives form values, can return toast/schema updates */
  onClick: (value: any) => Promise<FormSubmitResponse | void>;
}

/**
 * Union of every top-level schema type (with callbacks).
 *
 * Use this when defining the schemas you pass to `defineSchemas`,
 * `addSchema`, or `changeSchema`. Each entry describes one configurable
 * field rendered in the UI; the discriminator is the `type` property.
 */
export type JsonSchema = JsonSchemaString | JsonSchemaNumber | JsonSchemaBoolean | JsonSchemaEnum | JsonSchemaArray | JsonSchemaButton | JsonSchemaSubmit;

/**
 * Schema variant without the `key` field.
 * Used when the key is provided externally (e.g. as an object property).
 */
export type JsonSchemaWithoutKey = Omit<JsonSchema, 'key'>;

/**
 * Union type of schemas without callbacks.
 * Use this for nested schemas (e.g., array items).
 */
export type JsonSchemaWithoutCallbacks =
  | JsonSchemaStringWithoutCallbacks
  | JsonSchemaNumberWithoutCallbacks
  | JsonSchemaBooleanWithoutCallbacks
  | JsonSchemaEnumWithoutCallbacks
  | JsonSchemaArrayWithoutCallbacks;

/**
 * Toast notification message.
 *
 * Returned from a submit handler (`JsonSchemaSubmit.onClick`) inside a
 * `FormSubmitResponse` to surface a transient banner in the UI — for
 * example to confirm that a credential check succeeded or failed.
 */
export interface ToastMessage {
  /** Severity — controls the icon/color of the banner. */
  type: 'info' | 'success' | 'warning' | 'error';
  /** Human-readable message text. */
  message: string;
}

/**
 * Form submit input data.
 */
export interface FormSubmitSchema {
  /** Form configuration values */
  config: Record<string, any>;
}

/**
 * Form submit response — returned by `JsonSchemaSubmit.onClick`.
 *
 * Used to react to a user-triggered submit (e.g. "Test connection",
 * "Pair device") with optional UI feedback. Either field may be set:
 * - `toast` shows a transient banner.
 * - `schema` replaces the current form schema, useful for multi-step
 *   flows where the next step depends on the submitted values.
 */
export interface FormSubmitResponse {
  /** Optional toast banner to display after the submit completes. */
  toast?: ToastMessage;
  /** Optional updated schema definitions (full replacement of fields). */
  schema?: JsonSchemaWithoutCallbacks[];
}

/**
 * Schema configuration bundle.
 * Contains both schema definitions and current values.
 */
export interface SchemaConfig {
  /** Schema definitions */
  schema: JsonSchema[];
  /** Current configuration values */
  config: Record<string, any>;
}

/**
 * Device storage interface for plugin/camera configuration.
 *
 * Provides methods to read/write configuration values and manage schemas.
 * Each plugin and camera can have its own storage instance.
 *
 * @example
 * ```typescript
 * this.storage.defineSchemas([
 *   { type: 'string', key: 'username', title: 'Username', description: 'Account username', store: true },
 *   { type: 'string', key: 'password', title: 'Password', description: 'Account password', format: 'password', store: true },
 * ]);
 *
 * // Get a value with default
 * const threshold = await storage.getValue('motionThreshold', 50);
 *
 * // Set a value
 * await storage.setValue('motionThreshold', 75);
 * ```
 */
export interface DeviceStorage<T extends Record<string, any> = Record<string, any>> {
  /** Current schema definitions */
  schemas: JsonSchema[];
  /** Current configuration values */
  values: T;

  /**
   * Get a configuration value.
   *
   * If the schema declares an `onGet` callback, its result is returned as-is,
   * with no fallback. Otherwise resolves in order: the stored value, then the
   * schema default, then the provided default.
   *
   * @param key - Configuration key
   *
   * @returns Value or undefined
   */
  getValue<U = string>(key: string): Promise<U> | undefined;

  /**
   * Get a configuration value with default.
   *
   * @param key - Configuration key
   *
   * @param defaultValue - Default if not set
   *
   * @returns Value or default
   */
  getValue<U = string>(key: string, defaultValue: U): Promise<U>;

  /**
   * Set a configuration value.
   *
   * Takes effect only if a schema exists for the key. Passing `null` or
   * `undefined` deletes the key — it reads as never-set again and the schema
   * default applies. For a field whose schema opts into storage (`store: true`)
   * the value is durably persisted before the returned promise resolves; the
   * schema's `onSet` fires afterwards.
   *
   * @param key - Configuration key
   *
   * @param newValue - New value to set, or `null`/`undefined` to delete the key
   */
  setValue<U = string>(key: string, newValue: U): Promise<void>;

  /**
   * Submit a value (for submit-type schemas).
   *
   * @param key - Schema key
   *
   * @param newValue - Submitted value
   *
   * @returns Optional response with toast/schema updates
   */
  submitValue(key: string, newValue: any): Promise<FormSubmitResponse | void>;

  /**
   * Check if a configuration value exists.
   *
   * @param key - Configuration key
   */
  hasValue(key: string): boolean;

  /**
   * Get the full schema configuration.
   *
   * @returns Schema definitions and current values
   */
  getConfig(): Promise<SchemaConfig>;

  /**
   * Merge configuration values into the current config.
   *
   * Only keys present in `newConfig` are updated (not a full replace); arrays
   * are replaced, not merged. Values are durably persisted before the returned
   * promise resolves; `onSet` fires for each key whose value actually changed.
   *
   * @param newConfig - Configuration values to merge in
   */
  setConfig(newConfig: T): Promise<void>;

  /**
   * Define all schemas for this storage.
   *
   * @param schemas - Array of schema definitions
   */
  defineSchemas(schemas: JsonSchema[]): void;

  /**
   * Add a new schema field.
   *
   * @param schema - Schema definition to add
   */
  addSchema(schema: JsonSchema): Promise<void>;

  /**
   * Remove a schema field.
   *
   * The field's stored value is deleted along with the schema; the removal
   * is durably persisted when the returned promise resolves.
   *
   * @param key - Schema key to remove
   */
  removeSchema(key: string): Promise<void>;

  /**
   * Replace an existing schema field with a full schema.
   *
   * The whole schema is replaced — individual fields are not merged. It is a
   * no-op when no schema with that key is registered (use {@link addSchema} to
   * add a new field). The passed key always wins.
   *
   * @param key - Schema key to replace
   *
   * @param newSchema - Full schema definition that replaces the current one
   */
  changeSchema(key: string, newSchema: JsonSchema): Promise<void>;

  /**
   * Get a schema definition by key.
   *
   * @param key - Schema key
   *
   * @returns Schema or undefined
   */
  getSchema(key: string): JsonSchema | undefined;

  /**
   * Check if a schema exists.
   *
   * @param key - Schema key
   */
  hasSchema(key: string): boolean;

  /**
   * Set a system-internal value (e.g. _displayName) without requiring a schema and persist it.
   *
   * When the returned promise resolves, the value is durably persisted.
   * Passing `null` or `undefined` deletes the key — it reads as never-set again.
   *
   * @param key - Internal key (typically prefixed with '_')
   *
   * @param value - Value to set, or `null`/`undefined` to delete the key
   */
  setInternalValue(key: string, value: unknown): Promise<void>;

  /**
   * Persist all changes to storage.
   *
   * When the returned promise resolves, all values are durably persisted.
   */
  save(): Promise<void>;
}
