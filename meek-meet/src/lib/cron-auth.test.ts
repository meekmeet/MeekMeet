import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { isAuthorizedCron } from "./cron-auth";

function makeRequest(authHeader?: string | null): NextRequest {
  const headers = new Headers();
  if (authHeader !== null && authHeader !== undefined) {
    headers.set("authorization", authHeader);
  }
  return new NextRequest("http://localhost/api/cron", { headers });
}

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("isAuthorizedCron", () => {
  it("returns true for the exact Bearer secret", () => {
    process.env.CRON_SECRET = "s3cr3t-value";
    expect(isAuthorizedCron(makeRequest("Bearer s3cr3t-value"))).toBe(true);
  });

  it("returns false when CRON_SECRET is not configured", () => {
    expect(isAuthorizedCron(makeRequest("Bearer anything"))).toBe(false);
  });

  it("returns false when the Authorization header is missing", () => {
    process.env.CRON_SECRET = "s3cr3t-value";
    expect(isAuthorizedCron(makeRequest(null))).toBe(false);
  });

  it("returns false for a wrong secret", () => {
    process.env.CRON_SECRET = "s3cr3t-value";
    expect(isAuthorizedCron(makeRequest("Bearer wrong"))).toBe(false);
  });

  it("returns false for a secret that is a prefix of the real one", () => {
    process.env.CRON_SECRET = "s3cr3t-value";
    expect(isAuthorizedCron(makeRequest("Bearer s3cr3t"))).toBe(false);
  });

  it("returns false for doubled inner whitespace", () => {
    // Note: HTTP header values are OWS-trimmed, so trailing spaces never
    // arrive; doubled inner spaces do and must not match.
    process.env.CRON_SECRET = "s3cr3t-value";
    expect(isAuthorizedCron(makeRequest("Bearer  s3cr3t-value"))).toBe(false);
  });

  it("returns false for Basic auth", () => {
    process.env.CRON_SECRET = "s3cr3t-value";
    expect(isAuthorizedCron(makeRequest("Basic dXNlcjpwYXNz"))).toBe(false);
  });

  it("returns false when the secret itself is empty string", () => {
    process.env.CRON_SECRET = "";
    expect(isAuthorizedCron(makeRequest("Bearer "))).toBe(false);
  });

  it("returns false for wrong casing", () => {
    process.env.CRON_SECRET = "s3cr3t-value";
    expect(isAuthorizedCron(makeRequest("Bearer S3CR3T-VALUE"))).toBe(false);
  });
});
