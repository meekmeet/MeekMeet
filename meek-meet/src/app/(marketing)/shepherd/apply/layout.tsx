import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shepherd Application | Meek Meet",
  description:
    "Apply to shepherd a Meek Meet circle — identity and safeguarding verification required.",
};

export default function ShepherdApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
