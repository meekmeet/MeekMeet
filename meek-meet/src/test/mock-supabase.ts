// Chainable Supabase client mock for unit tests.
//
// Usage:
//   vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
//   const supa = new MockSupabaseClient();
//   vi.mocked(createClient).mockResolvedValue(supa as never);
//   supa.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
//   supa.enqueue({ role: "admin" });           // next awaited query result
//   supa.enqueue(null, { message: "boom" });   // next query fails
//
// Every `.from(...)` chain resolves queued results in order; un-awaited chains
// are thenable so `await supabase.from(t).update(...).eq(...)` works, and
// terminal `.single()/.maybeSingle()` resolve the same queue.

import { vi } from "vitest";

export interface MockQueryResult {
  data: unknown;
  error: unknown;
}

export interface StorageMock {
  upload: ReturnType<typeof vi.fn>;
  createSignedUrl: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
}

class QueryChain {
  constructor(private readonly owner: MockSupabaseClient) {}

  select(): this {
    return this;
  }
  insert(rows?: unknown): this {
    if (rows !== undefined) this.owner.inserts.push(rows);
    return this;
  }
  update(values?: unknown): this {
    if (values !== undefined) this.owner.updates.push(values);
    return this;
  }
  upsert(rows?: unknown): this {
    if (rows !== undefined) this.owner.upserts.push(rows);
    return this;
  }
  delete(): this {
    return this;
  }
  eq(): this {
    return this;
  }
  neq(): this {
    return this;
  }
  gt(): this {
    return this;
  }
  gte(): this {
    return this;
  }
  lt(): this {
    return this;
  }
  lte(): this {
    return this;
  }
  in(): this {
    return this;
  }
  not(): this {
    return this;
  }
  is(): this {
    return this;
  }
  or(): this {
    return this;
  }
  match(): this {
    return this;
  }
  filter(): this {
    return this;
  }
  contains(): this {
    return this;
  }
  order(): this {
    return this;
  }
  limit(): this {
    return this;
  }
  range(): this {
    return this;
  }
  single(): Promise<MockQueryResult> {
    return this.owner.nextResult();
  }
  maybeSingle(): Promise<MockQueryResult> {
    return this.owner.nextResult();
  }
  then<TResult1 = MockQueryResult, TResult2 = never>(
    onfulfilled?: ((value: MockQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.owner.nextResult().then(onfulfilled, onrejected);
  }
}

export class MockSupabaseClient {
  /** Query results consumed in FIFO order by awaited chains / terminal calls. */
  readonly results: MockQueryResult[] = [];
  /** Tables touched, in call order — handy for asserting query sequences. */
  readonly tables: string[] = [];
  /** Payloads passed to update() and upsert(), in call order. */
  readonly updates: unknown[] = [];
  readonly upserts: unknown[] = [];
  /** Payloads passed to insert(), in call order. */
  readonly inserts: unknown[] = [];

  readonly auth = {
    getUser: vi.fn(),
    signOut: vi.fn(),
  };

  readonly rpc = vi.fn();

  readonly storage = {
    from: vi.fn(),
  };

  readonly from = vi.fn((table: string) => {
    this.tables.push(table);
    return new QueryChain(this);
  });

  constructor() {
    this.rpc.mockResolvedValue({ data: null, error: null });
    this.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  }

  /** Queue the result for the next awaited query chain. */
  enqueue(data: unknown, error: unknown = null): this {
    this.results.push({ data, error });
    return this;
  }

  nextResult(): Promise<MockQueryResult> {
    return Promise.resolve(this.results.shift() ?? { data: null, error: null });
  }

  /** Configure the storage bucket mock with the given handler map. */
  mockStorage(handlers: Partial<StorageMock>): StorageMock {
    const bucket: StorageMock = {
      upload: handlers.upload ?? vi.fn().mockResolvedValue({ data: {}, error: null }),
      createSignedUrl:
        handlers.createSignedUrl ??
        vi.fn().mockResolvedValue({ data: { signedUrl: "https://example.test/signed" }, error: null }),
      remove: handlers.remove ?? vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    this.storage.from.mockReturnValue(bucket);
    return bucket;
  }

  /** Simulate a signed-in user (or null to simulate signed out). */
  asUser(user: { id: string; email?: string } | null): this {
    this.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    return this;
  }
}

export function makeAuthUser(overrides: Partial<{ id: string; email: string }> = {}) {
  return { id: overrides.id ?? "11111111-1111-1111-1111-111111111111", email: overrides.email ?? "user@example.com" };
}
