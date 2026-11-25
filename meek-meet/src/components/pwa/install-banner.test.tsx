import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import InstallBanner from "./install-banner";

const DISMISS_KEY = "mm-pwa-dismissed";

function fireBeforeInstallPrompt() {
  const event = new Event("beforeinstallprompt") as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome: "accepted" as const });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

function stubMatchMedia(standalone: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: standalone,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  );
}

describe("InstallBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    stubMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing before any install signal", () => {
    render(<InstallBanner />);
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("appears after beforeinstallprompt and the gentle delay", () => {
    render(<InstallBanner />);
    fireBeforeInstallPrompt();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Keep Meek Meet on your phone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^install$/i })).toBeInTheDocument();
  });

  it("install button triggers the native prompt", async () => {
    render(<InstallBanner />);
    const event = fireBeforeInstallPrompt();
    act(() => {
      vi.advanceTimersByTime(9000);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^install$/i }));
    });
    expect(event.prompt).toHaveBeenCalled();
    // Accepted → banner goes away.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dismissal hides the banner and persists", () => {
    render(<InstallBanner />);
    fireBeforeInstallPrompt();
    act(() => {
      vi.advanceTimersByTime(9000);
    });

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(DISMISS_KEY)).toBe("1");
  });

  it("never shows when previously dismissed", () => {
    localStorage.setItem(DISMISS_KEY, "1");
    render(<InstallBanner />);
    fireBeforeInstallPrompt();
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("never shows when already installed (standalone mode)", () => {
    stubMatchMedia(true);
    render(<InstallBanner />);
    fireBeforeInstallPrompt();
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides when the app is installed while the banner is up", () => {
    render(<InstallBanner />);
    fireBeforeInstallPrompt();
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("registers the service worker when supported", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });
    render(<InstallBanner />);
    expect(register).toHaveBeenCalledWith("/sw.js");
    // @ts-expect-error cleanup of the defineProperty above
    delete navigator.serviceWorker;
  });
});
