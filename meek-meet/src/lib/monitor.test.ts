import { describe, it, expect, vi, afterEach } from "vitest";
import { monitoringEnabled, captureError, captureMonitoringMessage } from "./monitor";
import * as Sentry from "@sentry/nextjs";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((cb: (scope: { setContext: unknown; setLevel: unknown }) => void) => {
    cb({ setContext: vi.fn(), setLevel: vi.fn() });
  }),
}));

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  vi.clearAllMocks();
});

describe("monitoringEnabled", () => {
  it("is false without a DSN", () => {
    expect(monitoringEnabled()).toBe(false);
  });

  it("is true with a DSN configured", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o0.ingest.sentry.io/1";
    expect(monitoringEnabled()).toBe(true);
  });
});

describe("captureError", () => {
  it("reports to Sentry when enabled", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o0.ingest.sentry.io/1";
    const err = new Error("boom");
    captureError(err, { route: "/api/test" });
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
    expect(Sentry.withScope).toHaveBeenCalled();
  });

  it("does not report to Sentry when disabled", () => {
    captureError(new Error("boom"));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("logs to console when disabled", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    captureError(new Error("local boom"), { key: "value" });
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toMatch(/monitor:error/);
  });

  it("wraps non-Error values in an Error", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o0.ingest.sentry.io/1";
    captureError("string failure");
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "string failure" })
    );
  });

  it("respects the level parameter", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o0.ingest.sentry.io/1";
    captureError(new Error("warn-level"), undefined, "warning");
    expect(Sentry.withScope).toHaveBeenCalled();
  });
});

describe("captureMonitoringMessage", () => {
  it("sends to Sentry when enabled", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@o0.ingest.sentry.io/1";
    captureMonitoringMessage("edge function failed", { status: 502 });
    expect(Sentry.captureMessage).toHaveBeenCalledWith("edge function failed");
  });

  it("logs to console when disabled", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    captureMonitoringMessage("notice", { a: 1 });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[monitor:warning]"), "notice", { a: 1 });
  });
});
