import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Voice | Meek Meet",
  description:
    "Anonymised, aggregated insights from Meek Meet circles — what communities are saying, in their own words.",
};

export default function VoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
