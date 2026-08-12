import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { getApiErrorMessage } from "./errors";

function makeAxiosError(detail: unknown, status = 400): AxiosError {
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    {
      status,
      statusText: "Bad Request",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
      data: { detail },
    } as never
  );
}

describe("getApiErrorMessage", () => {
  it("extracts the FastAPI-style { detail } string from a real AxiosError", () => {
    const err = makeAxiosError("A user with this email already exists.");
    expect(getApiErrorMessage(err)).toBe("A user with this email already exists.");
  });

  it("falls back to the default message when detail is missing", () => {
    const err = makeAxiosError(undefined);
    expect(getApiErrorMessage(err)).toBe("Something went wrong. Please try again.");
  });

  it("falls back when detail isn't a string (e.g. FastAPI's validation-error array shape)", () => {
    const err = makeAxiosError([{ msg: "field required" }]);
    expect(getApiErrorMessage(err)).toBe("Something went wrong. Please try again.");
  });

  it("uses a custom fallback message when provided", () => {
    const err = makeAxiosError(undefined);
    expect(getApiErrorMessage(err, "Custom fallback")).toBe("Custom fallback");
  });

  it("falls back safely for a completely non-Axios error (e.g. a thrown string or plain Error)", () => {
    expect(getApiErrorMessage(new Error("network down"))).toBe("Something went wrong. Please try again.");
    expect(getApiErrorMessage("not even an error object")).toBe("Something went wrong. Please try again.");
    expect(getApiErrorMessage(null)).toBe("Something went wrong. Please try again.");
  });
});
