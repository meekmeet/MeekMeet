import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { POST } from "./route";

const mockSupa = new MockSupabaseClient();
const user = makeAuthUser();
const applicationId = "55555555-5555-5555-5555-555555555555";

let ipSeq = 0;

// Build a multipart/form-data body manually. jsdom's File/FormData mangle
// binary payloads, so we craft raw multipart and let undici parse it — this
// also preserves filenames through the Request round trip.
function multipartRequest(
  fields: {
    file?: { name: string; type: string; content: Uint8Array };
    applicationId?: string;
    documentType?: string;
  },
  ip?: string
): NextRequest {
  const boundary = "----meekmeettestboundary";
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  let head = "";

  if (fields.applicationId !== undefined) {
    head += `--${boundary}\r\nContent-Disposition: form-data; name="applicationId"\r\n\r\n${fields.applicationId}\r\n`;
  }
  if (fields.documentType !== undefined) {
    head += `--${boundary}\r\nContent-Disposition: form-data; name="documentType"\r\n\r\n${fields.documentType}\r\n`;
  }
  if (fields.file) {
    head += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fields.file.name}"\r\nContent-Type: ${fields.file.type}\r\n\r\n`;
    parts.push(enc.encode(head), fields.file.content, enc.encode("\r\n"));
    head = "";
  }
  parts.push(enc.encode(`${head}--${boundary}--\r\n`));

  const total = parts.reduce((n, p) => n + p.length, 0);
  const body = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.length;
  }

  return new NextRequest("http://localhost/api/upload-document", {
    method: "POST",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "x-forwarded-for": ip ?? `10.0.${++ipSeq}.1`,
    },
    body,
  });
}

function pdfFile(name = "doc.pdf", sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: "application/pdf" });
}

