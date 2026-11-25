import { describe, it, expect } from "vitest";
import { requireEnv } from "./env";

describe("requireEnv", () => {
  it("returns the value when set", () => {
    process.env.TEST_ENV_VAR = "hello";
    expect(requireEnv("TEST_ENV_VAR")).toBe("hello");
    delete process.env.TEST_ENV_VAR;
  });

  it("throws a descriptive error naming the variable when unset", () => {
    expect(() => requireEnv("DEFINITELY_MISSING_VAR")).toThrow(
      "Missing required environment variable: DEFINITELY_MISSING_VAR"
    );
  });

  it("throws when the variable is empty string", () => {
    process.env.TEST_ENV_VAR = "";
    expect(() => requireEnv("TEST_ENV_VAR")).toThrow(
      "Missing required environment variable: TEST_ENV_VAR"
    );
    delete process.env.TEST_ENV_VAR;
  });

  it("returns '0' and 'false' as valid values", () => {
    process.env.TEST_ENV_VAR = "0";
    expect(requireEnv("TEST_ENV_VAR")).toBe("0");
    process.env.TEST_ENV_VAR = "false";
    expect(requireEnv("TEST_ENV_VAR")).toBe("false");
    delete process.env.TEST_ENV_VAR;
  });
});
