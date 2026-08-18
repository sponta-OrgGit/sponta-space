import type { Metadata } from "next";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SITE } from "@/lib/constants";

// Contact details for the data controller. Rendered in the contact block at
// the top of the policy and again in section 8 — keep the two in sync by
// reading from here rather than retyping them.
const CONTACT = {
  address: "Heinämaantie 18, 16300 Orimattila",
  email: "artturi.kaskimaki@gmail.com",
  phone: "+358 45 314 5053",
  phoneHref: "+358453145053",
};

const title = "Privacy Policy — Sponta";
const description =
  "How Sponta collects, uses, and protects personal data — location, profile, and activity data, third parties, retention, and your rights under the GDPR. Data controller: Material Ops Oy.";

export const metadata: Metadata = {
  title,
  description,
  // metadataBase comes from the root layout (SITE.url), so this resolves to
  // the absolute canonical URL for the page.
  alternates: { canonical: "/privacy" },
  openGraph: {
    title,
    description,
    url: `${SITE.url}/privacy`,
    siteName: SITE.name,
    type: "article",
  },
  robots: { index: true, follow: true },
};

/* The document is long enough that repeating the class strings on every node
   would bury the content. These local wrappers keep the markup semantic while
   the type/color choices stay in one place — all tokens from globals.css. */

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-white/10 pt-10">
      <h2 className="font-display text-xl font-bold leading-tight text-fg-1 sm:text-2xl">
        {heading}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 font-body text-base font-bold leading-snug text-fg-1">{children}</h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="font-body text-base leading-relaxed text-fg-2">{children}</p>;
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-orange">{children}</ul>;
}

