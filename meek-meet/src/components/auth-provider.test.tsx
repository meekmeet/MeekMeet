import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { useAuth } from "./auth-provider";

const mockSupabase = vi.hoisted(() => {
  const chain: Record<string, unknown> = {};
  const thenable = {
    ...chain,
    select: () => thenable,
    eq: () => thenable,
    single: vi.fn(),
    then: vi.fn(),
  };
  return {
    from: vi.fn(() => thenable),
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        subscription: { unsubscribe: vi.fn() },
      })),
    },
    _thenable: thenable,
  };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

import { AuthProvider } from "./auth-provider";

function Probe() {
  const { user, role, isLoading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user ? user.email : "none"}</span>
      <span data-testid="role">{role ?? "no-role"}</span>
    </div>
  );
}

const fakeUser = { id: "u1", email: "member@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  mockSupabase.auth.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  }));
  mockSupabase.auth.signOut.mockResolvedValue({ error: null });
  mockSupabase._thenable.single.mockResolvedValue({ data: { role: "member" }, error: null });
});

describe("AuthProvider", () => {
  it("starts in the loading state with no user", () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByTestId("loading").textContent).toBe("true");
  });

  it("exposes the session user once loaded", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: fakeUser } },
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("user").textContent).toBe("member@example.com");
  });

  it("stays signed out when there is no session", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("user").textContent).toBe("none");
    expect(screen.getByTestId("role").textContent).toBe("no-role");
  });

  it("fetches the profile role for the signed-in user", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: fakeUser } },
    });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("role").textContent).toBe("member"));
  });

  it("defaults the role to member when the profile is missing", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: fakeUser } },
    });
    mockSupabase._thenable.single.mockResolvedValue({ data: null, error: { message: "missing" } });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("role").textContent).toBe("member"));
  });

  it("reacts to auth state change events", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    const handler = mockSupabase.auth.onAuthStateChange.mock.calls[0][0];
    await act(async () => {
      handler("SIGNED_IN", { user: fakeUser });
    });
    expect(screen.getByTestId("user").textContent).toBe("member@example.com");
  });

  it("unsubscribes from auth changes on unmount", () => {
    const unsubscribe = vi.fn();
    mockSupabase.auth.onAuthStateChange.mockReturnValueOnce({
      data: { subscription: { unsubscribe } },
    });
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("signOut clears the user", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: fakeUser } },
    });

    function SignOutProbe() {
      const auth = useAuth();
      return (
        <div>
          <span data-testid="user">{auth.user ? "signed-in" : "signed-out"}</span>
          <button onClick={() => void auth.signOut()}>sign out</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <SignOutProbe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("signed-in"));
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("signed-out"));
  });
});
