// Single source of truth for the identity details that appear in the
// footer, the form's privacy note, and page metadata. Keep in sync with
// the business registry if any of this changes.
export const SITE = {
  name: "Sponta",
  url: "https://sponta.space",
  companyName: "Material Ops Oy",
  businessId: "3587294-1",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@sponta.space",
  // Points at a hosted form service (Formspree/Basin/Getform/a Sheet
  // webhook). Left unset, the interest form falls back to a prefilled
  // mailto: link so outreach can start before this is wired up.
  formEndpoint: process.env.NEXT_PUBLIC_FORM_ENDPOINT || "",
  loginUrl: "https://app.sponta.space/login",
} as const;