function Item({ children }: { children: React.ReactNode }) {
  return <li className="font-body text-base leading-relaxed text-fg-2">{children}</li>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-bold text-fg-1">{children}</strong>;
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-bg-0">
      <Header />

      <div className="px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-content">
          {/* The root layout declares lang="fi"; this document is English. */}
          <article lang="en" className="max-w-xl">
            <h1 className="font-display text-3xl font-bold leading-tight text-fg-1 sm:text-4xl">
              Sponta Privacy Policy
            </h1>
            <p className="mt-3 font-mono text-xs text-fg-3">
              Last updated: August 18, 2026
            </p>

            <div className="mt-8 space-y-4">
              <P>
                This policy explains what personal data Sponta collects, why, and what rights
                you have. It applies to the Sponta mobile app (currently in closed testing) and
                the consumer website at sponta.social.
              </P>
              <P>
                Sponta is operated by <Strong>Material Ops Oy</Strong> (Finnish business ID /
                Y-tunnus: 3587294-1), a company registered in Finland. Material Ops Oy is the
                data controller for the personal data described in this policy.
              </P>

              <SubHeading>Contact:</SubHeading>
              <address className="font-body text-base not-italic leading-relaxed text-fg-2">
                {CONTACT.address}
                <br />
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="text-teal underline underline-offset-2 hover:text-fg-1"
                >
                  {CONTACT.email}
                </a>
                <br />
                <a
                  href={`tel:${CONTACT.phoneHref}`}
                  className="text-teal underline underline-offset-2 hover:text-fg-1"
                >
                  {CONTACT.phone}
                </a>
              </address>
            </div>

            <Section heading="1. What data we collect">
              <SubHeading>Account information</SubHeading>
              <P>
                When you sign in with Apple or Google, we receive your name, email address, and
                profile photo from that provider. We do not use passwords — Sponta only supports
                Sign in with Apple and Sign in with Google, and we never see or store your Apple
                or Google account password.
              </P>

              <SubHeading>Location data</SubHeading>
              <P>
                With your permission, we collect your approximate or precise location to power
                context-aware recommendations (for example, suggesting nearby lunch spots or
                venues relevant to where you are and who you&rsquo;re with). Location is central
                to how Sponta works — it is one of the core inputs, alongside time of day and day
                of week, that determines what you see.
              </P>

              <SubHeading>Profile and preference data</SubHeading>
              <P>
                Information you provide about yourself: interests, hobbies, food preferences and
                dietary needs, accessibility needs, budget level, and resources you&rsquo;re
                willing to share with a group (such as access to a car, boat, or cottage for
                group activities).
              </P>

              <SubHeading>Activity and behavioral data</SubHeading>
              <List>
                <Item>
                  Which venues and events you swipe on, and in which direction (this is core to
                  how Sponta learns what&rsquo;s actually relevant to you, as distinct from what
                  you say you like)
                </Item>
                <Item>Groups you&rsquo;re a member of, and group chat messages</Item>
                <Item>Venues and events you save or follow</Item>
                <Item>Event proposals and other content you create inside the app</Item>
              </List>

              <SubHeading>Technical data</SubHeading>
              <P>
                Standard technical information collected automatically for security and debugging
                purposes (such as device type and IP address at the time of a request).
              </P>
            </Section>

            <Section heading="2. Why we collect this data">
              <P>We use your data to:</P>
              <List>
                <Item>
                  Provide Sponta&rsquo;s core function: matching your context (location, time,
                  who you&rsquo;re with) and identity (preferences, past behavior) to relevant
                  venues, events, and group decisions
                </Item>
                <Item>
                  Let you form and coordinate with groups — invite friends, chat, and reach
                  shared decisions
                </Item>
                <Item>Let you follow venues and save places you&rsquo;re interested in</Item>
                <Item>
                  Improve the recommendation system over time based on real usage, not just
                  declared preferences
                </Item>
                <Item>Maintain the security and reliability of the service</Item>
              </List>
              <P>
                <Strong>Legal basis:</Strong> we process your data based on your consent (for
                example, location access, which you can withdraw at any time in your device
                settings), the necessity of processing to provide the service you&rsquo;ve signed
                up for, and our legitimate interest in improving and securing the product.
              </P>
            </Section>

            <Section heading="3. Third parties">
              <P>
                Sponta shares data with a limited set of service providers necessary to operate
                the app:
              </P>
              <List>
                <Item>
                  <Strong>Apple and Google</Strong> — for Sign in with Apple / Sign in with
                  Google authentication
                </Item>
                <Item>
                  <Strong>Google Places API</Strong> — we do not store Google Places photos,
                  names, or venue details in our database. We store only a{" "}
                  <code className="font-mono text-sm text-fg-1">place_id</code> reference and
                  fetch live details from Google at the moment they&rsquo;re displayed to you,
                  with attribution, in accordance with Google&rsquo;s terms
                </Item>
                <Item>
                  <Strong>Amazon Web Services (AWS)</Strong> — our infrastructure, database, and
                  image storage run on AWS servers located in the EU (Stockholm, eu-north-1)
                </Item>
              </List>
              <P>
                We do not sell your personal data, and we do not share it with advertisers.
              </P>
            </Section>

            <Section heading="4. Data retention and deletion">
              <P>
                If your account is inactive for 24 months, we anonymize it automatically: your
                name is replaced with &ldquo;Deleted User,&rdquo; your email is irreversibly
                hashed, your preference and constraint data is deleted, you&rsquo;re removed from
                any groups or communities, and your profile photo is deleted. We retain
                anonymized activity data (such as anonymized swipe history) for aggregate
                analytics — this data can no longer be linked back to you. You&rsquo;ll receive
                an email confirming the deletion.
              </P>
              <P>
                You can also request deletion of your account at any time by contacting us at the
                email address above.
              </P>
            </Section>

            <Section heading="5. Your rights">
              <P>If you&rsquo;re in the EU/EEA, you have the right to:</P>
              <List>
                <Item>
                  <Strong>Access</Strong> the personal data we hold about you
                </Item>
                <Item>
                  <Strong>Rectify</Strong> inaccurate data
                </Item>
                <Item>
                  <Strong>Erase</Strong> your data (&ldquo;right to be forgotten&rdquo;)
                </Item>
                <Item>
                  <Strong>Restrict or object</Strong> to certain processing
                </Item>
                <Item>
                  <Strong>Data portability</Strong> — receive your data in a portable format
                </Item>
                <Item>
                  <Strong>Withdraw consent</Strong> at any time, where processing is based on
                  consent (for example, by disabling location access)
                </Item>
              </List>
              <P>
                To exercise any of these rights, contact us at the email address above. If you
                believe we haven&rsquo;t handled your data properly, you also have the right to
                lodge a complaint with the Finnish Data Protection Ombudsman
                (Tietosuojavaltuutetun toimisto),{" "}
                <a
                  href="https://tietosuoja.fi"
                  className="text-teal underline underline-offset-2 hover:text-fg-1"
                >
                  tietosuoja.fi
                </a>
                .
              </P>
            </Section>

            <Section heading="6. Children">
              <P>
                Sponta is not intended for children under 13. We do not knowingly collect
                personal data from children under this age.
              </P>
            </Section>

            <Section heading="7. Changes to this policy">
              <P>
                We may update this policy as the app develops. We&rsquo;ll update the
                &ldquo;Last updated&rdquo; date above when we do. Material changes will be
                communicated in-app.
              </P>
            </Section>

            <Section heading="8. Contact">
              <address className="font-body text-base not-italic leading-relaxed text-fg-2">
                Material Ops Oy
                <br />
                Y-tunnus: 3587294-1
                <br />
                {CONTACT.address}
                <br />
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="text-teal underline underline-offset-2 hover:text-fg-1"
                >
                  {CONTACT.email}
                </a>
                <br />
                <a
                  href={`tel:${CONTACT.phoneHref}`}
                  className="text-teal underline underline-offset-2 hover:text-fg-1"
                >
                  {CONTACT.phone}
                </a>
              </address>
            </Section>
          </article>
        </div>
      </div>

      <Footer />
    </main>
  );
}
