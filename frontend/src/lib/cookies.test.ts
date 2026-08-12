import { describe, it, expect, beforeEach } from "vitest";
import { setCookie, getCookie, deleteCookie } from "./cookies";

// jsdom implements document.cookie faithfully enough for these tests —
// no mocking needed, this exercises the real browser cookie API.
describe("cookie helpers", () => {
  beforeEach(() => {
    // Clear any cookies left over from a previous test.
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (name) document.cookie = `${name}=; max-age=0`;
    });
  });

  it("round-trips a simple value through set/get", () => {
    setCookie("smartsched_token", "abc123", 3600);
    expect(getCookie("smartsched_token")).toBe("abc123");
  });

  it("returns null for a cookie that was never set", () => {
    expect(getCookie("does_not_exist")).toBeNull();
  });

  it("URL-encodes values on write and decodes them on read (a JWT or JSON user object may contain special characters)", () => {
    const value = JSON.stringify({ name: "Prof. Test", role: "admin" });
    setCookie("smartsched_user", value, 3600);
    expect(getCookie("smartsched_user")).toBe(value);
  });

  it("deleteCookie removes the value (subsequent getCookie returns null)", () => {
    setCookie("smartsched_token", "abc123", 3600);
    expect(getCookie("smartsched_token")).toBe("abc123");

    deleteCookie("smartsched_token");
    expect(getCookie("smartsched_token")).toBeNull();
  });

  it("keeps two different cookies independent of each other", () => {
    setCookie("smartsched_token", "token-value", 3600);
    setCookie("smartsched_user", "user-value", 3600);

    expect(getCookie("smartsched_token")).toBe("token-value");
    expect(getCookie("smartsched_user")).toBe("user-value");

    deleteCookie("smartsched_token");
    expect(getCookie("smartsched_token")).toBeNull();
    expect(getCookie("smartsched_user")).toBe("user-value");
  });
});