// Convenience wrapper: same call sites as before.
function uploadRequest(fields: Record<string, unknown>, ip?: string): NextRequest {
  return multipartRequest(
    {
      file: fields.file
        ? {
            name: (fields.file as File).name,
            type: (fields.file as File).type,
            content: new Uint8Array((fields.file as File).size),
          }
        : undefined,
      applicationId: fields.applicationId as string | undefined,
      documentType: fields.documentType as string | undefined,
    },
    ip
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("POST /api/upload-document", () => {
  it("returns 429 when rate limited", async () => {
    process.env.RATE_LIMIT_UPLOAD_PER_MINUTE = "1";
    mockSupa.asUser(user);
    // First request consumes the allowance.
    await POST(uploadRequest({ file: pdfFile(), applicationId, documentType: "wwcc" }, "9.9.9.9"));
    const res = await POST(
      uploadRequest({ file: pdfFile(), applicationId, documentType: "wwcc" }, "9.9.9.9")
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    delete process.env.RATE_LIMIT_UPLOAD_PER_MINUTE;
  });

  it("returns 401 when not authenticated", async () => {
    mockSupa.asUser(null);
    const res = await POST(uploadRequest({ file: pdfFile(), applicationId, documentType: "wwcc" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Not authenticated");
  });

  it.each([
    ["missing file", { applicationId, documentType: "wwcc" }],
    ["missing applicationId", { file: pdfFile(), documentType: "wwcc" }],
    ["missing documentType", { file: pdfFile(), applicationId }],
  ])("returns 400 for %s", async (_name, fields) => {
    mockSupa.asUser(user);
    const res = await POST(uploadRequest(fields));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it.each([
    ["text/html", "evil.html"],
    ["application/x-msdownload", "evil.exe"],
    ["image/gif", "anim.gif"],
    ["application/zip", "docs.zip"],
    ["", "noext"],
  ])("rejects disallowed mime type %s", async (mime, filename) => {
    mockSupa.asUser(user);
    const file = new File(["x"], filename, { type: mime });
    const res = await POST(uploadRequest({ file, applicationId, documentType: "wwcc" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/file type/i);
  });

  it.each([
    ["image/jpeg", "photo.jpg"],
    ["image/png", "photo.png"],
    ["image/webp", "photo.webp"],
  ])("accepts allowed mime type %s", async (mime, filename) => {
    mockSupa.asUser(user);
    mockSupa.enqueue({ id: applicationId, user_id: user.id, status: "pending" }).enqueue(null);
    mockSupa.mockStorage({});
    const file = new File([new Uint8Array(1024)], filename, { type: mime });
    const res = await POST(uploadRequest({ file, applicationId, documentType: "wwcc" }));
    expect(res.status).toBe(200);
  });

  it("rejects files over 10 MB", async () => {
    mockSupa.asUser(user);
    const big = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "big.pdf",
      { type: "application/pdf" }
    );
    const res = await POST(uploadRequest({ file: big, applicationId, documentType: "wwcc" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too large/i);
  });

  it("accepts a file at exactly 10 MB", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue({ id: applicationId, user_id: user.id, status: "pending" }).enqueue(null);
    mockSupa.mockStorage({});
    const file = new File([new Uint8Array(10 * 1024 * 1024)], "ok.pdf", {
      type: "application/pdf",
    });
    const res = await POST(uploadRequest({ file, applicationId, documentType: "wwcc" }));
    expect(res.status).toBe(200);
  });

  it.each(["wwcc", "police_check", "first_aid", "photo_id"])(
    "accepts the valid document type %s",
    async (docType) => {
      mockSupa.asUser(user);
      mockSupa.enqueue({ id: applicationId, user_id: user.id, status: "pending" }).enqueue(null);
      mockSupa.mockStorage({});
      const res = await POST(uploadRequest({ file: pdfFile(), applicationId, documentType: docType }));
      expect(res.status).toBe(200);
    }
  );

  it.each(["passport", "WWCC", "Police_Check", "wwcc;drop table"])(
    "rejects invalid document type %s",
    async (docType) => {
      mockSupa.asUser(user);
      const res = await POST(uploadRequest({ file: pdfFile(), applicationId, documentType: docType }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Invalid document type");
    }
  );

  it("treats an empty documentType as missing", async () => {
    mockSupa.asUser(user);
    const res = await POST(uploadRequest({ file: pdfFile(), applicationId, documentType: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it("returns 404 when the application does not exist", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null, { message: "not found" });
    const res = await POST(uploadRequest({ file: pdfFile(), applicationId, documentType: "wwcc" }));
    expect(res.status).toBe(404);
  });

  it("returns 403 when uploading to someone else's application", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue({ id: applicationId, user_id: "other-user-id", status: "pending" });
    const res = await POST(uploadRequest({ file: pdfFile(), applicationId, documentType: "wwcc" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/your own application/i);
  });

  it("returns 400 when the application is no longer pending", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue({ id: applicationId, user_id: user.id, status: "approved" });
    const res = await POST(uploadRequest({ file: pdfFile(), applicationId, documentType: "wwcc" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/pending applications/i);
  });

  it("uploads the file and records the document on success", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue({ id: applicationId, user_id: user.id, status: "pending" }).enqueue(null);
    const storage = mockSupa.mockStorage({});
    const res = await POST(
      uploadRequest({ file: pdfFile("My Document.PDF"), applicationId, documentType: "wwcc" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.documentType).toBe("wwcc");
    expect(body.path).toMatch(
      new RegExp(`^${user.id}/${applicationId}/wwcc-\\d+\\.[a-z0-9]+$`)
    );
    expect(storage.upload).toHaveBeenCalledTimes(1);
    expect(mockSupa.tables).toEqual(["shepherd_applications", "shepherd_application_documents"]);
  });

  it("sanitizes exotic filenames into the generated storage name", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue({ id: applicationId, user_id: user.id, status: "pending" }).enqueue(null);
    const storage = mockSupa.mockStorage({});
    await POST(
      uploadRequest({
        file: new File(["x"], "../../etc/passwd.pdf", { type: "application/pdf" }),
        applicationId,
        documentType: "photo_id",
      })
    );
    const uploadedPath = storage.upload.mock.calls[0][0] as string;
    // The generated storage name must be a single safe segment regardless of
    // what filename the client sent (no traversal, no separators).
    const filename = uploadedPath.split("/").pop()!;
    expect(filename).toMatch(/^photo_id-\d+\.[a-z0-9]+$/);
  });

  it("returns 500 when the storage upload fails", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue({ id: applicationId, user_id: user.id, status: "pending" });
    mockSupa.mockStorage({ upload: vi.fn().mockResolvedValue({ data: null, error: { message: "full" } }) });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(uploadRequest({ file: pdfFile(), applicationId, documentType: "wwcc" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/upload/i);
    errorSpy.mockRestore();
  });

  it("cleans up storage when the document record insert fails", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue({ id: applicationId, user_id: user.id, status: "pending" })
      .enqueue(null, { message: "constraint violation" });
    const storage = mockSupa.mockStorage({});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(uploadRequest({ file: pdfFile(), applicationId, documentType: "wwcc" }));
    expect(res.status).toBe(500);
    expect(storage.remove).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns 500 when form parsing throws", async () => {
    mockSupa.asUser(user);
    const broken = new NextRequest("http://localhost/api/upload-document", {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.250.1" },
    });
    vi.spyOn(broken, "formData").mockRejectedValue(new Error("bad form"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(broken);
    expect(res.status).toBe(500);
    errorSpy.mockRestore();
  });
});
