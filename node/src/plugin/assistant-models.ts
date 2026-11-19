/**
 * One model a plugin offers to the assistant. The user picks it under
 * Settings, Assistant like any other model; the host never sees a key or an
 * endpoint of it.
 *
 * @example
 * ```ts
 * const onDevice: AssistantModelSpec = {
 *   id: 'apple-on-device',
 *   name: 'Apple on-device',
 *   contextTokens: 8192,
 *   vision: true,
 *   toolCalling: true,
 *   structuredOutput: true,
 *   note: 'Runs on this Mac, nothing leaves the house.',
 * };
 * ```
 */
export interface AssistantModelSpec {
  /** Model id, unique within the plugin and stable across restarts: the settings store it. */
  id: string;
  /** Name shown in the model list. */
  name: string;
  /** Hard context limit of the model in tokens. The host plans prompt, tools and history with it. */
  contextTokens: number;
  /** The model reads images. Without it the host sends text only. */
  vision: boolean;
  /** The model calls tools. Without it the assistant answers from the conversation alone. */
  toolCalling: boolean;
  /** The model honors a JSON schema. Without it the host asks for free text and parses defensively. */
  structuredOutput: boolean;
  /**
   * The host picks the tools for a question with a short call of its own and puts only those in front of the model.
   * For a small model that calls the tools it sees but does not work through a catalog of fifty.
   */
  toolRouting?: boolean;
  /** One line shown next to the model, for example where it runs or what it costs. */
  note?: string;
}

/**
 * Part of a message. Images arrive only for a model whose spec says `vision`,
 * and only when the instance allows pictures to reach the model.
 */
export type AssistantModelContent =
  | {
    /** Always `text`. */
    type: 'text';
    /** The text itself. */
    text: string;
  }
  | {
    /** Always `image`. */
    type: 'image';
    /** Base64-encoded image bytes. */
    data: string;
    /** MIME type of `data`. */
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  };

/**
 * One message of the conversation. `tool` messages carry the result of the
 * call with the matching `toolCallId`.
 */
export interface AssistantModelMessage {
  /** Who wrote it. */
  role: 'user' | 'assistant' | 'tool';
  /** Text and images of the message. */
  content: AssistantModelContent[];
  /** Tool calls the assistant asked for, on `assistant` messages. */
  toolCalls?: AssistantModelToolCall[];
  /** Call this message answers, on `tool` messages. */
  toolCallId?: string;
}

/** A tool call: which tool with which arguments. */
export interface AssistantModelToolCall {
  /** Id the host uses to match the result, unique within the request. */
  id: string;
  /** Name of the tool as declared in {@link AssistantModelRequest.tools}. */
  name: string;
  /** Arguments as parsed JSON, matching the tool's input schema. */
  arguments: Record<string, unknown>;
}

/** A tool the model may call in this request. */
export interface AssistantModelTool {
  /** Name the model uses in its call. */
  name: string;
  /** What the tool does, written for the model. */
  description: string;
  /** JSON Schema object of the arguments. */
  inputSchema: Record<string, unknown>;
}

/**
 * One request to a plugin model: the conversation so far plus what the model
 * may do with it.
 */
export interface AssistantModelRequest {
  /** Model id from {@link AssistantModelSpec.id}. */
  modelId: string;
  /** Instructions that precede the conversation. */
  system: string[];
  /** The conversation, oldest first. The host has already trimmed it to `contextTokens`. */
  messages: AssistantModelMessage[];
  /** Tools the model may call. Empty when the run allows none. */
  tools: AssistantModelTool[];
  /** JSON Schema the answer has to match. Only set for models whose spec says `structuredOutput`. */
  outputSchema?: Record<string, unknown>;
  /** Upper bound for the answer in tokens, when the host has one. */
  maxOutputTokens?: number;
}

/**
 * A piece of the answer. Yield `text` as it is generated, `tool_call` once the
 * arguments are complete, `usage` when the model reports token counts, and
 * `done` exactly once at the end.
 */
