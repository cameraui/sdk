/**
 * Deep equality check for arbitrary values.
 *
 * Recursively compares primitives, arrays, and plain objects. Object
 * comparison ignores property declaration order (only key/value pairs
 * matter). Set `ignoreOrder` to `true` to compare arrays as multisets,
 * i.e. ignoring element order.
 *
 * Typically used for property-change detection on sensors: a property
 * update is only emitted when the new value is not deeply equal to the
 * previous value, which avoids redundant events for unchanged data.
 *
 * @param first - First value to compare.
 *
 * @param second - Second value to compare.
 *
 * @param ignoreOrder - If `true`, arrays are compared ignoring element order.
 *
 * @returns `true` if the values are deeply equal.
 *
 * @example
 * ```ts
 * import { isEqual } from '@camera.ui/sdk/internal';
 *
 * isEqual({ a: 1, b: 2 }, { b: 2, a: 1 }); // true
 * isEqual([1, 2, 3], [3, 2, 1], true);     // true (ignoreOrder)
 * ```
 */
export function isEqual(first: unknown, second: unknown, ignoreOrder = false): boolean {
  // Same reference or both primitive and equal
  if (first === second) {
    return true;
  }

  // Handle null/undefined
  if (first === null || first === undefined || second === null || second === undefined) {
    return first === second;
  }

  // Different types
  const firstType = first.constructor?.name;
  const secondType = second.constructor?.name;
  if (firstType !== secondType) {
    return false;
  }

  // Array comparison
  if (Array.isArray(first) && Array.isArray(second)) {
    if (first.length !== second.length) {
      return false;
    }
    if (ignoreOrder) {
      const secondCopy = [...second];
      return first.every((item) => {
        const index = secondCopy.findIndex((secondItem) => isEqual(item, secondItem, ignoreOrder));
        if (index === -1) return false;
        secondCopy.splice(index, 1);
        return true;
      });
    } else {
      for (let i = 0; i < first.length; i++) {
        if (!isEqual(first[i], second[i], ignoreOrder)) {
          return false;
        }
      }
      return true;
    }
  }

  // Object comparison
  if (firstType === 'Object' && secondType === 'Object') {
    const firstObj = first as Record<string, unknown>;
    const secondObj = second as Record<string, unknown>;
    const fKeys = Object.keys(firstObj);
    const sKeys = Object.keys(secondObj);

    if (fKeys.length !== sKeys.length) {
      return false;
    }

    for (const key of fKeys) {
      if (!isEqual(firstObj[key], secondObj[key], ignoreOrder)) {
        return false;
      }
    }
    return true;
  }

  // Primitive comparison (fallback)
  return first === second;
}
