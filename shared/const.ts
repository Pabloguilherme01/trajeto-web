export const COOKIE_NAME = "__Host-app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

export const OAUTH_STATE_COOKIE = "__Host-oauth_state";

export type OAuthState = { redirectUri: string; nonce?: string };

export const encodeOAuthState = (state: OAuthState): string =>
  btoa(JSON.stringify(state));

export const decodeOAuthState = (state: string): OAuthState => {
  if (typeof state !== "string" || state.length < 16 || state.length > 4096) {
    return { redirectUri: "" };
  }

  let decoded: string;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }

  if (decoded.length > 3072) return { redirectUri: "" };

  try {
    const parsed = JSON.parse(decoded);
    if (
      parsed &&
      typeof parsed.redirectUri === "string" &&
      parsed.redirectUri.length <= 2048 &&
      (parsed.nonce === undefined || (typeof parsed.nonce === "string" && parsed.nonce.length >= 16 && parsed.nonce.length <= 256))
    ) {
      return parsed;
    }
  } catch {
    // Legacy state values are rejected by the callback because they contain no nonce.
  }

  return { redirectUri: decoded.length <= 2048 ? decoded : "" };
};
