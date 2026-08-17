export const AUTH_RETURN_KEY = "trajeto_return_to";

export function isSafeStationReturnPath(value: string | null): value is string {
  return Boolean(value && value.startsWith("/postos") && !value.startsWith("//") && !value.includes("\\"));
}

type ReturnStorage = Pick<Storage, "getItem" | "removeItem">;

export function consumeStationReturn(storage: ReturnStorage, currentPath: string) {
  const returnPath = storage.getItem(AUTH_RETURN_KEY);
  if (!isSafeStationReturnPath(returnPath)) {
    if (returnPath) storage.removeItem(AUTH_RETURN_KEY);
    return null;
  }

  storage.removeItem(AUTH_RETURN_KEY);
  return returnPath === currentPath ? null : returnPath;
}
