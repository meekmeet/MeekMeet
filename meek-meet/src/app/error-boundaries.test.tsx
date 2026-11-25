import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";

const captureError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/monitor", () => ({
  captureError: (...args: unknown[]) => captureError(...args),
  monitoringEnabled: () => false,
  captureMonitoringMessage: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("app/error boundary", () => {
  it("renders the fallback UI and a try-again button", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("boom")} reset={reset} />);
    expect(screen.getAllByText(/something went wrong/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("reports the error to monitoring", () => {
    const err = Object.assign(new Error("boom"), { digest: "digest-1" });
    render(<ErrorPage error={err} reset={() => {}} />);
    expect(captureError).toHaveBeenCalledWith(
      err,
      expect.objectContaining({ boundary: "app/error", digest: "digest-1" })
    );
  });
});

describe("app/global-error boundary", () => {
  it("renders the fallback UI", () => {
    render(<GlobalError error={new Error("catastrophe")} reset={() => {}} />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
  });

  it("calls reset when the button is clicked", () => {
    const reset = vi.fn();
    render(<GlobalError error={new Error("catastrophe")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalled();
  });

  it("reports the error to monitoring", () => {
    const err = new Error("catastrophe");
    render(<GlobalError error={err} reset={() => {}} />);
    expect(captureError).toHaveBeenCalledWith(
      err,
      expect.objectContaining({ boundary: "app/global-error" })
    );
  });
});
