/**
 * authRoutes path + token parsing (Base44 reset deep-links).
 */
import { describe, expect, test } from "bun:test";
import {
  getResetTokenFromLocation,
  resolveAuthPath,
} from "./authRoutes";

describe("resolveAuthPath", () => {
  test("maps Base44 hardcoded reset paths", () => {
    expect(resolveAuthPath("/")).toBe("login");
    expect(resolveAuthPath("/forgot-password")).toBe("forgot-password");
    expect(resolveAuthPath("/reset-password")).toBe("reset-password");
    expect(resolveAuthPath("/reset-password/")).toBe("reset-password");
  });
});

describe("getResetTokenFromLocation", () => {
  test("reads token / reset_token / resetToken", () => {
    expect(getResetTokenFromLocation("?token=abc", "")).toBe("abc");
    expect(getResetTokenFromLocation("?reset_token=xyz", "")).toBe("xyz");
    expect(getResetTokenFromLocation("?resetToken=tok", "")).toBe("tok");
  });

  test("reads token from hash query", () => {
    expect(
      getResetTokenFromLocation("", "#/reset-password?token=from-hash"),
    ).toBe("from-hash");
  });
});
