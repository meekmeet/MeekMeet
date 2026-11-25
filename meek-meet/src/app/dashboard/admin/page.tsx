import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Users,
  MapPin,
  Calendar,
  CalendarCheck,
  FileText,
  Heart,
  MessageCircle,
  CheckCircle,
  ArrowRight,
  AlertCircle,
  Megaphone,
} from "lucide-react";

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const { data: stats } = await supabase.rpc("get_admin_stats");

  const cards = [
    {
      label: "Leaders",
      value: stats?.total_shepherds,
      icon: Users,
      color: "text-terracotta",
      href: "/dashboard/admin/shepherds",
    },
    {
      label: "Circles",
      value: stats?.total_circles,
      icon: MapPin,
      color: "text-sage",
      href: "/dashboard/admin/circles",
    },
    {
      label: "Scheduled Meetings",
      value: stats?.total_scheduled_meetings,
      icon: Calendar,
      color: "text-wheat-dark",
      href: "/dashboard/admin/meetings",
    },
    {
      label: "Completed Meetings",
      value: stats?.total_completed_meetings,
      icon: CalendarCheck,
      color: "text-sage",
      href: "/dashboard/admin/meetings",
    },
    {
      label: "Pending Applications",
      value: stats?.pending_applications,
      icon: FileText,
      color: "text-terracotta",
      href: "/dashboard/admin/applications",
      highlight: (stats?.pending_applications ?? 0) > 0,
    },
    {
      label: "Members",
      value: stats?.total_members,
      icon: Heart,
      color: "text-wheat-dark",
      href: "/dashboard/admin/members",
    },
    {
      label: "Responses",
      value: stats?.total_responses,
      icon: MessageCircle,
      color: "text-sage",
      href: "/dashboard/admin/meetings",
    },
    {
      label: "Active RSVPs",
      value: stats?.active_rsvps,
      icon: CheckCircle,
      color: "text-terracotta",
      href: "/dashboard/admin/meetings",
    },
  ];

  const quickLinks = [
    { href: "/dashboard/admin/applications", label: "Review Applications", description: "Approve or reject leader applications" },
    { href: "/dashboard/admin/verification", label: "Verification", description: "Review WWCC and ID documents" },
    { href: "/dashboard/admin/shepherds", label: "Leaders", description: "All active leaders and their circles" },
    { href: "/dashboard/admin/circles", label: "Circles", description: "Every circle across the community" },
    { href: "/dashboard/admin/meetings", label: "Meetings", description: "Recent and upcoming gatherings" },
    { href: "/dashboard/admin/members", label: "Members", description: "Everyone in the community, searchable" },
    { href: "/dashboard/admin/marketing", label: "Marketing", description: "Invitations, flyers, and outreach" },
    { href: "/dashboard/admin/inbox", label: "Inbox", description: "Messages from the community" },
    { href: "/dashboard/admin/questions", label: "Questions", description: "Fresh news questions for circles" },
    { href: "/dashboard/admin/authorities", label: "Authorities", description: "Councils and officials for reports" },
  ];

  const pending = stats?.pending_applications ?? 0;

  return (
    <div>
      <h1 className="font-serif text-3xl text-charcoal mb-2">Admin Overview</h1>
      <p className="text-charcoal-muted mb-8">
        A bird&apos;s-eye view of the Meek Meet community.
      </p>

      {pending > 0 && (
        <Link
          href="/dashboard/admin/applications"
          className="flex items-center gap-3 bg-terracotta-pale rounded-2xl border border-terracotta/30 px-5 py-4 mb-8 hover:bg-terracotta-pale/70 transition-colors"
        >
          <AlertCircle className="w-5 h-5 text-terracotta flex-shrink-0" strokeWidth={1.5} />
          <span className="text-sm text-terracotta font-medium">
            {pending} leader application{pending === 1 ? "" : "s"} waiting for review
          </span>
          <ArrowRight className="w-4 h-4 text-terracotta ml-auto" strokeWidth={1.5} />
        </Link>
      )}

      {/* Stat cards — every card navigates to its detail view */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {cards.map((card) => {
          const Icon = card.icon;
          const inner = (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${card.color}`} strokeWidth={1.5} />
                <span className="text-xs tracking-wider uppercase text-charcoal-muted font-medium">
                  {card.label}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <p className="font-serif text-4xl text-charcoal">
                  {card.value ?? "—"}
                </p>
                <ArrowRight className="w-4 h-4 text-charcoal-muted" strokeWidth={1.5} />
              </div>
            </>
          );
          const className = `block bg-cream-warm rounded-2xl border p-6 transition-all hover:border-wheat hover:shadow-md ${
            card.highlight ? "border-terracotta/50" : "border-border-soft"
          }`;
          return (
            <Link key={card.label} href={card.href} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>

      {/* Quick links */}
      <h2 className="font-serif text-2xl text-charcoal mb-6">Manage</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-cream-warm rounded-2xl border border-border-soft p-6 hover:border-wheat transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-charcoal">{link.label}</h3>
              <ArrowRight className="w-4 h-4 text-charcoal-muted group-hover:text-terracotta transition-colors" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-charcoal-muted">{link.description}</p>
          </Link>
        ))}
      </div>

      {/* Marketing nudge */}
      <div className="mt-12 bg-midnight rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <Megaphone className="w-6 h-6 text-cream/70 flex-shrink-0" strokeWidth={1.5} />
        <div className="flex-1">
          <h3 className="font-serif text-lg text-cream">Carry the vision outward</h3>
          <p className="text-sm text-cream/70 mt-1">
            Invite someone by name, or send a printable flyer with a QR code to a
            church or organisation.
          </p>
        </div>
        <Link
          href="/dashboard/admin/marketing"
          className="px-6 py-3 bg-cream text-midnight rounded-full text-sm font-medium tracking-wide hover:bg-wheat-pale transition-colors flex-shrink-0 text-center"
        >
          Open Marketing
        </Link>
      </div>
    </div>
  );
}