export type AssistantModelChunk =
  | {
    /** Always `text`. */
    type: 'text';
    /** The text generated since the last chunk. */
    delta: string;
  }
  | {
    /** Always `tool_call`. */
    type: 'tool_call';
    /** The call itself. */
    call: AssistantModelToolCall;
  }
  | {
    /** Always `usage`. */
    type: 'usage';
    /** Tokens the request consumed. */
    promptTokens: number;
    /** Tokens the answer consumed. */
    completionTokens: number;
  }
  | {
    /** Always `done`. */
    type: 'done';
    /** Why the model stopped. */
    finish: 'stop' | 'tool_calls' | 'length' | 'error';
    /** What went wrong, with `error`. */
    message?: string;
  };

/**
 * Whether the plugin can answer right now. A model that has to be downloaded or
 * loaded first reports `ready: false` with a line the settings page shows, and
 * a `progress` while it knows one.
 *
 * @example
 * ```ts
 * { ready: false, message: 'macOS is downloading the model', progress: 0.62 }
 * ```
 */
export interface AssistantModelStatus {
  /** The models of this plugin can answer right now. */
  ready: boolean;
  /** One line for the user: what the plugin is waiting for, or what it is doing. */
  message?: string;
  /** How far the loading got, between 0 and 1. */
  progress?: number;
}

/** Who the answer is for and when to stop writing it. */
export interface AssistantModelContext {
  /** ID of the user the answer is for. Absent for scheduled runs and plugin requests. */
  userId?: string;
  /** BCP 47 language tag the answer should use. */
  language: string;
  /** Milliseconds the host waits before it drops the answer. */
  timeoutMs: number;
}

/**
 * Implemented by plugins that list `PluginInterface.AssistantModels` in their
 * contract. Such a plugin is a bridge to a model the host cannot reach itself:
 * one without an HTTP API, one behind an unusual authentication, or one that
 * lives on the machine the plugin runs on. The plugin holds no conversation
 * state, every request carries the whole conversation.
 *
 * @example
 * ```ts
 * class ApplePlugin extends BasePlugin implements AssistantModelProvider {
 *   assistantModels(): AssistantModelSpec[] {
 *     return [{ id: 'apple-on-device', name: 'Apple on-device', contextTokens: 8192, vision: true, toolCalling: true, structuredOutput: true }];
 *   }
 *
 *   async *assistantGenerate(request: AssistantModelRequest, ctx: AssistantModelContext): AsyncGenerator<AssistantModelChunk> {
 *     for await (const delta of this.session.stream(request, ctx.timeoutMs)) {
 *       yield { type: 'text', delta };
 *     }
 *     yield { type: 'done', finish: 'stop' };
 *   }
 * }
 * ```
 */
export interface AssistantModelProvider {
  /**
   * List the models this plugin offers. Called after the plugin is ready and
   * whenever the settings page is opened.
   *
   * @returns The specs, empty while the plugin has no usable model (no
   * hardware, no permission yet).
   */
  assistantModels(): Promise<AssistantModelSpec[]> | AssistantModelSpec[];

  /**
   * Report whether the models can answer right now. The host asks before it
   * offers them and while the settings page is open, so a model that is still
   * downloading shows up as busy instead of missing. Leave it out when the
   * models are usable as soon as the plugin runs.
   *
   * @returns Readiness, with a line and a progress while it loads.
   *
   * @example
   * ```ts
   * async assistantModelStatus(): Promise<AssistantModelStatus> {
   *   const { loaded, total } = this.download;
   *   return loaded < total ? { ready: false, message: 'Loading the model', progress: loaded / total } : { ready: true };
   * }
   * ```
   */
  assistantModelStatus?(): Promise<AssistantModelStatus> | AssistantModelStatus;

  /**
   * Answer one request. The host reads chunks until `done`, then either
   * returns the text to the user or runs the tool calls and asks again with
   * their results in `messages`.
   *
   * @param request - Conversation, tools and schema for this answer.
   *
   * @param ctx - Who asks, in which language, and how long the host waits.
   *
   * @returns The answer in pieces (see {@link AssistantModelChunk}).
   */
  assistantGenerate(request: AssistantModelRequest, ctx: AssistantModelContext): AsyncGenerator<AssistantModelChunk>;
}
