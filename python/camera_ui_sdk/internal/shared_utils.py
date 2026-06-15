from __future__ import annotations

from typing import Any


def is_equal(first: Any, second: Any, ignore_order: bool = False) -> bool:
    """
    Deep equality check for arbitrary values.

    Recursively compares primitives, lists, and dicts. Dict comparison
    ignores key declaration order (only key/value pairs matter). Set
    ``ignore_order`` to ``True`` to compare lists as multisets, i.e.
    ignoring element order.

    Typically used for property-change detection on sensors: a property
    update is only emitted when the new value is not deeply equal to the
    previous value, which avoids redundant events for unchanged data.

    Args:
        first: First value to compare.
        second: Second value to compare.
        ignore_order: If ``True``, lists are compared ignoring element order.

    Returns:
        ``True`` if the values are deeply equal.
    """
    # Same reference or both primitive and equal
    if first is second:
        return True

    # Handle None
    if first is None or second is None:
        return first is second

    # Different types
    if type(first) is not type(second):
        return False

    # List comparison
    if isinstance(first, list):
        if len(first) != len(second):  # pyright: ignore[reportUnknownArgumentType]
            return False
        if ignore_order:
            second_copy = list(second)
            for item in first:  # pyright: ignore[reportUnknownVariableType]
                found = False
                for i, second_item in enumerate(second_copy):
                    if is_equal(item, second_item, ignore_order):
                        second_copy.pop(i)
                        found = True
                        break
                if not found:
                    return False
            return True
        else:
            return all(
                is_equal(item, second[i], ignore_order)
                for i, item in enumerate(first)  # pyright: ignore[reportUnknownArgumentType,reportUnknownVariableType]
            )

    # Dict comparison
    if isinstance(first, dict):
        if len(first) != len(second):  # pyright: ignore[reportUnknownArgumentType]
            return False
        for key in first:  # pyright: ignore[reportUnknownVariableType]
            if key not in second:
                return False
            if not is_equal(first[key], second[key], ignore_order):
                return False
        return True

    # Primitive comparison (fallback)
    return bool(first == second)
