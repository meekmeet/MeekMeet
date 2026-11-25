import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// framer-motion's useInView (used by landing-page sections) requires
// IntersectionObserver — a no-op stub keeps component tests jsdom-safe.
// Re-applied in beforeEach because afterEach un-stubs all globals.
const IntersectionObserverStub = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
};

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.CRON_SECRET;
  delete process.env.RESEND_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_SENTRY_DSN;
});
