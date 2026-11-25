import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const actions = vi.hoisted(() => ({
  sendPersonInvite: vi.fn(),
  sendOrganisationFlyer: vi.fn(),
  getMarketingHistory: vi.fn(),
  getMarketingTemplates: vi.fn(),
  previewMarketingTemplate: vi.fn(),
  previewFlyer: vi.fn(),
  previewDripSequence: vi.fn(),
  createSequence: vi.fn(),
  stopSequence: vi.fn(),
  getSequences: vi.fn(),
  getMarketingStats: vi.fn(),
  getLeads: vi.fn(),
  addLead: vi.fn(),
  importLeads: vi.fn(),
  startLeadDrip: vi.fn(),
  startLeadDrips: vi.fn(),
  deleteLead: vi.fn(),
}));

vi.mock("./actions", () => actions);

import MarketingPage from "./page";

const TEMPLATES = [
  { key: "invite_vision", name: "The Vision", audience: "person", description: "d1" },
  { key: "invite_circle", name: "Join a Circle", audience: "person", description: "d2" },
  { key: "invite_shepherd", name: "Lead a Circle", audience: "person", description: "d3" },
  { key: "org_partnership", name: "Organisation Partnership", audience: "org", description: "d4" },
];

const LEADS = [
  {
    id: "lead-1",
    kind: "org",
    name: "Coast Mosque",
    email: "info@mosque.example",
    contact_name: "Imam Ali",
    lead_type: "mosque",
    region: "Central Coast",
    suburb: "Gosford",
    source_url: null,
    faith: "islamic",
    status: "new",
    notes: null,
    last_contacted_at: null,
    created_at: "2026-01-01T00:00:00Z",
    sequence: null,
  },
  {
    id: "lead-2",
    kind: "org",
    name: "St Marys Parish",
    email: "office@stmarys.example",
    contact_name: null,
    lead_type: "church-catholic",
    region: "Sydney",
    suburb: "North Sydney",
    source_url: "https://example.test",
    faith: "christian",
    status: "drip",
    notes: null,
    last_contacted_at: "2026-01-02T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    sequence: { status: "active", current_step: 0, next_run_at: "2026-01-08T00:00:00Z" },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  actions.getMarketingTemplates.mockResolvedValue(TEMPLATES);
  actions.getMarketingHistory.mockResolvedValue([]);
  actions.getSequences.mockResolvedValue([]);
  actions.getMarketingStats.mockResolvedValue({
    perTheme: [
      { theme: "parchment", sends: 2, clicks: 1 },
      { theme: "midnight", sends: 1, clicks: 0 },
      { theme: "terracotta", sends: 0, clicks: 0 },
    ],
    perTemplate: [{ template: "invite_vision", sends: 2, clicks: 1 }],
  });
  actions.getLeads.mockResolvedValue(LEADS);
  actions.previewMarketingTemplate.mockResolvedValue({
    subject: "Test subject",
    html: "<p>preview</p>",
  });
  actions.previewFlyer.mockResolvedValue("<svg></svg>");
  actions.previewDripSequence.mockResolvedValue([
    { step: 1, theme: "parchment", delayDays: 0, when: "now", subject: "Day zero subject", html: "<p>one</p>" },
    { step: 2, theme: "midnight", delayDays: 7, when: "day 7", subject: "Day seven subject", html: "<p>two</p>" },
    { step: 3, theme: "terracotta", delayDays: 14, when: "day 14", subject: "Day fourteen subject", html: "<p>three</p>", flyerSvg: "<svg>flyer</svg>" },
  ]);
  actions.sendPersonInvite.mockResolvedValue({ success: true, template: "The Vision" });
  actions.sendOrganisationFlyer.mockResolvedValue({ success: true, org: "Church" });
  actions.createSequence.mockResolvedValue({ success: true });
  actions.stopSequence.mockResolvedValue(undefined);
  actions.addLead.mockResolvedValue({ success: true });
  actions.importLeads.mockResolvedValue({ imported: 2, skipped: 0, errors: [] });
  actions.startLeadDrip.mockResolvedValue({ success: true, sent: true });
  actions.startLeadDrips.mockResolvedValue({
    queued: 2,
    skippedActive: 0,
    skippedRecent: 0,
    skippedSuppressed: 0,
    failures: [],
    schedule: { perWindow: 20, firstSendAt: "2026-01-02T02:30:00.000Z", lastSendAt: "2026-01-02T05:30:00.000Z" },
  });
  actions.deleteLead.mockResolvedValue({ success: true });
  // window.confirm guards lead deletion
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("MarketingPage", () => {
  it("renders the full page and loads leads, sequences, and stats", async () => {
    render(<MarketingPage />);
    expect(screen.getByText("Marketing")).toBeInTheDocument();
    expect(screen.getByText(/every recipient runs the drip ladder/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(actions.getMarketingTemplates).toHaveBeenCalled();
      expect(actions.getLeads).toHaveBeenCalled();
      expect(actions.getSequences).toHaveBeenCalled();
      expect(actions.getMarketingStats).toHaveBeenCalled();
    });
  });

  it("loads and shows the theme performance scoreboard", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(screen.getByText("Theme performance")).toBeInTheDocument());
    expect(screen.getByText("50%")).toBeInTheDocument(); // 1/2 parchment clicks
    expect(screen.getByText("invite_vision")).toBeInTheDocument();
  });

  it("drip is the default person submit — one-off is opt-in", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getMarketingTemplates).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText("their@email.com"), {
      target: { value: "sam@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/their first name/i), {
      target: { value: "Sam" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start drip campaign/i }));

    await waitFor(() =>
      expect(actions.createSequence).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "person", recipientEmail: "sam@example.com", recipientName: "Sam" })
      )
    );
    expect(actions.sendPersonInvite).not.toHaveBeenCalled();
  });

  it("one-off person send still works behind the toggle, with theme choice", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getMarketingTemplates).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /^one-off send$/i }));
    fireEvent.change(screen.getByPlaceholderText("their@email.com"), {
      target: { value: "sam@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /midnight/i }));
    fireEvent.click(screen.getByRole("button", { name: /send invitation/i }));

    await waitFor(() =>
      expect(actions.sendPersonInvite).toHaveBeenCalledWith({
        recipientEmail: "sam@example.com",
        recipientName: "",
        templateKey: "invite_vision",
        theme: "midnight",
      })
    );
  });

  it("org tab defaults to a drip that carries the chosen faith", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getMarketingTemplates).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /organisations/i }));
    fireEvent.change(screen.getByPlaceholderText(/organisation \/ church name/i), {
      target: { value: "Coast Mosque" },
    });
    fireEvent.change(screen.getByPlaceholderText("Contact email"), {
      target: { value: "info@mosque.example" },
    });
    fireEvent.change(screen.getByLabelText(/community tradition/i), {
      target: { value: "islamic" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start drip campaign/i }));

    await waitFor(() =>
      expect(actions.createSequence).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "org",
          recipientEmail: "info@mosque.example",
          orgName: "Coast Mosque",
          faith: "islamic",
        })
      )
    );
  });

  it("org one-off send uses the selected theme and faith", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getMarketingTemplates).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /organisations/i }));
    fireEvent.click(screen.getByRole("button", { name: /^one-off send$/i }));
    fireEvent.change(screen.getByPlaceholderText(/organisation \/ church name/i), {
      target: { value: "Coast Mosque" },
    });
    fireEvent.change(screen.getByPlaceholderText("Contact email"), {
      target: { value: "info@mosque.example" },
    });
    fireEvent.click(screen.getByRole("button", { name: /midnight/i }));
    fireEvent.click(screen.getByRole("button", { name: /send flyer & partnership email/i }));

    await waitFor(() =>
      expect(actions.sendOrganisationFlyer).toHaveBeenCalledWith(
        expect.objectContaining({ orgName: "Coast Mosque", theme: "midnight", faith: "christian" })
      )
    );
  });

  it("shows the FULL org drip ladder from the org tab — all three steps", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getMarketingTemplates).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /organisations/i }));
    fireEvent.click(screen.getByRole("button", { name: /preview full drip/i }));

    await waitFor(() =>
      expect(actions.previewDripSequence).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "org", faith: "christian" })
      )
    );
    expect(await screen.findByText("Day zero subject")).toBeInTheDocument();
    expect(screen.getByText("Day seven subject")).toBeInTheDocument();
    expect(screen.getByText("Day fourteen subject")).toBeInTheDocument();
    expect(screen.getByText("Step 1 — now")).toBeInTheDocument();
    expect(screen.getByText("Step 3 — day 14")).toBeInTheDocument();
    // Flyer attachments stay hidden until the flyer preview is toggled on.
    expect(screen.queryByTitle(/flyer preview — step 3/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /preview flyer/i }));
    expect(await screen.findByTitle(/flyer preview — step 3/i)).toBeInTheDocument();
  });

  it("changing the faith tradition re-renders the org drip preview", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getMarketingTemplates).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /organisations/i }));
    fireEvent.click(screen.getByRole("button", { name: /preview full drip/i }));
    await waitFor(() => expect(actions.previewDripSequence).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/community tradition/i), {
      target: { value: "islamic" },
    });

    await waitFor(() =>
      expect(actions.previewDripSequence).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: "org", faith: "islamic" })
      )
    );
  });

  it("person drip previews the full ladder with a name substituted", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getMarketingTemplates).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/their first name/i), {
      target: { value: "Sam" },
    });
    fireEvent.click(screen.getByRole("button", { name: /preview full drip/i }));

    await waitFor(() =>
      expect(actions.previewDripSequence).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "person", recipientName: "Sam" })
      )
    );
    expect(await screen.findByText("Day zero subject")).toBeInTheDocument();
    expect(screen.getByText("Day fourteen subject")).toBeInTheDocument();
    // Person steps never carry a flyer.
    expect(screen.queryByTitle(/flyer preview/i)).not.toBeInTheDocument();
  });

  it("one-off org sends still preview a single themed email", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getMarketingTemplates).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /organisations/i }));
    fireEvent.click(screen.getByRole("button", { name: /^one-off send$/i }));
    fireEvent.click(screen.getByRole("button", { name: /preview email/i }));

    await waitFor(() =>
      expect(actions.previewMarketingTemplate).toHaveBeenCalledWith(
        "org_partnership",
        undefined,
        undefined,
        "parchment",
        "christian"
      )
    );
    expect(await screen.findByText("Test subject")).toBeInTheDocument();
  });

  it("opening a lead loads it — with its faith — into the org form", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getLeads).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /^leads \(2\)$/i }));

    const openButtons = await screen.findAllByRole("button", { name: /^open$/i });
    fireEvent.click(openButtons[0]); // Coast Mosque (islamic)

    // Switched to the org tab with the lead's details loaded.
    expect(screen.getByPlaceholderText(/organisation \/ church name/i)).toHaveValue("Coast Mosque");
    expect(screen.getByPlaceholderText("Contact email")).toHaveValue("info@mosque.example");
    expect(screen.getByLabelText(/community tradition/i)).toHaveValue("islamic");
    expect(screen.getByText(/loaded coast mosque into the organisations form/i)).toBeInTheDocument();
  });

  it("leads tab lists leads with live drip status and per-row start", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getLeads).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /^leads \(2\)$/i }));

    expect(await screen.findByText("Coast Mosque")).toBeInTheDocument();
    expect(screen.getByText("St Marys Parish")).toBeInTheDocument();
    // lead-2 has an active sequence — shows step progress, no start button.
    expect(screen.getByText(/drip · step 1\/3/i)).toBeInTheDocument();
    // lead-1 is fresh — its start button is available.
    const starts = screen.getAllByRole("button", { name: /^start drip$/i });
    expect(starts).toHaveLength(1);

    fireEvent.click(starts[0]);
    await waitFor(() => expect(actions.startLeadDrip).toHaveBeenCalledWith("lead-1"));
  });

  it("bulk queue schedules the drip for all selected leads", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getLeads).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /^leads \(2\)$/i }));

    const checkboxes = await screen.findAllByRole("checkbox");
    // First checkbox is select-all.
    fireEvent.click(checkboxes[0]);
    fireEvent.click(screen.getByRole("button", { name: /queue drip for 2 selected/i }));

    await waitFor(() =>
      expect(actions.startLeadDrips).toHaveBeenCalledWith(
        expect.arrayContaining(["lead-1", "lead-2"])
      )
    );
    // The notice carries the pacing schedule, not "emails sent".
    expect(await screen.findByText(/2 queued — 20 emails per send window/i)).toBeInTheDocument();
    expect(screen.getByText(/first sends/i)).toBeInTheDocument();
  });

  it("adds a lead through the form", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getLeads).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /^leads \(2\)$/i }));

    fireEvent.click(screen.getByRole("button", { name: /add lead/i }));
    fireEvent.change(screen.getByPlaceholderText(/organisation name/i), {
      target: { value: "Lakemba Mosque" },
    });
    fireEvent.change(screen.getByPlaceholderText(/^email$/i), {
      target: { value: "info@lakemba.example" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save lead/i }));

    await waitFor(() =>
      expect(actions.addLead).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "org", name: "Lakemba Mosque", email: "info@lakemba.example" })
      )
    );
  });

  it("filters leads by region", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getLeads).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /^leads \(2\)$/i }));

    fireEvent.change(await screen.findByLabelText(/filter by region/i), {
      target: { value: "Sydney" },
    });
    expect(screen.queryByText("Coast Mosque")).not.toBeInTheDocument();
    expect(screen.getByText("St Marys Parish")).toBeInTheDocument();
  });

  it("deleting a lead confirms first and calls the action", async () => {
    render(<MarketingPage />);
    await waitFor(() => expect(actions.getLeads).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /^leads \(2\)$/i }));

    fireEvent.click(await screen.findByLabelText(/delete coast mosque/i));
    await waitFor(() => expect(actions.deleteLead).toHaveBeenCalledWith("lead-1"));
  });

  it("surfaces action errors instead of crashing", async () => {
    actions.getMarketingTemplates.mockRejectedValueOnce(new Error("boom"));
    render(<MarketingPage />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});
