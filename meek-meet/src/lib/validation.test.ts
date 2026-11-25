import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  isValidUuid,
  isValidUrl,
  escapeHtml,
  assertNonEmptyString,
  assertOptionalString,
  assertOptionalDate,
} from "./validation";

describe("isValidEmail", () => {
  it.each([
    "simple@example.com",
    "user.name@example.com",
    "user+tag@example.co.uk",
    "a@b.co",
    "user_name@example-domain.com",
    "user%tag@example.com",
    "user-name@sub.example.com",
    "UPPER@EXAMPLE.COM",
    "user123@example123.com",
  ])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  // Note: the production regex is intentionally simple; these domain edge
  // cases are accepted. Tightening it must not invalidate emails already
  // stored, so the tests document current behaviour.
  it.each([
    "user..name@example.com",
    "user@.example.com",
    "user@example..com",
    "user@-example.com",
    "user@example-.com",
  ])("accepts %s (simple-regex behaviour)", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "notanemail",
    "missing@domain",
    "@example.com",
    "user@",
    "user @example.com",
    "user@ example.com",
    "user@example .com",
    "user@exam ple.com",
    "user@example",
    "mailto:user@example.com",
    "user@example.com.",
  ])("rejects %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe("isValidUuid", () => {
  it.each([
    "123e4567-e89b-42d3-a456-426614174000",
    "00000000-0000-0000-0000-000000000000",
    "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  ])("accepts %s", (id) => {
    expect(isValidUuid(id)).toBe(true);
  });

  it.each([
    "",
    "not-a-uuid",
    "123e4567e89b42d3a456426614174000",
    "123e4567-e89b-42d3-a456-42661417400",
    "123e4567-e89b-42d3-a456-4266141740000",
    "123e4567-e89b-42d3-a456-42661417400g",
    "{123e4567-e89b-42d3-a456-426614174000}",
    " 123e4567-e89b-42d3-a456-426614174000",
    "123e4567-e89b-42d3-a456-426614174000 ",
  ])("rejects %s", (id) => {
    expect(isValidUuid(id)).toBe(false);
  });
});

describe("isValidUrl", () => {
  it.each([
    "https://example.com",
    "http://example.com",
    "https://sub.example.com/path?query=1",
    "https://example.com:8080/path#frag",
  ])("accepts %s", (url) => {
    expect(isValidUrl(url)).toBe(true);
  });

  it.each([
    "",
    "notaurl",
    "ftp://example.com",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//example.com",
    "https://",
    "example.com",
  ])("rejects %s", (url) => {
    expect(isValidUrl(url)).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });
  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });
  it("escapes double quotes", () => {
    expect(escapeHtml('say "hi"')).toBe("say &quot;hi&quot;");
  });
  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });
  it("escapes all five special characters together", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      `&lt;a href=&quot;x&quot; onclick=&#039;y&#039;&gt;&amp;&lt;/a&gt;`
    );
  });
  it("leaves safe text untouched", () => {
    expect(escapeHtml("Hello, world 123")).toBe("Hello, world 123");
  });
  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
  it("handles already-escaped input by escaping again (double-escaping is safe)", () => {
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });
});

describe("assertNonEmptyString", () => {
  it("returns trimmed value", () => {
    expect(assertNonEmptyString("  hello  ", "Name")).toBe("hello");
  });
  it("accepts a value at exactly maxLength", () => {
    expect(assertNonEmptyString("a".repeat(500), "Field", 500)).toHaveLength(500);
  });
  it("rejects empty string", () => {
    expect(() => assertNonEmptyString("", "Name")).toThrow("Name is required");
  });
  it("rejects whitespace-only string", () => {
    expect(() => assertNonEmptyString("   ", "Name")).toThrow("Name is required");
  });
  it("rejects null", () => {
    expect(() => assertNonEmptyString(null, "Name")).toThrow("Name is required");
  });
  it("rejects undefined", () => {
    expect(() => assertNonEmptyString(undefined, "Name")).toThrow("Name is required");
  });
  it("rejects numbers", () => {
    expect(() => assertNonEmptyString(42, "Name")).toThrow("Name is required");
  });
  it("rejects objects", () => {
    expect(() => assertNonEmptyString({}, "Name")).toThrow("Name is required");
  });
  it("rejects arrays", () => {
    expect(() => assertNonEmptyString(["x"], "Name")).toThrow("Name is required");
  });
  it("rejects over maxLength", () => {
    expect(() => assertNonEmptyString("a".repeat(501), "Name", 500)).toThrow(
      "Name must be at most 500 characters"
    );
  });
  it("includes field name and custom max in length error", () => {
    expect(() => assertNonEmptyString("toolongvalue", "Email", 5)).toThrow(
      "Email must be at most 5 characters"
    );
  });
});

describe("assertOptionalString", () => {
  it("returns null for null", () => {
    expect(assertOptionalString(null, "Field")).toBeNull();
  });
  it("returns null for undefined", () => {
    expect(assertOptionalString(undefined, "Field")).toBeNull();
  });
  it("returns null for empty string", () => {
    expect(assertOptionalString("", "Field")).toBeNull();
  });
  it("returns null for whitespace-only string", () => {
    expect(assertOptionalString("   ", "Field")).toBeNull();
  });
  it("returns trimmed value", () => {
    expect(assertOptionalString("  value  ", "Field")).toBe("value");
  });
  it("rejects non-string types", () => {
    expect(() => assertOptionalString(123, "Field")).toThrow("Field must be a string");
  });
  it("rejects over maxLength", () => {
    expect(() => assertOptionalString("a".repeat(11), "Field", 10)).toThrow(
      "Field must be at most 10 characters"
    );
  });
});

describe("assertOptionalDate", () => {
  it("returns null for null", () => {
    expect(assertOptionalDate(null, "Date")).toBeNull();
  });
  it("returns null for undefined", () => {
    expect(assertOptionalDate(undefined, "Date")).toBeNull();
  });
  it("returns null for empty string", () => {
    expect(assertOptionalDate("", "Date")).toBeNull();
  });
  it("accepts ISO dates", () => {
    expect(assertOptionalDate("2026-01-15", "Date")).toBe("2026-01-15");
  });
  it("accepts ISO datetimes", () => {
    expect(assertOptionalDate("2026-01-15T10:30:00Z", "Date")).toBe("2026-01-15T10:30:00Z");
  });
  it("rejects invalid date strings", () => {
    expect(() => assertOptionalDate("not-a-date", "Date")).toThrow(
      "Date must be a valid date"
    );
  });
  it("rejects non-string types", () => {
    expect(() => assertOptionalDate(20260115, "Date")).toThrow(
      "Date must be a valid date"
    );
  });
  it("accepts rollover dates as parseable (JS Date behaviour)", () => {
    // new Date('2026-02-30') rolls over to March — still a valid timestamp.
    expect(assertOptionalDate("2026-02-30", "Date")).toBe("2026-02-30");
  });
});
