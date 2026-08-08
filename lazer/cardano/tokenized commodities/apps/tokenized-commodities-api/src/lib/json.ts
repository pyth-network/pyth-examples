export function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue) =>
      typeof currentValue === "bigint" ? currentValue.toString() : currentValue
    )
  ) as T;
}
