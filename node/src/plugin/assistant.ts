/**
 * Property schema of a tool input: the JSON Schema draft-07 subset every
 * supported model provider accepts unchanged.
 */
export type AssistantToolProperty =
  | {
      /** Always `string`. */
      type: 'string';
      /** What the argument means, written for the model. */
      description?: string;
      /** Allowed values. */
      enum?: string[];
      /** Expected text format. */
      format?: 'date-time' | 'date' | 'time';
    }
  | {
      /** `number` or `integer`. */
      type: 'number' | 'integer';
      /** What the argument means, written for the model. */
      description?: string;
      /** Smallest allowed value. */
      minimum?: number;
      /** Largest allowed value. */
      maximum?: number;
    }
  | {
      /** Always `boolean`. */
      type: 'boolean';
      /** What the argument means, written for the model. */
      description?: string;
    }
  | {
      /** Always `array`. */
      type: 'array';
      /** What the argument means, written for the model. */
      description?: string;
      /** Schema of each element. */
      items: AssistantToolProperty;
      /** Fewest elements allowed. */
      minItems?: number;
      /** Most elements allowed. */
      maxItems?: number;
    }
  | {
      /** Always `object`. */
      type: 'object';
      /** What the argument means, written for the model. */
      description?: string;
      /** Named members of the object. */
      properties: Record<string, AssistantToolProperty>;
      /** Members the model has to provide. */
      required?: string[];
    };

/**
 * Input schema of a tool: always an object schema. The model fills the
 * properties, the host passes them to `callAssistantTool` as parsed JSON.
 */
export interface AssistantToolSchema {
  /** Always `object`. */
  type: 'object';
  /** Named arguments the model may pass. */
  properties: Record<string, AssistantToolProperty>;
  /** Arguments the model has to provide. */
  required?: string[];
  /** Set to `false` to reject arguments outside `properties`. */
  additionalProperties?: false;
}

/**
 * One tool a plugin offers to the assistant. The host prefixes `name` with the
 * plugin name, so names only have to be unique within the plugin.
 *
 * @example
 * ```ts
 * const queryEvents = defineAssistantTool({
 *   name: 'query_events',
 *   description: 'List recorded events for a time range, optionally filtered by camera and label.',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       from: { type: 'string', format: 'date-time', description: 'Start of the range, ISO 8601' },
 *       to: { type: 'string', format: 'date-time', description: 'End of the range, ISO 8601' },
 *       camera: { type: 'string', description: 'Camera name, all cameras when omitted' },
 *     },
 *     required: ['from', 'to'],
 *   },
 * });
 * ```
 */
export interface AssistantToolSpec {
  /** Tool name in snake_case, unique within the plugin. */
  name: string;
  /** What the tool does and when to use it, written for the model. One or two sentences, name units and defaults. */
  description: string;
  /** Object schema of the arguments (see {@link AssistantToolSchema}). */
  inputSchema: AssistantToolSchema;
  /** The user confirms every call before it runs. Set it on anything that changes state. */
  approval?: boolean;
  /** Hidden from users without the admin role. */
  adminOnly?: boolean;
  /** Time the host waits for `callAssistantTool`, in milliseconds. Default 60000. */
  timeoutMs?: number;
  /** Offered through tool discovery instead of on every turn. Use for rarely needed tools. */
  lazy?: boolean;
}

/**
 * Who is asking and in which language. Passed to every tool call; the host has
 * already enforced `adminOnly` and `approval`, the fields are information.
 */
export interface AssistantToolContext {
  /** ID of the user talking to the assistant. */
  userId: string;
  /** Role of the user. */
  role: 'user' | 'admin' | 'master';
  /** BCP 47 language tag of the conversation, for localized text results. */
  language: string;
  /** IANA time zone of the user, for parsing and formatting times. */
  timezone: string;
  /** ID of the conversation the tool is called from. Absent for scheduled runs and MCP clients. */
  threadId?: string;
}

