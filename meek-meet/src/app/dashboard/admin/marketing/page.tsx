"use client";

import { useState, useTransition, useEffect, useCallback, useMemo } from "react";
import {
  sendPersonInvite,
  sendOrganisationFlyer,
  getMarketingHistory,
  getMarketingTemplates,
  previewMarketingTemplate,
  previewFlyer,
  previewDripSequence,
  type DripPreviewStep,
  createSequence,
  stopSequence,
  getSequences,
  getMarketingStats,
  getLeads,
  addLead,
  importLeads,
  startLeadDrip,
  startLeadDrips,
  deleteLead,
  type MarketingSendEntry,
  type SequenceEntry,
  type LeadEntry,
} from "./actions";
import {
  EMAIL_THEMES,
  EMAIL_THEME_ORDER,
  themeForAttempt,
  type EmailThemeKey,
} from "@/lib/emails/shell";
import { WINDOW_LABEL } from "@/lib/marketing/pace";
import {
  Building2,
  CalendarClock,
  ClipboardList,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Play,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
  User,
  UserPlus,
} from "lucide-react";

interface TemplateMeta {
  key: string;
  name: string;
  audience: "person" | "org";
  description: string;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ThemePicker({
  value,
  onChange,
  priorCount,
}: {
  value: EmailThemeKey;
  onChange: (t: EmailThemeKey) => void;
  priorCount: number;
}) {
  const suggested = themeForAttempt(priorCount + 1);
  return (
    <div>
      <label className="text-sm text-charcoal-light font-medium block mb-3">
        Theme
      </label>
      <div className="flex flex-wrap gap-2">
        {EMAIL_THEME_ORDER.map((key) => {
          const t = EMAIL_THEMES[key];
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`px-4 py-2 rounded-full text-xs font-medium border transition-all flex items-center gap-2 ${
                active
                  ? "border-midnight bg-midnight text-cream"
                  : "border-border-soft bg-cream-warm text-charcoal hover:border-wheat"
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                style={{ background: `linear-gradient(135deg, ${t.pageBg} 50%, ${t.buttonBg} 50%)` }}
              />
              {t.name}
              <span className={active ? "text-cream/60" : "text-charcoal-muted"}>
                {t.stage}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-charcoal-muted mt-2">{EMAIL_THEMES[value].description}</p>
      {priorCount > 0 && value !== suggested.key && (
        <p className="text-xs text-terracotta mt-2">
          They&apos;ve been sent {priorCount} email{priorCount > 1 ? "s" : ""} with no
          answer — the <strong>{suggested.name}</strong> theme is the recommended next step.
        </p>
      )}
      {priorCount > 0 && value === suggested.key && (
        <p className="text-xs text-sage-dark mt-2">
          Good choice — this is the recommended stage {suggested.stage} for this recipient.
        </p>
      )}
    </div>
  );
}

// --- Lead status display: sequence truth beats the synced column -----------

function leadStatus(lead: LeadEntry): { label: string; tone: "new" | "active" | "good" | "bad" | "done" } {
  const seq = lead.sequence;
  if (seq?.status === "active") return { label: `drip · step ${Math.min(seq.current_step + 1, 3)}/3`, tone: "active" };
  if (seq?.status === "stopped_replied") return { label: "replied", tone: "good" };
  if (seq?.status === "stopped_engaged") return { label: "clicked through", tone: "good" };
  if (seq?.status === "completed") return { label: "ladder complete", tone: "done" };
  if (seq?.status === "stopped_manual") return { label: "stopped", tone: "done" };
  if (lead.status === "bounced") return { label: "bounced", tone: "bad" };
  if (lead.status === "replied") return { label: "replied", tone: "good" };
  if (lead.status === "engaged") return { label: "clicked through", tone: "good" };
  return { label: "new", tone: "new" };
}

const STATUS_TONE_CLASS: Record<string, string> = {
  new: "bg-cream-warm text-charcoal-muted border border-border-soft",
  active: "bg-sky-soft/40 text-midnight",
  good: "bg-sage/20 text-sage-dark",
  bad: "bg-terracotta-pale text-terracotta",
  done: "bg-wheat-pale text-wheat-dark",
};

const REGIONS = ["Central Coast", "Lake Macquarie", "Sydney", "Other"] as const;

const LEAD_TYPE_LABELS: Record<string, string> = {
  "church-catholic": "Catholic parish",
  "church-anglican": "Anglican church",
  "church-baptist": "Baptist church",
  "church-uniting": "Uniting church",
  "church-pentecostal": "Pentecostal church",
  "church-salvos": "Salvation Army",
  "church-salvation-army": "Salvation Army",
  "church-greek-orthodox": "Greek Orthodox church",
  "church-alliance": "Alliance church",
  "church-presbyterian": "Presbyterian church",
  "church-independent": "Independent church",
  "church-christian": "Christian church",
  "church-other": "Church (other)",
  mosque: "Mosque",
  "islamic-centre": "Islamic centre / society",
  synagogue: "Synagogue",
  "jewish-org": "Jewish community org",
  "temple-buddhist": "Buddhist temple / centre",
  "temple-hindu": "Hindu temple",
  gurdwara: "Sikh gurdwara",
  interfaith: "Interfaith organisation",
  "other-faith": "Faith community (other)",
  charity: "Charity",
  "community-centre": "Community centre",
  council: "Council",
  library: "Library",
  "mens-shed": "Men's shed",
  "service-club": "Service club",
  welfare: "Welfare service",
  youth: "Youth service",
  garden: "Community garden",
  other: "Organisation",
};

const FAITH_LABELS: Record<string, string> = {
  christian: "Christian",
  islamic: "Islamic",
  jewish: "Jewish",
  buddhist: "Buddhist",
  hindu: "Hindu",
  sikh: "Sikh",
  interfaith: "Interfaith",
  secular: "Secular / civic",
  other: "Other",
};

function leadTypeLabel(type: string | null): string {
  if (!type) return "Organisation";
  return LEAD_TYPE_LABELS[type] ?? type;
}

export default function MarketingPage() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [history, setHistory] = useState<MarketingSendEntry[]>([]);
  const [tab, setTab] = useState<"person" | "org" | "leads">("person");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [sequences, setSequences] = useState<SequenceEntry[]>([]);
  const [stats, setStats] = useState<{
    perTheme: { theme: string; sends: number; clicks: number }[];
    perTemplate: { template: string; sends: number; clicks: number }[];
  } | null>(null);
  const [templateKey, setTemplateKey] = useState("invite_vision");
  const [theme, setTheme] = useState<EmailThemeKey>("parchment");
  const [orgTheme, setOrgTheme] = useState<EmailThemeKey>("parchment");
  const [orgFaith, setOrgFaith] = useState("christian");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgContact, setOrgContact] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showFlyer, setShowFlyer] = useState(false);
  // Full-ladder previews: every drip step, in the theme it actually arrives in.
  const [dripPreview, setDripPreview] = useState<DripPreviewStep[] | null>(null);
  // Separate state for the org tab — sharing it with the person tab meant a
  // member-invite preview could render inside the org tab (and vice versa).
  const [orgPreview, setOrgPreview] = useState<{ subject: string; html: string } | null>(null);
  const [showOrgPreview, setShowOrgPreview] = useState(false);
  // One-off sends still exist (e.g. a deliberate re-send in a chosen theme)
  // but the drip ladder is the default path for every recipient.
  const [personOneOff, setPersonOneOff] = useState(false);
  const [orgOneOff, setOrgOneOff] = useState(false);

  // --- Leads state ---
  const [leads, setLeads] = useState<LeadEntry[]>([]);
  const [leadRegion, setLeadRegion] = useState<string>("all");
  const [leadKindFilter, setLeadKindFilter] = useState<string>("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("all");
  const [leadSearch, setLeadSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddLead, setShowAddLead] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newLead, setNewLead] = useState({
    kind: "org" as "org" | "individual",
    name: "",
    email: "",
    contactName: "",
    leadType: "church-other",
    faith: "",
    region: "Central Coast",
    suburb: "",
    sourceUrl: "",
  });
  const [importText, setImportText] = useState("");

  const load = useCallback(async () => {
    try {
      const [t, h, seq, st, ld] = await Promise.all([
        getMarketingTemplates(),
        getMarketingHistory(),
        getSequences(),
        getMarketingStats(),
        getLeads(),
      ]);
      setTemplates(t);
      setHistory(h);
      setSequences(seq);
      setStats(st);
      setLeads(ld);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load marketing");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live preview: the full drip ladder by default, a single themed email for
  // one-off sends. Refreshes as the recipient or template changes.
  useEffect(() => {
    if (!showPreview) return;
    let cancelled = false;
    if (personOneOff) {
      previewMarketingTemplate(templateKey, name || undefined, undefined, theme)
        .then((p) => { if (!cancelled) setPreview(p); })
        .catch(() => { if (!cancelled) setPreview(null); });
    } else {
      previewDripSequence({ kind: "person", templateKey, recipientName: name || undefined })
        .then((steps) => { if (!cancelled) setDripPreview(steps); })
        .catch(() => { if (!cancelled) setDripPreview(null); });
    }
    return () => { cancelled = true; };
  }, [templateKey, name, theme, showPreview, personOneOff]);

  // Same for the org letter: full proposal ladder (flyer per step) or the
  // single one-off draft.
  useEffect(() => {
    if (!showOrgPreview) return;
    let cancelled = false;
    if (orgOneOff) {
      previewMarketingTemplate("org_partnership", orgContact || undefined, orgName || undefined, orgTheme, orgFaith)
        .then((p) => { if (!cancelled) setOrgPreview(p); })
        .catch(() => { if (!cancelled) setOrgPreview(null); });
    } else {
      previewDripSequence({
        kind: "org",
        recipientName: orgContact || undefined,
        orgName: orgName || undefined,
        faith: orgFaith,
      })
        .then((steps) => { if (!cancelled) setDripPreview(steps); })
        .catch(() => { if (!cancelled) setDripPreview(null); });
    }
    return () => { cancelled = true; };
  }, [orgName, orgContact, orgTheme, orgFaith, orgOneOff, showOrgPreview]);

  const personTemplates = templates.filter((t) => t.audience === "person");

  const priorPersonSends = email.trim()
    ? history.filter(
        (h) =>
          h.kind === "person_invite" &&
          h.status === "sent" &&
          h.recipient_email.toLowerCase() === email.trim().toLowerCase()
      ).length
    : 0;
  const priorOrgSends = orgEmail.trim()
    ? history.filter(
        (h) =>
          h.kind === "org_flyer" &&
          h.status === "sent" &&
          h.recipient_email.toLowerCase() === orgEmail.trim().toLowerCase()
      ).length
    : 0;

  const handlePersonDrip = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await createSequence({ kind: "person", recipientEmail: email, recipientName: name || undefined });
        setNotice(`Drip started for ${email} — parchment sent now, midnight in 7 days, terracotta in 14. It stops the moment they reply or click.`);
        setEmail("");
        setName("");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start drip");
      }
    });
  };

  const handlePersonOneOff = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await sendPersonInvite({ recipientEmail: email, recipientName: name, templateKey, theme });
        setNotice(`One-off invitation "${result.template}" sent to ${email}.`);
        setEmail("");
        setName("");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
      }
    });
  };

  const handleOrgDrip = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await createSequence({
          kind: "org",
          recipientEmail: orgEmail,
          orgName,
          contactName: orgContact || undefined,
          faith: orgFaith,
        });
        setNotice(`Drip started for ${orgName} — the proposal + flyer goes out now, with midnight and terracotta follow-ups on days 7 and 14.`);
        setOrgName("");
        setOrgContact("");
        setOrgEmail("");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start drip");
      }
    });
  };

  const handleOrgSend = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await sendOrganisationFlyer({
          orgName,
          contactEmail: orgEmail,
          contactName: orgContact,
          theme: orgTheme,
          faith: orgFaith,
        });
        setNotice(`Partnership email + printable flyer sent to ${result.org}.`);
        setOrgName("");
        setOrgContact("");
        setOrgEmail("");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
      }
    });
  };

  const handleStopSequence = (seq: SequenceEntry) => {
    setError(null);
    startTransition(async () => {
      try {
        await stopSequence(seq.id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to stop sequence");
      }
    });
  };

  // --- Leads handlers ---

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    return leads.filter((lead) => {
      if (leadRegion !== "all" && lead.region !== leadRegion) return false;
      if (leadKindFilter !== "all" && lead.kind !== leadKindFilter) return false;
      if (leadStatusFilter !== "all") {
        if (leadStatusFilter === "drip" && lead.sequence?.status !== "active") return false;
        if (leadStatusFilter !== "drip" && lead.status !== leadStatusFilter) return false;
      }
      if (
        q &&
        !`${lead.name} ${lead.email} ${lead.suburb ?? ""} ${lead.contact_name ?? ""}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [leads, leadRegion, leadKindFilter, leadStatusFilter, leadSearch]);

  const leadCounts = useMemo(() => {
    const active = leads.filter((l) => l.sequence?.status === "active").length;
    const responded = leads.filter(
      (l) => l.sequence?.status === "stopped_replied" || l.sequence?.status === "stopped_engaged" || l.status === "replied" || l.status === "engaged"
    ).length;
    return { total: leads.length, fresh: leads.length - active - responded, active, responded };
  }, [leads]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) =>
      prev.size === filteredLeads.length ? new Set() : new Set(filteredLeads.map((l) => l.id))
    );
  };

  const handleStartLeadDrip = (lead: LeadEntry) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await startLeadDrip(lead.id);
        setNotice(
          result.queuedAt
            ? `Drip queued for ${lead.name} — today's send budget is spent, so the day-0 letter goes out at the next window (${formatDate(result.queuedAt)}).`
            : result.sent
              ? `Drip started for ${lead.name} — parchment sent now.`
              : `Drip started for ${lead.name}, but the day-0 send failed — check the outreach log.`
        );
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start drip");
      }
    });
  };

  const handleBulkDrip = () => {
    setError(null);
    setNotice(null);
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        const result = await startLeadDrips(ids);
        const first = result.schedule.firstSendAt ? formatDate(result.schedule.firstSendAt) : null;
        const last = result.schedule.lastSendAt ? formatDate(result.schedule.lastSendAt) : null;
        setNotice(
          `${result.queued} queued — ${result.schedule.perWindow} emails per send window ` +
            `(${WINDOW_LABEL}). ` +
            (first && last ? `First sends ${first}; the batch finishes by ${last}. ` : "") +
            (result.skippedActive > 0 ? `${result.skippedActive} already in a drip (skipped). ` : "") +
            (result.skippedRecent > 0
              ? `${result.skippedRecent} dripped within the last 14 days (skipped — one drip at a time). `
              : "") +
            (result.skippedSuppressed > 0
              ? `${result.skippedSuppressed} suppressed — bounced, replied or engaged, and never re-emailed. `
              : "") +
            (result.failures.length > 0 ? `${result.failures.length} failed. ` : "") +
            `Day-7/day-14 follow-ups run automatically; a reply, click or bounce stops each ladder.`
        );
        setSelected(new Set());
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to queue bulk drip");
      }
    });
  };

  const handleDeleteLead = (lead: LeadEntry) => {
    if (!window.confirm(`Remove ${lead.name} from leads? Send history is kept.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteLead(lead.id);
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(lead.id);
          return next;
        });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete lead");
      }
    });
  };

  // Leads and the send forms are one flow: loading a lead fills the matching
  // form with its name, email, contact and faith, and switches to that tab.
  const handleLoadLead = (lead: LeadEntry) => {
    setError(null);
    setNotice(null);
    if (lead.kind === "org") {
      setOrgName(lead.name);
      setOrgEmail(lead.email);
      setOrgContact(lead.contact_name ?? "");
      if (lead.faith) setOrgFaith(lead.faith);
      setTab("org");
      setNotice(`Loaded ${lead.name} into the organisations form — review the letter and flyer, then start the drip.`);
    } else {
      setEmail(lead.email);
      setName(lead.contact_name ?? lead.name);
      setTab("person");
      setNotice(`Loaded ${lead.name} into the invite form — review, then start the drip.`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await addLead({
          kind: newLead.kind,
          name: newLead.name,
          email: newLead.email,
          contactName: newLead.contactName || undefined,
          leadType: newLead.kind === "org" ? newLead.leadType : undefined,
          faith: newLead.faith || undefined,
          region: newLead.region || undefined,
          suburb: newLead.suburb || undefined,
          sourceUrl: newLead.sourceUrl || undefined,
        });
        setNotice(`Lead added: ${newLead.name}.`);
        setNewLead({ ...newLead, name: "", email: "", contactName: "", suburb: "", sourceUrl: "" });
        setShowAddLead(false);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add lead");
      }
    });
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    // One lead per line: Name, email, type, suburb, region
    const rows = importText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name = "", emailAddr = "", leadType = "", suburb = "", region = ""] = line
          .split(",")
          .map((part) => part.trim());
        return {
          kind: "org" as const,
          name,
          email: emailAddr,
          leadType: leadType || undefined,
          suburb: suburb || undefined,
          region: region || undefined,
        };
      });
    startTransition(async () => {
      try {
        const result = await importLeads(rows);
        setNotice(
          `Imported ${result.imported} leads${result.skipped > 0 ? `, skipped ${result.skipped}` : ""}.` +
            (result.errors.length > 0 ? ` First issues: ${result.errors.slice(0, 3).join(" · ")}` : "")
        );
        setImportText("");
        setShowImport(false);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import");
      }
    });
  };

  const inputClass =
    "w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none transition-colors text-sm";

  const dripModeButton = (active: boolean) =>
    `px-4 py-2 rounded-full text-xs font-medium transition-all ${
      active ? "bg-midnight text-cream" : "bg-cream text-charcoal border border-border-soft hover:border-wheat"
    }`;

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-3xl text-charcoal mb-2">Marketing</h1>
      <p className="text-sm text-charcoal-muted mb-8">
        Every recipient runs the drip ladder by default — parchment today, midnight on day 7,
        terracotta on day 14 — and it stops itself the moment they reply or click. One-off sends
        remain available under each form.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-terracotta-pale rounded-xl text-sm text-terracotta">{error}</div>
      )}
      {notice && (
        <div className="mb-6 p-4 bg-sage/20 rounded-xl text-sm text-charcoal">{notice}</div>
      )}

      <div className="flex gap-2 mb-8 flex-wrap">
        {(
          [
            { key: "person", label: "Invite someone", icon: UserPlus },
            { key: "org", label: "Organisations", icon: Building2 },
            { key: "leads", label: `Leads${leads.length > 0 ? ` (${leads.length})` : ""}`, icon: ClipboardList },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
              tab === t.key
                ? "bg-midnight text-cream"
                : "bg-cream-warm text-charcoal hover:bg-wheat-pale"
            }`}
          >
            <t.icon className="w-4 h-4" strokeWidth={1.5} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "person" && (
        <form onSubmit={personOneOff ? handlePersonOneOff : handlePersonDrip} className="space-y-6">
          <div className="flex gap-2">
            <button type="button" onClick={() => setPersonOneOff(false)} className={dripModeButton(!personOneOff)}>
              Drip campaign (default)
            </button>
            <button type="button" onClick={() => setPersonOneOff(true)} className={dripModeButton(personOneOff)}>
              One-off send
            </button>
          </div>

          {!personOneOff && (
            <div className="bg-cream-warm rounded-2xl border border-border-soft p-5">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="w-4 h-4 text-wheat-dark" strokeWidth={1.5} />
                <span className="text-sm font-medium text-charcoal">What happens</span>
              </div>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                The invitation goes out <strong>now</strong> in the parchment theme. If they don&apos;t
                answer, a bolder midnight letter arrives on day 7 and a final terracotta note on day
                14. Any reply or link click stops the ladder automatically — they never get a
                follow-up they didn&apos;t ask for.
              </p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="their@email.com"
              className={inputClass}
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Their first name (optional)"
              className={inputClass}
            />
          </div>

          {personOneOff && (
            <>
              <div>
                <label className="text-sm text-charcoal-light font-medium block mb-3">
                  Choose a template
                </label>
                <div className="space-y-3">
                  {personTemplates.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTemplateKey(t.key)}
                      className={`w-full text-left rounded-2xl border p-4 transition-all ${
                        templateKey === t.key
                          ? "border-terracotta bg-terracotta-pale/40"
                          : "border-border-soft bg-cream-warm hover:border-wheat"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-charcoal">{t.name}</span>
                        {templateKey === t.key && (
                          <span className="text-[10px] uppercase tracking-wider text-terracotta font-medium">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-muted mt-1">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <ThemePicker value={theme} onChange={setTheme} priorCount={priorPersonSends} />
            </>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="px-6 py-3 bg-cream-warm text-charcoal rounded-full text-sm font-medium border border-border-soft hover:border-wheat transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" strokeWidth={1.5} />
              {showPreview ? "Hide preview" : personOneOff ? "Preview email" : "Preview full drip"}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 bg-midnight text-cream rounded-full text-sm font-medium tracking-wide hover:bg-midnight-soft transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" strokeWidth={1.5} />}
              {personOneOff ? "Send invitation" : "Start drip campaign"}
            </button>
          </div>

          {showPreview && !personOneOff && dripPreview && (
            <div className="space-y-6">
              <p className="text-xs text-charcoal-muted">
                The complete sequence this person will receive — each step only sends if they
                haven&apos;t replied or clicked.
              </p>
              {dripPreview.map((s) => (
                <div key={s.step} className="rounded-2xl border border-border-soft overflow-hidden">
                  <div className="bg-cream-warm px-4 py-3 border-b border-border-soft">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-medium bg-midnight text-cream px-2 py-0.5 rounded-full">
                        Step {s.step} — {s.when}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-charcoal-muted">
                        {s.theme} theme
                      </span>
                      {s.step < 3 && (
                        <span className="text-[10px] text-charcoal-muted ml-auto">
                          skipped if they reply or click
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal-muted mt-2">
                      <strong className="text-charcoal">Subject:</strong> {s.subject}
                    </p>
                  </div>
                  <iframe
                    title={`Email preview — step ${s.step} (${s.theme})`}
                    sandbox=""
                    srcDoc={s.html}
                    className="w-full h-[420px] bg-white"
                  />
                </div>
              ))}
            </div>
          )}

          {showPreview && personOneOff && preview && (
            <div className="rounded-2xl border border-border-soft overflow-hidden">
              <div className="bg-cream-warm px-4 py-3 border-b border-border-soft">
                <p className="text-xs text-charcoal-muted">
                  <strong className="text-charcoal">Subject:</strong> {preview.subject}
                </p>
              </div>
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={preview.html}
                className="w-full h-[480px] bg-white"
              />
            </div>
          )}
        </form>
      )}

      {tab === "org" && (
        <form onSubmit={orgOneOff ? handleOrgSend : handleOrgDrip} className="space-y-6">
          <div className="flex gap-2">
            <button type="button" onClick={() => setOrgOneOff(false)} className={dripModeButton(!orgOneOff)}>
              Drip campaign (default)
            </button>
            <button type="button" onClick={() => setOrgOneOff(true)} className={dripModeButton(orgOneOff)}>
              One-off send
            </button>
          </div>

          <div className="bg-cream-warm rounded-2xl border border-border-soft p-5">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-4 h-4 text-wheat-dark" strokeWidth={1.5} />
              <span className="text-sm font-medium text-charcoal">What they receive</span>
            </div>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              {orgOneOff
                ? "A single partnership email introducing the vision, plus two attachments: a print-ready flyer (A4, with the organisation's name and a QR code straight to the circles page) and the QR code alone as a PNG."
                : "The full proposal letter and printable flyer go out now, and if there's no answer the ladder follows up automatically — a second letter on day 7 and a final note on day 14, each in a bolder theme. A reply or click stops it."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Organisation / church name"
              className={inputClass}
            />
            <input
              type="email"
              required
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
              placeholder="Contact email"
              className={inputClass}
            />
          </div>
          <input
            type="text"
            value={orgContact}
            onChange={(e) => setOrgContact(e.target.value)}
            placeholder="Contact person's name (optional)"
            className={inputClass}
          />
          <select
            value={orgFaith}
            onChange={(e) => setOrgFaith(e.target.value)}
            className="px-4 py-3 bg-cream border border-border-soft rounded-xl text-sm"
            aria-label="Community tradition"
          >
            {Object.entries(FAITH_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <p className="text-[11px] text-charcoal-muted -mt-4">
            The letter quotes this tradition&apos;s own scripture — Matthew for a church, the Qur&apos;an for a mosque, Hillel for a synagogue — because the promise belongs to all of them.
          </p>

          {orgOneOff && <ThemePicker value={orgTheme} onChange={setOrgTheme} priorCount={priorOrgSends} />}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 bg-midnight text-cream rounded-full text-sm font-medium tracking-wide hover:bg-midnight-soft transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" strokeWidth={1.5} />}
              {orgOneOff ? "Send flyer & partnership email" : "Start drip campaign"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFlyer((v) => !v);
                if (!showFlyer) {
                  previewFlyer(orgName || undefined, orgFaith)
                    .then(setFlyerPreview)
                    .catch(() => setFlyerPreview(null));
                }
              }}
              className="px-6 py-3 bg-cream-warm text-charcoal rounded-full text-sm font-medium border border-border-soft hover:border-wheat transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" strokeWidth={1.5} />
              {showFlyer ? "Hide flyer" : "Preview flyer"}
            </button>
            <button
              type="button"
              onClick={() => setShowOrgPreview((v) => !v)}
              className="px-6 py-3 bg-cream-warm text-charcoal rounded-full text-sm font-medium border border-border-soft hover:border-wheat transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" strokeWidth={1.5} />
              {showOrgPreview ? "Hide email preview" : orgOneOff ? "Preview email" : "Preview full drip"}
            </button>
          </div>

          {showFlyer && flyerPreview && (
            <div className="rounded-2xl border border-border-soft overflow-hidden">
              <div className="bg-cream-warm px-4 py-3 border-b border-border-soft flex items-center justify-between">
                <p className="text-xs text-charcoal-muted">
                  Printable A4 flyer — exactly what arrives as an attachment
                </p>
                {orgName && (
                  <span className="text-[10px] uppercase tracking-wider bg-wheat-pale text-wheat-dark px-2 py-0.5 rounded-full">
                    personalised for {orgName}
                  </span>
                )}
              </div>
              <div className="bg-midnight/5 flex justify-center p-4">
                <iframe
                  title="Flyer preview"
                  sandbox=""
                  srcDoc={flyerPreview}
                  className="w-full max-w-[420px] aspect-[794/1123] bg-white rounded-lg shadow-md"
                />
              </div>
              <p className="text-[11px] text-charcoal-muted px-4 py-3 bg-cream-warm">
                The QR code scans to meekmeet.com/circles. The email also includes the QR alone
                as a PNG for slides and social posts.
              </p>
            </div>
          )}

          {showOrgPreview && !orgOneOff && dripPreview && (
            <div className="space-y-6">
              <p className="text-xs text-charcoal-muted">
                The complete sequence this organisation will receive — one letter per step,
                each follow-up only sending if they haven&apos;t replied or clicked. Toggle
                &ldquo;Preview flyer&rdquo; to also see the flyer attachment for each step.
              </p>
              {dripPreview.map((s) => (
                <div key={s.step} className="rounded-2xl border border-border-soft overflow-hidden">
                  <div className="bg-cream-warm px-4 py-3 border-b border-border-soft">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-medium bg-midnight text-cream px-2 py-0.5 rounded-full">
                        Step {s.step} — {s.when}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-charcoal-muted">
                        {s.theme} theme
                      </span>
                      {s.step < 3 && (
                        <span className="text-[10px] text-charcoal-muted ml-auto">
                          skipped if they reply or click
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal-muted mt-2">
                      <strong className="text-charcoal">Subject:</strong> {s.subject}
                    </p>
                  </div>
                  <iframe
                    title={`Email preview — step ${s.step} (${s.theme})`}
                    sandbox=""
                    srcDoc={s.html}
                    className="w-full h-[420px] bg-white"
                  />
                  {s.flyerSvg && showFlyer && (
                    <div className="bg-midnight/5 border-t border-border-soft">
                      <p className="text-[11px] text-charcoal-muted px-4 pt-3">
                        Flyer attachment for this step — exactly as it arrives (meek-meet-flyer.svg)
                      </p>
                      <div className="flex justify-center p-4">
                        <iframe
                          title={`Flyer preview — step ${s.step} (${s.theme})`}
                          sandbox=""
                          srcDoc={s.flyerSvg}
                          className="w-full max-w-[300px] aspect-[794/1123] bg-white rounded-lg shadow-md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showOrgPreview && orgOneOff && orgPreview && (
            <div className="rounded-2xl border border-border-soft overflow-hidden">
              <div className="bg-cream-warm px-4 py-3 border-b border-border-soft">
                <p className="text-xs text-charcoal-muted">
                  <strong className="text-charcoal">Subject:</strong> {orgPreview.subject}
                </p>
                <p className="text-[11px] text-charcoal-muted mt-1">
                  Attachments are not shown in the preview: meek-meet-flyer.svg and meek-meet-qr.png.
                </p>
              </div>
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={orgPreview.html}
                className="w-full h-[480px] bg-white"
              />
            </div>
          )}
        </form>
      )}

      {tab === "leads" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { label: "Total leads", value: leadCounts.total },
                { label: "Fresh", value: leadCounts.fresh },
                { label: "In drip", value: leadCounts.active },
                { label: "Responded", value: leadCounts.responded },
              ] as const
            ).map((c) => (
              <div key={c.label} className="bg-cream-warm rounded-2xl border border-border-soft p-4">
                <p className="font-serif text-2xl text-charcoal">{c.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-charcoal-muted">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-muted" strokeWidth={1.5} />
              <input
                type="text"
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                placeholder="Search name, email, suburb…"
                className={`${inputClass} pl-11`}
              />
            </div>
            <select
              value={leadRegion}
              onChange={(e) => setLeadRegion(e.target.value)}
              className="px-4 py-3 bg-cream border border-border-soft rounded-xl text-sm"
              aria-label="Filter by region"
            >
              <option value="all">All regions</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              value={leadKindFilter}
              onChange={(e) => setLeadKindFilter(e.target.value)}
              className="px-4 py-3 bg-cream border border-border-soft rounded-xl text-sm"
              aria-label="Filter by kind"
            >
              <option value="all">Orgs + individuals</option>
              <option value="org">Organisations</option>
              <option value="individual">Individuals</option>
            </select>
            <select
              value={leadStatusFilter}
              onChange={(e) => setLeadStatusFilter(e.target.value)}
              className="px-4 py-3 bg-cream border border-border-soft rounded-xl text-sm"
              aria-label="Filter by status"
            >
              <option value="all">Any status</option>
              <option value="new">New</option>
              <option value="drip">In drip</option>
              <option value="replied">Replied</option>
              <option value="engaged">Clicked through</option>
              <option value="bounced">Bounced</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBulkDrip}
              disabled={isPending || selected.size === 0}
              className="px-5 py-2.5 bg-midnight text-cream rounded-full text-sm font-medium hover:bg-midnight-soft transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" strokeWidth={1.5} />}
              Queue drip for {selected.size || "…"} selected
            </button>
            <button
              type="button"
              onClick={() => { setShowAddLead((v) => !v); setShowImport(false); }}
              className="px-5 py-2.5 bg-cream-warm text-charcoal rounded-full text-sm font-medium border border-border-soft hover:border-wheat transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              Add lead
            </button>
            <button
              type="button"
              onClick={() => { setShowImport((v) => !v); setShowAddLead(false); }}
              className="px-5 py-2.5 bg-cream-warm text-charcoal rounded-full text-sm font-medium border border-border-soft hover:border-wheat transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" strokeWidth={1.5} />
              Bulk import
            </button>
            <span className="text-[11px] text-charcoal-muted self-center">
              Pace bulk sends — the Resend free tier caps ~100 emails/day.
            </span>
          </div>

          {showAddLead && (
            <form onSubmit={handleAddLead} className="bg-cream-warm rounded-2xl border border-border-soft p-5 space-y-3">
              <div className="flex gap-2">
                {(
                  [
                    { key: "org", label: "Organisation" },
                    { key: "individual", label: "Individual" },
                  ] as const
                ).map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => setNewLead({ ...newLead, kind: k.key })}
                    className={dripModeButton(newLead.kind === k.key)}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  type="text" required value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  placeholder={newLead.kind === "org" ? "Organisation name" : "Full name"}
                  className={inputClass}
                />
                <input
                  type="email" required value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="Email"
                  className={inputClass}
                />
                <input
                  type="text" value={newLead.contactName}
                  onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                  placeholder="Contact person (optional)"
                  className={inputClass}
                />
                <input
                  type="text" value={newLead.suburb}
                  onChange={(e) => setNewLead({ ...newLead, suburb: e.target.value })}
                  placeholder="Suburb"
                  className={inputClass}
                />
                {newLead.kind === "org" && (
                  <select
                    value={newLead.leadType}
                    onChange={(e) => setNewLead({ ...newLead, leadType: e.target.value })}
                    className="px-4 py-3 bg-cream border border-border-soft rounded-xl text-sm"
                    aria-label="Lead type"
                  >
                    {Object.entries(LEAD_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                )}
                <select
                  value={newLead.faith}
                  onChange={(e) => setNewLead({ ...newLead, faith: e.target.value })}
                  className="px-4 py-3 bg-cream border border-border-soft rounded-xl text-sm"
                  aria-label="Faith tradition"
                >
                  <option value="">Faith: derive from type</option>
                  {Object.entries(FAITH_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <select
                  value={newLead.region}
                  onChange={(e) => setNewLead({ ...newLead, region: e.target.value })}
                  className="px-4 py-3 bg-cream border border-border-soft rounded-xl text-sm"
                  aria-label="Region"
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <input
                  type="text" value={newLead.sourceUrl}
                  onChange={(e) => setNewLead({ ...newLead, sourceUrl: e.target.value })}
                  placeholder="Source URL (where the email is listed)"
                  className={`${inputClass} sm:col-span-2`}
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-3 bg-midnight text-cream rounded-full text-sm font-medium hover:bg-midnight-soft transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" strokeWidth={1.5} />}
                Save lead
              </button>
            </form>
          )}

          {showImport && (
            <form onSubmit={handleImport} className="bg-cream-warm rounded-2xl border border-border-soft p-5 space-y-3">
              <p className="text-xs text-charcoal-muted">
                One lead per line, comma-separated: <code className="font-mono">Name, email, type, suburb, region</code>.
                Type/suburb/region are optional. Duplicate emails are skipped.
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={6}
                placeholder={"St Marys Parish, office@stmarys.example, church-catholic, Gosford, Central Coast"}
                className={`${inputClass} font-mono text-xs`}
              />
              <button
                type="submit"
                disabled={isPending || !importText.trim()}
                className="px-6 py-3 bg-midnight text-cream rounded-full text-sm font-medium hover:bg-midnight-soft transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" strokeWidth={1.5} />}
                Import {importText.split("\n").map((l) => l.trim()).filter(Boolean).length || ""} leads
              </button>
            </form>
          )}

          {filteredLeads.length === 0 ? (
            <p className="text-sm text-charcoal-muted">
              {leads.length === 0
                ? "No leads yet — add some above, or paste a researched list via Bulk import."
                : "No leads match these filters."}
            </p>
          ) : (
            <div className="rounded-2xl border border-border-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-cream-warm text-left text-[11px] uppercase tracking-wider text-charcoal-muted">
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selected.size > 0 && selected.size === filteredLeads.length}
                          onChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Lead</th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell">Location</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const status = leadStatus(lead);
                      return (
                        <tr key={lead.id} className="border-t border-border-soft hover:bg-cream-warm/50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(lead.id)}
                              onChange={() => toggleSelect(lead.id)}
                              aria-label={`Select ${lead.name}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-charcoal font-medium block">{lead.name}</span>
                            <span className="text-xs text-charcoal-muted block">
                              {lead.kind === "org" ? leadTypeLabel(lead.lead_type) : "Individual"}
                              {lead.contact_name ? ` · ${lead.contact_name}` : ""}
                            </span>
                            <span className="text-xs text-charcoal-muted block">{lead.email}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs text-charcoal-light flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-charcoal-muted" strokeWidth={1.5} />
                              {[lead.suburb, lead.region].filter(Boolean).join(", ") || "—"}
                            </span>
                            {lead.source_url && (
                              <a
                                href={lead.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-wheat-dark hover:text-terracotta transition-colors block truncate max-w-[220px]"
                              >
                                source
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${STATUS_TONE_CLASS[status.tone]}`}>
                              {status.label}
                            </span>
                            {lead.last_contacted_at && (
                              <span className="text-[11px] text-charcoal-muted block mt-1">
                                {formatDate(lead.last_contacted_at)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleLoadLead(lead)}
                              className="text-xs text-wheat-dark hover:text-terracotta transition-colors font-medium"
                            >
                              Open
                            </button>
                            {lead.sequence ? (
                              (() => {
                                const seq = lead.sequence;
                                const ordinal =
                                  seq.current_step >= 3 ? "3rd" : seq.current_step === 2 ? "2nd" : "1st";
                                if (seq.status === "active") {
                                  const queued =
                                    seq.current_step === 0 &&
                                    new Date(seq.next_run_at).getTime() > Date.now();
                                  return (
                                    <span className="text-[11px] ml-3 text-wheat-dark">
                                      {queued
                                        ? `queued — ${formatDate(seq.next_run_at)}`
                                        : `drip running · ${ordinal} email sent`}
                                    </span>
                                  );
                                }
                                if (seq.status === "completed") {
                                  return (
                                    <span className="text-[11px] text-sage-dark ml-3">drip complete · all 3 sent</span>
                                  );
                                }
                                return (
                                  <span className="text-[11px] text-charcoal-muted ml-3">
                                    stopped ({seq.status.replace("stopped_", "")})
                                  </span>
                                );
                              })()
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartLeadDrip(lead)}
                                disabled={isPending}
                                className="text-xs text-midnight hover:text-terracotta transition-colors font-medium ml-3 disabled:opacity-50"
                              >
                                Start drip
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteLead(lead)}
                              disabled={isPending}
                              className="ml-3 text-charcoal-muted hover:text-terracotta transition-colors disabled:opacity-50"
                              aria-label={`Delete ${lead.name}`}
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <h2 className="font-serif text-xl text-charcoal mt-12 mb-2 flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-charcoal-muted" strokeWidth={1.5} />
        Drip sequences
      </h2>
      <p className="text-xs text-charcoal-muted mb-4">
        Every active ladder: parchment on day 0, midnight on day 7, terracotta on day 14 —
        stopped automatically by a reply or a tracked click.
      </p>

      {sequences.length > 0 && (
        <div className="space-y-2 mb-4">
          {sequences.map((seq) => (
            <div
              key={seq.id}
              className="flex items-center justify-between gap-4 bg-cream-warm rounded-2xl border border-border-soft px-5 py-3"
            >
              <div className="min-w-0">
                <span className="text-sm text-charcoal truncate block">
                  {seq.org_name ? `${seq.org_name} · ` : ""}
                  {seq.recipient_email}
                </span>
                <span className="text-xs text-charcoal-muted block">
                  {seq.status === "active"
                    ? `step ${seq.current_step + 1} of 3 · next ${formatDate(seq.next_run_at)}`
                    : seq.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {seq.status === "active" && (
                  <button
                    onClick={() => handleStopSequence(seq)}
                    disabled={isPending}
                    className="text-xs text-charcoal-muted hover:text-terracotta transition-colors"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {stats && (
        <div className="bg-cream-warm rounded-2xl border border-border-soft p-5 mb-10">
          <h3 className="text-sm font-medium text-charcoal mb-3">Theme performance</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {stats.perTheme.map((row) => (
              <div key={row.theme} className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-charcoal-muted capitalize">
                  {row.theme}
                </p>
                <p className="font-serif text-2xl text-charcoal">
                  {row.sends > 0 ? Math.round((row.clicks / row.sends) * 100) : 0}%
                </p>
                <p className="text-[11px] text-charcoal-muted">
                  {row.clicks}/{row.sends} clicked
                </p>
              </div>
            ))}
          </div>
          <h3 className="text-sm font-medium text-charcoal mb-2">Template performance</h3>
          <div className="space-y-1">
            {stats.perTemplate.map((row) => (
              <div key={row.template} className="flex justify-between text-xs text-charcoal-muted">
                <span className="font-mono">{row.template}</span>
                <span>
                  {row.clicks}/{row.sends} clicked
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-serif text-xl text-charcoal mt-4 mb-4">Recent outreach</h2>
      {history.length === 0 ? (
        <p className="text-sm text-charcoal-muted">Nothing sent yet.</p>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-4 bg-cream-warm rounded-2xl border border-border-soft px-5 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {entry.kind === "org_flyer" ? (
                  <Building2 className="w-4 h-4 text-charcoal-muted flex-shrink-0" strokeWidth={1.5} />
                ) : (
                  <User className="w-4 h-4 text-charcoal-muted flex-shrink-0" strokeWidth={1.5} />
                )}
                <div className="min-w-0">
                  <span className="text-sm text-charcoal truncate block">
                    {entry.recipient_org ? `${entry.recipient_org} · ` : ""}
                    {entry.recipient_email}
                  </span>
                  <span className="text-xs text-charcoal-muted block">
                    {entry.kind === "org_flyer" ? "Flyer + proposal" : "Invitation"} · {entry.theme} · {formatDate(entry.created_at)}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  entry.status === "sent"
                    ? "bg-sage/20 text-sage-dark"
                    : "bg-terracotta-pale text-terracotta"
                }`}
              >
                {entry.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
