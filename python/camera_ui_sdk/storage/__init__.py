from __future__ import annotations

from collections.abc import Awaitable, Callable, Coroutine, Mapping
from typing import (
    Any,
    Generic,
    Literal,
    Protocol,
    Required,
    TypedDict,
    TypeVar,
    overload,
    runtime_checkable,
)

from typing_extensions import TypeVar as ExtTypeVar

PluginConfig = dict[str, Any]
"""Plugin configuration type."""

OnSetCallback = (
    Callable[[Any, Any], None | Any]
    | Callable[[Any, Any], Awaitable[None | Any]]
    | Callable[[Any, Any], Coroutine[Any, Any, None | Any]]
)
"""Callback type for onSet handlers."""

OnGetCallback = (
    Callable[[], None | Any]
    | Callable[[], Awaitable[None | Any]]
    | Callable[[], Coroutine[Any, Any, None | Any]]
)
"""Callback type for onGet handlers."""

JsonSchemaType = Literal["string", "number", "boolean", "array", "button", "submit"]
"""Available schema field types for configuration UI."""

StringFormat = Literal[
    "date-time", "date", "time", "email", "uuid", "ipv4", "ipv6", "password", "qrCode", "image"
]
"""String format types for validation/display.

Used on string-typed schemas to render a specialized UI control:

- ``date-time`` — ISO 8601 date+time picker.
- ``date`` — date-only picker.
- ``time`` — time-only picker.
- ``email`` — email input with format validation.
- ``uuid`` — UUID input with format validation.
- ``ipv4`` — IPv4 address input.
- ``ipv6`` — IPv6 address input.
- ``password`` — masked input that hides characters.
- ``qrCode`` — value is rendered as a QR code (read-only display).
- ``image`` — value is a data URL or path; rendered as a thumbnail.
"""

ButtonColor = Literal["success", "info", "warn", "danger"]
"""Button color variants."""

SchemaConditionOperator = Literal["eq", "neq", "gt", "lt", "in", "nin"]
"""Comparison operators for conditional field visibility."""


class SchemaCondition(TypedDict, total=False):
    """
    Condition that controls when a field is visible.
    The field is shown only when the condition evaluates to true against
    the current form values.

    Combine multiple conditions on a field via a list — all must pass
    (logical AND).

    Example:
        Show ``apiKey`` only when ``authMode`` equals ``token``::

            {
                "key": "apiKey",
                "type": "string",
                "title": "API Key",
                "description": "",
                "condition": {"key": "authMode", "value": "token"},
            }

        Show ``port`` only when ``protocol`` is one of the listed values::

            {"key": "protocol", "operator": "in", "value": ["http", "https"]}
    """

    key: Required[str]
    """Key of another field whose value drives visibility."""

    value: Required[Any]
    """Expected value — single value, or list for ``in`` / ``nin``."""

    operator: SchemaConditionOperator
    """Comparison operator (default: ``eq``)."""


T = TypeVar(
    "T",
    str,
    int,
    float,
    bool,
    list[str],
    list[int],
    list[float],
    list[bool],
    str | list[str],
)
"""Generic type variable for schema default values."""

V1 = ExtTypeVar("V1", default=str)
"""TypeVar for generic getValue return type."""

V2 = ExtTypeVar("V2", bound=Mapping[str, Any], default=dict[str, Any])
"""TypeVar for generic storage values type. Compatible with TypedDict."""


class JsonFactorySchema(TypedDict):
    """
    Base schema interface for all schema types.
    Contains common fields like type, key, title, description.
    """

    type: JsonSchemaType
    """Field type."""

    key: str
    """Unique field identifier."""

    title: str
    """Display title."""

    description: str
    """Field description/help text."""


class JsonBaseSchemaWithoutCallbacks(JsonFactorySchema, Generic[T], total=False):
    """
    Base schema without callbacks - used for nested schemas.
    Extends factory schema with common display options.
    """

    group: str
    """Optional group name for organizing fields."""

    hidden: bool
    """Hide field from UI."""

    required: bool
    """Mark field as required."""

    readonly: bool
    """Make field read-only."""

    placeholder: str
    """Placeholder text for empty fields."""

    defaultValue: T
    """Default value when not set."""

    condition: SchemaCondition | list[SchemaCondition]
    """Condition for conditional field visibility. List = all must be true (AND)."""


