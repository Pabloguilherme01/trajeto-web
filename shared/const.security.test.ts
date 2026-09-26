import { describe, expect, it } from "vitest";
import { decodeOAuthState } from "./const";

describe("OAuth state parsing", () => {
  it("rejects oversized state values", () => {
    expect(decodeOAuthState("A".repeat(4097))).toEqual({ redirectUri: "" });
  });

  it("rejects malformed base64", () => {
    expect(decodeOAuthState("not valid base64 !!!")).toEqual({ redirectUri: "" });
  });

  it("accepts bounded structured state", () => {
    const state = btoa(JSON.stringify({ redirectUri: "https://example.com/callback", nonce: "0123456789abcdef" }));
    expect(decodeOAuthState(state)).toEqual({
      redirectUri: "https://example.com/callback",
      nonce: "0123456789abcdef",
    });
  });
});
