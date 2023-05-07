export function isEmptyObject<T extends {}>(obj: T | undefined | null) {
  for (const _ in obj) {
    return false;
  }
  return true;
}
