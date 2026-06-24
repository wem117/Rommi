export function timestampToDate<T>(value: T) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const next = new Date(value);
    if (!Number.isNaN(next.getTime())) return next;
  }
  return null;
}

export function converter<T>() {
  return {
    toFirestore(value: T) {
      return value;
    },
    fromFirestore(value: T) {
      return value;
    }
  };
}
