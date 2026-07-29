from __future__ import annotations

from typing import Any


def is_equal(first: Any, second: Any, ignore_order: bool = False) -> bool:
    """Deep equality for primitives, lists, and dicts. Dict key order never matters.

    Args:
        first: First value to compare.
        second: Second value to compare.
        ignore_order: Compare lists as multisets instead of position by position.

    Returns:
        ``True`` if the values are deeply equal.

    Example:
        ```python
        is_equal({"a": 1, "b": 2}, {"b": 2, "a": 1})  # True
        ```
    """
    if first is second:
        return True

    if first is None or second is None:
        return first is second

    if type(first) is not type(second):
        return False

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

    if isinstance(first, dict):
        if len(first) != len(second):  # pyright: ignore[reportUnknownArgumentType]
            return False
        for key in first:  # pyright: ignore[reportUnknownVariableType]
            if key not in second:
                return False
            if not is_equal(first[key], second[key], ignore_order):
                return False
        return True

    return bool(first == second)
