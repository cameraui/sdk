/**
 * Deep equality for primitives, arrays, and plain objects. Object key order never matters.
 *
 * @param first - First value to compare.
 *
 * @param second - Second value to compare.
 *
 * @param ignoreOrder - Compare arrays as multisets instead of position by position.
 *
 * @returns `true` if the values are deeply equal.
 *
 * @example
 * ```ts
 * isEqual({ a: 1, b: 2 }, { b: 2, a: 1 }); // true
 * ```
 */
export function isEqual(first: unknown, second: unknown, ignoreOrder = false): boolean {
  if (first === second) {
    return true;
  }

  if (first === null || first === undefined || second === null || second === undefined) {
    return first === second;
  }

  const firstType = first.constructor?.name;
  const secondType = second.constructor?.name;
  if (firstType !== secondType) {
    return false;
  }

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

  return first === second;
}
