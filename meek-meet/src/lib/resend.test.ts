import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function Resend(this: unknown, key: string) {
    (this as { key: string }).key = key;
  }),
}));

import { getResend } from "./resend";
import { Resend } from "resend";

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  vi.clearAllMocks();
});

describe("getResend", () => {
  it("throws when RESEND_API_KEY is missing", () => {
    expect(() => getResend()).toThrow("Missing RESEND_API_KEY environment variable");
  });

  it("creates a client with the configured key", () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const client = getResend();
    expect(Resend).toHaveBeenCalledWith("re_test_key");
    expect(client).toBeDefined();
  });

  it("throws when the key is an empty string", () => {
    process.env.RESEND_API_KEY = "";
    expect(() => getResend()).toThrow("Missing RESEND_API_KEY environment variable");
  });
});