class JsonBaseSchema(JsonBaseSchemaWithoutCallbacks[T], Generic[T], total=False):
    """
    Base schema with callbacks - full schema interface.
    Adds storage and callback options for dynamic behavior.
    """

    store: bool
    """Whether to persist this field to storage."""

    onSet: OnSetCallback
    """Callback when value changes."""

    onGet: OnGetCallback
    """Callback to get computed value."""


class JsonStringSchema(TypedDict, total=False):
    """String-specific schema options."""

    type: Literal["string"]

    format: StringFormat
    """String format for validation/display."""

    minLength: int
    """Minimum string length."""

    maxLength: int
    """Maximum string length."""


class JsonNumberSchema(TypedDict, total=False):
    """Number-specific schema options."""

    type: Literal["number"]

    minimum: int | float
    """Minimum value."""

    maximum: int | float
    """Maximum value."""

    step: int | float
    """Step increment for number input."""


class JsonBooleanSchema(TypedDict):
    """Boolean-specific schema options."""

    type: Literal["boolean"]


class JsonEnumSchema(TypedDict, total=False):
    """Enum/select schema options."""

    type: Literal["string"]

    enum: list[str]
    """Available options."""

    multiple: bool
    """Allow multiple selection."""


class JsonArraySchema(TypedDict, total=False):
    """Array schema options."""

    type: Literal["array"]

    opened: bool
    """Whether array items are expanded by default."""

    items: JsonSchemaWithoutCallbacks
    """Schema for array items."""


class JsonSchemaString(JsonBaseSchema[str], total=False):
    """Complete string schema with callbacks."""

    type: Required[Literal["string"]]  # type: ignore[misc]

    format: StringFormat
    """String format for validation/display."""

    minLength: int
    """Minimum string length."""

    maxLength: int
    """Maximum string length."""


class JsonSchemaStringWithoutCallbacks(JsonBaseSchemaWithoutCallbacks[str], total=False):
    """String schema without callbacks (for nested use)."""

    type: Required[Literal["string"]]  # type: ignore[misc]

    format: StringFormat

    minLength: int

    maxLength: int


class JsonSchemaNumber(JsonBaseSchema[int | float], total=False):
    """Complete number schema with callbacks."""

    type: Required[Literal["number"]]  # type: ignore[misc]

    minimum: int | float

    maximum: int | float

    step: int | float


class JsonSchemaNumberWithoutCallbacks(JsonBaseSchemaWithoutCallbacks[int | float], total=False):
    """Number schema without callbacks (for nested use)."""

    type: Required[Literal["number"]]  # type: ignore[misc]

    minimum: int | float

    maximum: int | float

    step: int | float


class JsonSchemaBoolean(JsonBaseSchema[bool], total=False):
    """Complete boolean schema with callbacks."""

    type: Required[Literal["boolean"]]  # type: ignore[misc]


class JsonSchemaBooleanWithoutCallbacks(JsonBaseSchemaWithoutCallbacks[bool], total=False):
    """Boolean schema without callbacks (for nested use)."""

    type: Required[Literal["boolean"]]  # type: ignore[misc]


class JsonSchemaEnum(JsonBaseSchema[str | list[str]], total=False):
    """Complete enum schema with callbacks."""

    type: Required[Literal["string"]]  # type: ignore[misc]

    enum: Required[list[str]]

    multiple: bool


class JsonSchemaEnumWithoutCallbacks(JsonBaseSchemaWithoutCallbacks[str | list[str]], total=False):
    """Enum schema without callbacks (for nested use)."""

    type: Required[Literal["string"]]  # type: ignore[misc]

    enum: Required[list[str]]

    multiple: bool


class JsonSchemaArray(JsonBaseSchema[list[str] | list[int] | list[float] | list[bool]], total=False):  # pyright: ignore[reportInvalidTypeArguments]
    """Complete array schema with callbacks."""

    type: Required[Literal["array"]]  # type: ignore[misc]

    opened: bool

    items: JsonSchemaWithoutCallbacks


