import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Child Safety Standards — Meek Meet",
  description:
    "Meek Meet's published standards against child sexual abuse and exploitation (CSAE): prevention, detection, reporting, and cooperation with authorities.",
};

export default function ChildSafetyPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 bg-cream">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <h1 className="font-serif text-4xl text-charcoal mb-8">
          Child Safety Standards
        </h1>
        <p className="text-charcoal-muted mb-8">Last updated: 16 October 2026</p>

        <div className="prose prose-lg prose-stone max-w-none">
          <p>
            Meek Meet is committed to the highest standards of child safety. We have
            zero tolerance for child sexual abuse and exploitation (CSAE), including
            any content, conduct, or attempt to groom, sexualise, exploit, or endanger
            a child on our platform. This page publishes our standards publicly, as
            required by Google Play&rsquo;s Families and child-safety policies, and
            applies to the Meek Meet mobile app and website everywhere in the world.
          </p>

          <h2>1. Zero Tolerance Policy</h2>
          <p>
            The following are strictly prohibited on Meek Meet, in our Terms of
            Service, and enforced without exception:
          </p>
          <ul>
            <li>
              Any child sexual abuse material (CSAM) — the creation, upload, sharing,
              request, or distribution of imagery or content that sexually exploits a
              minor.
            </li>
            <li>
              Grooming, or any conduct intended to establish inappropriate contact
              with, or exploitation of, a person under 18.
            </li>
            <li>
              Sexualised commentary about, or sexualised depictions of, minors in any
              form, including drawings, AI-generated imagery, or text.
            </li>
            <li>
              Facilitating, encouraging, or normalising the sexual abuse or
              exploitation of children in any way.
            </li>
          </ul>

          <h2>2. Age Restrictions</h2>
          <p>
            Meek Meet is not directed at children under 13 and does not knowingly
            collect personal information from children under 13. The app is rated for
            teens (13+) and adults. Community gatherings are hosted by verified adults,
            and our platform is designed so that no adult can privately message a minor
            outside supervised, recorded circle spaces.
          </p>

          <h2>3. Prevention</h2>
          <ul>
            <li>
              <strong>Verified leaders:</strong> every circle shepherd undergoes
              identity verification and background checks, including Working With
              Children Checks and national police checks, before they can lead a
              community.
            </li>
            <li>
              <strong>Platform design:</strong> Meek Meet has no open public chat
              rooms, no stranger direct-messaging, and no anonymous photo sharing to
              unknown users. Community responses within circles are visible to
              shepherds and administrators for accountability.
            </li>
            <li>
              <strong>Enforcement:</strong> accounts violating these standards are
              permanently terminated and, where the law requires, reported.
            </li>
          </ul>

          <h2>4. Detection and In-App Reporting</h2>
          <p>
            Users can report child safety concerns directly inside the Meek Meet app
            via the Contact Admin screen, available from the profile and settings
            menus. Reports are flagged to our safety team with priority handling.
            Users can also report any circle, meeting, response, or profile that
            concerns them, and administrators review every report.
          </p>

          <h2>5. Response and Escalation to Authorities</h2>
          <p>
            When child exploitation is suspected or reported, we act immediately and
            in compliance with all applicable laws:
          </p>
          <ul>
            <li>
              Content is removed, access is suspended, and evidence is preserved.
            </li>
            <li>
              We report apparent CSAM and child exploitation to the appropriate
              regional and national authorities, including the National Center for
              Missing &amp; Exploited Children (NCMEC, United States), the Australian
              Centre to Counter Child Exploitation and the eSafety Commissioner
              (Australia), the Internet Watch Foundation (United Kingdom), and the
              relevant Israeli authorities, as well as any local law enforcement
              agency with jurisdiction.
            </li>
            <li>
              We cooperate fully with law enforcement investigations and respond to
              valid legal process.
            </li>
          </ul>

          <h2>6. Contact Point</h2>
          <p>
            Our designated point of contact for child safety matters is reachable at{" "}
            <a href="mailto:4martinkhoury@gmail.com">4martinkhoury@gmail.com</a>. This
            contact is ready and able to speak to our child safety practices and
            compliance obligations.
          </p>

          <h2>7. Review and Updates</h2>
          <p>
            These standards are reviewed regularly and updated as laws, platform
            features, and best practices evolve. The date at the top of this page
            reflects the most recent revision. Continued use of Meek Meet after an
            update constitutes acceptance of the updated standards.
          </p>
        </div>
      </div>
    </main>
  );
}
