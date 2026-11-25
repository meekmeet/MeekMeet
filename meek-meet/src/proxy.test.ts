import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { makeAuthUser } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/middleware", () => ({ updateSession: vi.fn() }));

import { updateSession } from "@/lib/supabase/middleware";
import { proxy, config } from "./proxy";

function requestTo(path: string, withAuthCookie = false): NextRequest {
  const req = new NextRequest(`http://localhost${path}`);
  if (withAuthCookie) req.cookies.set("sb-test-auth-token", "session");
  return req;
}

const user = makeAuthUser();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("proxy", () => {
  it("redirects unauthenticated users from /dashboard to /login", async () => {
    const passThrough = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue({ supabaseResponse: passThrough, user: null });
    const res = await proxy(requestTo("/dashboard", true));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login");
  });

  it("redirects unauthenticated users from nested dashboard routes", async () => {
    vi.mocked(updateSession).mockResolvedValue({ supabaseResponse: NextResponse.next(), user: null });
    const res = await proxy(requestTo("/dashboard/shepherd/some-circle/reports", true));
    expect(res.headers.get("location")).toBe("http://localhost/login");
  });

  it("lets authenticated users through to /dashboard", async () => {
    const passThrough = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue({ supabaseResponse: passThrough, user });
    const res = await proxy(requestTo("/dashboard", true));
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects authenticated users away from /login", async () => {
    vi.mocked(updateSession).mockResolvedValue({ supabaseResponse: NextResponse.next(), user });
    const res = await proxy(requestTo("/login", true));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("lets unauthenticated users view /login", async () => {
    const passThrough = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue({ supabaseResponse: passThrough, user: null });
    const res = await proxy(requestTo("/login", true));
    expect(res.headers.get("location")).toBeNull();
  });

  it("passes marketing pages through for everyone", async () => {
    const passThrough = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue({ supabaseResponse: passThrough, user: null });
    for (const path of ["/", "/about", "/circles", "/shepherd", "/voice", "/privacy"]) {
      const res = await proxy(requestTo(path, true));
      expect(res.headers.get("location"), path).toBeNull();
    }
  });

  it("skips the Supabase auth round-trip for anonymous visitors", async () => {
    for (const path of ["/", "/about", "/circles", "/shepherd", "/voice", "/privacy", "/media"]) {
      const res = await proxy(requestTo(path));
      expect(res.headers.get("location"), path).toBeNull();
    }
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("still refreshes the session when an auth cookie is present on marketing pages", async () => {
    vi.mocked(updateSession).mockResolvedValue({ supabaseResponse: NextResponse.next(), user });
    const res = await proxy(requestTo("/about", true));
    expect(res.headers.get("location")).toBeNull();
    expect(updateSession).toHaveBeenCalledTimes(1);
  });

  it("treats anonymous requests to /dashboard as unauthenticated (no cookie, no call)", async () => {
    const res = await proxy(requestTo("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login");
    expect(updateSession).not.toHaveBeenCalled();
  });
});

describe("proxy config matcher", () => {
  it("excludes api routes, next internals, and static assets", () => {
    expect(config.matcher).toHaveLength(1);
    const matcher = config.matcher[0];
    expect(matcher).toContain("(?!api|_next/static|_next/image|favicon.ico");
    expect(matcher).toContain("svg|png|jpg|jpeg|gif|webp");
  });
});