class JsonSchemaArrayWithoutCallbacks(
    JsonBaseSchemaWithoutCallbacks[list[str] | list[int] | list[float] | list[bool]],  # pyright: ignore[reportInvalidTypeArguments]
    total=False,
):
    """Array schema without callbacks (for nested use)."""

    type: Required[Literal["array"]]  # type: ignore[misc]

    opened: bool

    items: JsonSchemaWithoutCallbacks


class JsonSchemaButton(TypedDict, total=False):
    """Button schema - triggers an action without storing a value."""

    type: Required[Literal["button"]]

    key: Required[str]

    title: Required[str]

    description: Required[str]

    onSet: Callable[[], Awaitable[None]] | Callable[[], None]
    """Click handler."""

    group: str

    color: ButtonColor
    """Button color variant."""


class JsonSchemaSubmit(TypedDict, total=False):
    """Submit button schema - submits form data and can return updated schema."""

    type: Required[Literal["submit"]]

    key: Required[str]

    title: Required[str]

    description: Required[str]

    onClick: Required[Callable[[Any], Awaitable[FormSubmitResponse | None]]]
    """Submit handler - receives form values, can return toast/schema updates."""

    group: str

    color: ButtonColor


JsonSchema = (
    JsonSchemaString
    | JsonSchemaNumber
    | JsonSchemaBoolean
    | JsonSchemaEnum
    | JsonSchemaArray
    | JsonSchemaButton
    | JsonSchemaSubmit
)
"""Union of every top-level schema type (with callbacks).

Use this when defining the schemas you pass to ``defineSchemas``,
``addSchema``, or ``changeSchema``. Each entry describes one configurable
field rendered in the UI; the discriminator is the ``type`` property.
"""

JsonSchemaWithoutKey = (
    JsonSchemaStringWithoutCallbacks
    | JsonSchemaNumberWithoutCallbacks
    | JsonSchemaBooleanWithoutCallbacks
    | JsonSchemaEnumWithoutCallbacks
)
"""Schema variant without the ``key`` field.

Used when the key is provided externally (e.g. as a dict property).
"""

JsonSchemaWithoutCallbacks = (
    JsonSchemaStringWithoutCallbacks
    | JsonSchemaNumberWithoutCallbacks
    | JsonSchemaBooleanWithoutCallbacks
    | JsonSchemaEnumWithoutCallbacks
    | JsonSchemaArrayWithoutCallbacks
)
"""Union type of schemas without callbacks. Use this for nested schemas (e.g., array items)."""


class ToastMessage(TypedDict):
    """
    Toast notification message.

    Returned from a submit handler (``JsonSchemaSubmit.onClick``) inside a
    ``FormSubmitResponse`` to surface a transient banner in the UI — for
    example to confirm that a credential check succeeded or failed.
    """

    type: Literal["info", "success", "warning", "error"]
    """Severity — controls the icon/color of the banner."""

    message: str
    """Human-readable message text."""


class FormSubmitSchema(TypedDict):
    """Form submit input data."""

    config: dict[str, Any]
    """Form configuration values."""


class FormSubmitResponse(TypedDict, total=False):
    """
    Form submit response — returned by ``JsonSchemaSubmit.onClick``.

    Used to react to a user-triggered submit (e.g. "Test connection",
    "Pair device") with optional UI feedback. Either field may be set:

    - ``toast`` shows a transient banner.
    - ``schema`` replaces the current form schema, useful for multi-step
      flows where the next step depends on the submitted values.
    """

    toast: ToastMessage
    """Optional toast banner to display after the submit completes."""

    schema: list[JsonSchemaWithoutCallbacks]
    """Optional updated schema definitions (full replacement of fields)."""


class SchemaConfig(TypedDict):
    """
    Schema configuration bundle.
    Contains both schema definitions and current values.
    """

    schema: list[JsonSchema]
    """Schema definitions."""

    config: dict[str, Any]
    """Current configuration values."""


