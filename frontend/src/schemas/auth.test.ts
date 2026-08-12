import { describe, it, expect } from "vitest";
import { loginSchema } from "./auth";

describe("loginSchema", () => {
  it("accepts a valid email and non-empty password", () => {
    const result = loginSchema.safeParse({ email: "admin@college.edu", password: "Admin@123" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty email with a specific message", () => {
    const result = loginSchema.safeParse({ email: "", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Email is required");
    }
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid email address");
    }
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "admin@college.edu", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Password is required");
    }
  });
});
