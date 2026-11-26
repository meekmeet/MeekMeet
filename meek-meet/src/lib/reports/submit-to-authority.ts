"use server";

import { createClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import { buildAuthorityLetter } from "@/lib/reports/authority-email";
import type { ReportContent } from "@/lib/reports/generate-report";

interface CircleRef {
  name: string | null;
  location: string | null;
  lga_code: string | null;
  lga_name: string | null;
  state_code: string | null;
}

export async function submitReportToAuthority(reportId: string, authorityId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch report
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("*, circles(name, location, lga_code, lga_name, state_code)")
    .eq("id", reportId)
    .single();

  if (reportError || !report) throw new Error("Report not found");

  // Authorization: shepherd of the circle or admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    if (!report.circle_id) throw new Error("Not authorized");
    const { data: shepherd } = await supabase
      .from("circle_shepherds")
      .select("id")
      .eq("circle_id", report.circle_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!shepherd) throw new Error("Not authorized to submit this report");
  }

  // Find authority
  let authority;
  if (authorityId) {
    const { data } = await supabase.from("authorities").select("*").eq("id", authorityId).single();
    authority = data;
  } else {
    // Match by circle region
    const circle = report.circles as CircleRef | null;
    const regionType = circle?.lga_code ? "lga" : circle?.state_code ? "state" : null;
    const regionCode = circle?.lga_code ?? circle?.state_code;

    if (regionType && regionCode) {
      const { data } = await supabase
        .from("authorities")
        .select("*")
        .eq("region_type", regionType)
        .eq("region_code", regionCode)
        .eq("authority_type", "council")
        .single();
      authority = data;
    }
  }

  if (!authority || !authority.contact_email) {
    throw new Error("No matching authority with email found. Please add an authority first.");
  }

  const circle = report.circles as CircleRef | null;
  const content = (report.content ?? {}) as Partial<ReportContent>;
  const generatedAt =
    typeof report.generated_at === "string" ? report.generated_at : new Date().toISOString();

  const letter = buildAuthorityLetter({
    authorityName: authority.name ?? "the receiving authority",
    circleName: circle?.name ?? "A Meek Meet Circle",
    circleLocation: circle?.location ?? "your community",
    content,
    summary: report.summary ?? content.rawSummary ?? "",
    reportId,
    generatedAt,
  });

  const { subject, html } = letter;

  try {
    await getResend().emails.send({
      from: "Meek Meet <hello@meekmeet.com>",
      to: authority.contact_email,
      subject,
      html,
    });
  } catch (err) {
    console.error("Failed to send report:", err);
    throw new Error("Failed to send report email");
  }

  // Record submission
  const { error: submissionError } = await supabase.from("authority_submissions").insert({
    authority_id: authority.id,
    report_id: reportId,
    circle_id: report.circle_id,
    submitted_by: user.id,
    submitted_at: new Date().toISOString(),
    status: "delivered",
    subject,
    body_html: html,
  });

  if (submissionError) throw new Error(submissionError.message);

  // Update report status
  await supabase.from("reports").update({ status: "submitted", sent_to_authority_at: new Date().toISOString(), sent_to_authority_email: authority.contact_email }).eq("id", reportId);

  return { success: true, authority: authority.name };
}