@runtime_checkable
class DeviceStorage(Protocol, Generic[V2]):
    """
    Device storage interface for plugin/camera configuration.

    Provides methods to read/write configuration values and manage schemas.
    Each plugin and camera can have its own storage instance.

    Example:
        ```python
        # Get a value with default
        threshold = await storage.getValue("motionThreshold", 50)

        # Set a value
        await storage.setValue("motionThreshold", 75)

        # Add a new schema field
        await storage.addSchema(
            {
                "type": "number",
                "key": "sensitivity",
                "title": "Sensitivity",
                "description": "Detection sensitivity (0-100)",
                "minimum": 0,
                "maximum": 100,
                "defaultValue": 50,
            }
        )
        ```
    """

    schemas: list[JsonSchema]
    """Current schema definitions."""

    values: V2
    """Current configuration values."""

    @overload
    async def getValue(self, key: str) -> V1 | None: ...
    @overload
    async def getValue(self, key: str, default_value: V1) -> V1: ...
    async def getValue(self, key: str, default_value: V1 | None = None) -> V1 | None:
        """
        Get a configuration value.

        Args:
            key: Configuration key
            default_value: Default value if key doesn't exist

        Returns:
            The configuration value or default
        """
        ...

    async def setValue(self, key: str, new_value: Any) -> None:
        """
        Set a configuration value.

        Args:
            key: Configuration key
            new_value: New value to set
        """
        ...

    async def submitValue(self, key: str, new_value: Any) -> FormSubmitResponse | None:
        """
        Submit a value (for submit-type schemas).

        Args:
            key: Schema key
            new_value: Submitted value

        Returns:
            Optional response with toast/schema updates
        """
        ...

    def hasValue(self, key: str) -> bool:
        """
        Check if a configuration value exists.

        Args:
            key: Configuration key
        """
        ...

    async def getConfig(self) -> SchemaConfig:
        """
        Get the full schema configuration.

        Returns:
            Schema definitions and current values
        """
        ...

    async def setConfig(self, new_config: V2) -> None:
        """
        Set the full configuration.

        Args:
            new_config: New configuration values
        """
        ...

    async def addSchema(self, schema: JsonSchema) -> None:
        """
        Add a new schema field.

        Args:
            schema: Schema definition to add
        """
        ...

    def removeSchema(self, key: str) -> None:
        """
        Remove a schema field.

        Args:
            key: Schema key to remove
        """
        ...

    async def changeSchema(self, key: str, new_schema: dict[str, Any]) -> None:
        """
        Update an existing schema field.

        Args:
            key: Schema key to update
            new_schema: Partial schema with updated fields
        """
        ...

    def getSchema(self, key: str) -> JsonSchema | None:
        """
        Get a schema definition by key.

        Args:
            key: Schema key

        Returns:
            Schema or None
        """
        ...

    def hasSchema(self, key: str) -> bool:
        """
        Check if a schema exists.

        Args:
            key: Schema key
        """
        ...

    def setInternalValue(self, key: str, value: Any) -> None:
        """
        Set a system-internal value without requiring a schema and persist it.

        Args:
            key: Internal key (typically prefixed with '_')
            value: Value to set
        """
        ...

    def save(self) -> None:
        """Persist all changes to storage."""
        ...


__all__ = [
    "PluginConfig",
    # Callback types
    "OnSetCallback",
    "OnGetCallback",
    # Schema type literals
    "JsonSchemaType",
    "StringFormat",
    "ButtonColor",
    # Type variables
    "V1",
    "V2",
    # Base schemas
    "JsonFactorySchema",
    "JsonBaseSchemaWithoutCallbacks",
    "JsonBaseSchema",
    # Type-specific schemas
    "JsonStringSchema",
    "JsonNumberSchema",
    "JsonBooleanSchema",
    "JsonEnumSchema",
    "JsonArraySchema",
    # Combined schema types (with callbacks)
    "JsonSchemaString",
    "JsonSchemaNumber",
    "JsonSchemaBoolean",
    "JsonSchemaEnum",
    "JsonSchemaArray",
    "JsonSchemaButton",
    "JsonSchemaSubmit",
    # Combined schema types (without callbacks)
    "JsonSchemaStringWithoutCallbacks",
    "JsonSchemaNumberWithoutCallbacks",
    "JsonSchemaBooleanWithoutCallbacks",
    "JsonSchemaEnumWithoutCallbacks",
    "JsonSchemaArrayWithoutCallbacks",
    # Union types
    "JsonSchema",
    "JsonSchemaWithoutKey",
    "JsonSchemaWithoutCallbacks",
    # Response types
    "ToastMessage",
    "FormSubmitSchema",
    "FormSubmitResponse",
    "SchemaConfig",
    # Storage interfaces
    "DeviceStorage",
]
