import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CirclesPage from "./page";
import { getActiveCircles } from "@/lib/public-data";

vi.mock("@/lib/public-data", () => ({
  getActiveCircles: vi.fn(),
}));

vi.mock("../_components/circle-card", () => ({
  default: ({ circle }: { circle: { name: string } }) => (
    <div data-testid="circle-card">{circle.name}</div>
  ),
}));

vi.mock("./_components/search-form", () => ({
  default: () => <div data-testid="search-form" />,
}));

const mockedGetActiveCircles = vi.mocked(getActiveCircles);

const globalCircle = {
  id: "circle-global",
  name: "Global New Moon Circle",
  slug: "global-new-moon",
  description: "Online, open to all faiths.",
  location: "Online",
  kind: "global",
};

const localCircle = {
  id: "circle-local",
  name: "Gosford Circle",
  slug: "gosford",
  description: "A local gathering.",
  location: "Gosford",
  kind: "local",
};

function renderPage(searchParams: { q?: string; location?: string } = {}) {
  return CirclesPage({ searchParams: Promise.resolve(searchParams) });
}

describe("CirclesPage empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show 'No circles found' when only the global circle exists", async () => {
    mockedGetActiveCircles.mockResolvedValue([globalCircle] as never);
    render(await renderPage());
    expect(screen.queryByText("No circles found")).toBeNull();
    expect(screen.getByText(/More circles are forming/)).toBeTruthy();
    expect(screen.getByText("Global New Moon Circle")).toBeTruthy();
  });

  it("shows 'No circles found' when an active search matches nothing", async () => {
    mockedGetActiveCircles.mockResolvedValue([globalCircle, localCircle] as never);
    render(await renderPage({ q: "nowhere" }));
    expect(screen.getByText("No circles found")).toBeTruthy();
    expect(screen.queryByText("Global New Moon Circle")).toBeNull();
  });

  it("renders local circle cards without any empty state", async () => {
    mockedGetActiveCircles.mockResolvedValue([globalCircle, localCircle] as never);
    render(await renderPage());
    expect(screen.getByTestId("circle-card").textContent).toBe("Gosford Circle");
    expect(screen.queryByText("No circles found")).toBeNull();
    expect(screen.queryByText(/More circles are forming/)).toBeNull();
  });

  it("shows 'No circles found' when there are no circles at all", async () => {
    mockedGetActiveCircles.mockResolvedValue([] as never);
    render(await renderPage());
    expect(screen.getByText("No circles found")).toBeTruthy();
  });
});
