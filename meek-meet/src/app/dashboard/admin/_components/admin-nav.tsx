"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Shield,
  Users,
  MapPin,
  Calendar,
  Inbox,
  HelpCircle,
  Building2,
  Crown,
  Heart,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { isMasterEmail } from "@/lib/master-admin";

const navItems = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/applications", label: "Applications", icon: FileText },
  { href: "/dashboard/admin/verification", label: "Verification", icon: Shield },
  { href: "/dashboard/admin/shepherds", label: "Leaders", icon: Users },
  { href: "/dashboard/admin/circles", label: "Circles", icon: MapPin },
  { href: "/dashboard/admin/meetings", label: "Meetings", icon: Calendar },
  { href: "/dashboard/admin/members", label: "Members", icon: Heart },
  { href: "/dashboard/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/dashboard/admin/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/admin/questions", label: "Questions", icon: HelpCircle },
  { href: "/dashboard/admin/authorities", label: "Authorities", icon: Building2 },
];

// Admin management is reserved for the master admin only; regular admins
// never see this entry (server actions and RPCs enforce it too).
const masterNavItem = {
  href: "/dashboard/admin/admins",
  label: "Admins",
  icon: Crown,
};

export default function AdminNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items = isMasterEmail(user?.email)
    ? [...navItems, masterNavItem]
    : navItems;

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {items.map((item) => {
        const isActive =
          item.href === "/dashboard/admin"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              isActive
                ? "bg-midnight text-cream"
                : "bg-cream-warm text-charcoal hover:bg-wheat-pale"
            }`}
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