/**
 * An image a tool returns alongside its text. Forwarded to the model only when
 * the instance allows images to leave the machine, so `content` should still
 * describe what the image shows.
 */
export interface AssistantToolImage {
  /** Base64-encoded image bytes. */
  data: string;
  /** MIME type of `data`. */
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Short caption shown to the user next to the image. */
  caption?: string;
}

/**
 * Something in the app a tool result points at. The chat renders it as a
 * button that opens the matching view: the recording player for an event, the
 * episode player for an episode, the camera page for a camera, or a download
 * button for a file the download manager serves.
 */
export interface AssistantToolReference {
  /** What the id names. */
  kind: 'event' | 'episode' | 'camera' | 'download';
  /** Id of the event, episode or camera, or the download token. */
  id: string;
  /** Short label for the button, for example the camera name and time. */
  label?: string;
  /** Camera the event belongs to, required for `event`. */
  cameraId?: string;
  /** Start of the event or episode in milliseconds since the epoch, required for `event`. */
  timestamp?: number;
  /** Download path from the download manager, required for `download`; the chat shows a download button labelled with `label`. */
  url?: string;
}

/**
 * Result of a tool call. Return `error` for problems the model can repair by
 * asking differently (unknown camera, empty range); throw only for failures
 * that should end the run.
 */
export interface AssistantToolResult {
  /** Text or JSON the model reads. The host serializes JSON. */
  content?: string | Record<string, unknown> | unknown[];
  /** Images to show and, when allowed, to send to the model. */
  images?: AssistantToolImage[];
  /** Things the chat should offer to open, at most a handful per result. */
  references?: AssistantToolReference[];
  /** User-level problem the model may repair. Replaces `content`. */
  error?: string;
}

/**
 * Implemented by plugins that list `PluginInterface.AssistantTools` in their
 * contract. The host asks for the tool list once after the plugin is ready and
 * dispatches calls by name.
 *
 * @example
 * ```ts
 * class MyPlugin extends BasePlugin implements AssistantToolProvider {
 *   assistantTools(): AssistantToolSpec[] {
 *     return [queryEvents];
 *   }
 *
 *   async callAssistantTool(name: string, input: Record<string, unknown>, ctx: AssistantToolContext): Promise<AssistantToolResult> {
 *     if (name === 'query_events') return { content: await this.store.query(input.from as string, input.to as string) };
 *     return { error: `Unknown tool ${name}` };
 *   }
 * }
 * ```
 */
export interface AssistantToolProvider {
  /**
   * List the tools this plugin offers. Called once per plugin start.
   *
   * @returns The tool specs, empty when the plugin currently has none.
   */
  assistantTools(): Promise<AssistantToolSpec[]> | AssistantToolSpec[];

  /**
   * Run one tool. Validate `input` against the declared schema, the host does
   * not.
   *
   * @param name - Tool name as declared in {@link AssistantToolSpec.name}.
   *
   * @param input - Parsed arguments the model produced.
   *
   * @param ctx - Who is asking and in which language.
   *
   * @returns Text, JSON or images for the model, or an `error` it may repair.
   */
  callAssistantTool(name: string, input: Record<string, unknown>, ctx: AssistantToolContext): Promise<AssistantToolResult>;
}

/**
 * Identity helper that keeps the literal types of a tool spec, so a typo in a
 * property type is a compile error instead of a runtime surprise.
 *
 * @param spec - The tool spec.
 *
 * @returns The same spec, unchanged.
 *
 * @example
 * ```ts
 * const setFavorite = defineAssistantTool({
 *   name: 'set_favorite',
 *   description: 'Mark or unmark a recorded event as favorite.',
 *   inputSchema: { type: 'object', properties: { eventId: { type: 'string' }, favorite: { type: 'boolean' } }, required: ['eventId', 'favorite'] },
 *   approval: true,
 * });
 * ```
 */
export function defineAssistantTool<const T extends AssistantToolSpec>(spec: T): T {
  return spec;
}
