"use client";

import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { SITE } from "@/lib/constants";

type Status = "idle" | "sending" | "sent" | "error";

const VENUE_TYPES = [
  "Lounas",
  "Brunssi",
  "Aamiainen",
  "À la carte",
  "Baari",
  "Tilanvuokraus",
  "Catering",
];

const LOUNASTAJA_OPTIONS = ["", "Kyllä", "En vielä", "En osaa sanoa"];

export function InterestForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [values, setValues] = useState({
    venueName: "",
    venueTypes: [] as string[],
    lounastaja: "",
    contactPerson: "",
    email: "",
  });

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleVenueType(type: string) {
    setValues((v) => {
      const has = v.venueTypes.includes(type);
      const venueTypes = has ? v.venueTypes.filter((t) => t !== type) : [...v.venueTypes, type];
      // Dropped "Lounas" — the Lounastaja sub-question no longer applies.
      const lounastaja = venueTypes.includes("Lounas") ? v.lounastaja : "";
      return { ...v, venueTypes, lounastaja };
    });
  }

  const servesLunch = values.venueTypes.includes("Lounas");

  function mailtoFallback() {
    const subject = encodeURIComponent(`Kiinnostus Spontaan — ${values.venueName || "venue"}`);
    const bodyLines = [
      `Yritys: ${values.venueName}`,
      `Tarjonta: ${values.venueTypes.join(", ") || "-"}`,
      servesLunch && values.lounastaja
        ? `Julkaiseeko lounaslistaa jo: ${values.lounastaja}`
        : "",
      `Yhteyshenkilö: ${values.contactPerson}`,
      `Sähköposti: ${values.email}`,
    ].filter(Boolean);
    const body = encodeURIComponent(bodyLines.join("\n"));
    return `mailto:${SITE.contactEmail}?subject=${subject}&body=${body}`;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    // No form service configured yet — fall back to a prefilled email so
    // outreach can go live before Doan/Khang wire up a real endpoint.
    if (!SITE.formEndpoint) {
      window.location.href = mailtoFallback();
      setStatus("sent");
      return;
    }

    try {
      const res = await fetch(SITE.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Submission failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <section id="ilmoittaudu" className="scroll-mt-8 px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-content">
          <SectionLabel>Liity mukaan</SectionLabel>
          <p className="font-display text-3xl font-bold text-orange sm:text-4xl">
            Kiitos — olemme yhteydessä.
          </p>
          <p className="mt-3 max-w-md font-body text-fg-2">
            Vahvistamme tiedot ja lähetämme kirjautumislinkin, kun paikkasi on valmis liittymään.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="ilmoittaudu" className="scroll-mt-8 px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-content">
        <SectionLabel>Liity mukaan</SectionLabel>
        <h2 className="font-display text-3xl font-bold leading-tight text-fg-1 sm:text-4xl">
          Ilmoita kiinnostuksesi
        </h2>
        <p className="mt-3 max-w-md font-body text-fg-2">
          Alle 60 sekuntia. Vahvistamme paikan ja lähetämme kutsun sähköpostiisi.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <Field
            label="Yrityksen nimi"
            htmlFor="venueName"
            required
            value={values.venueName}
            onChange={(v) => update("venueName", v)}
            autoComplete="organization"
          />

          <div>
            <span className="mb-2 block font-body text-sm text-fg-2">
              Minkälainen paikka on kyseessä?{" "}
              <span className="text-fg-3">(valitse kaikki sopivat)</span>
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Minkälainen paikka on kyseessä?">
              {VENUE_TYPES.map((type) => {
                const selected = values.venueTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleVenueType(type)}
                    className={
                      "pressable rounded-pill border px-4 py-2 font-body text-sm transition-colors " +
                      (selected
                        ? "border-orange bg-orange text-bg-0"
                        : "border-white/10 bg-bg-3 text-fg-2 hover:bg-bg-4")
                    }
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            {servesLunch && (
              <div className="mt-4 rounded-xl border border-white/10 bg-bg-2 p-4">
                <label htmlFor="lounastaja" className="mb-2 block font-body text-sm text-fg-2">
                  Julkaisetko lounaslistaasi jo jossain, esim. Lounastajassa?{" "}
                  <span className="text-fg-3">(valinnainen)</span>
                </label>
                <select
                  id="lounastaja"
                  value={values.lounastaja}
                  onChange={(e) => update("lounastaja", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-bg-3 px-4 py-3 font-body text-fg-1 focus:border-orange"
                >
                  {LOUNASTAJA_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt || "Valitse…"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <Field
            label="Yhteyshenkilö"
            htmlFor="contactPerson"
            required
            value={values.contactPerson}
            onChange={(v) => update("contactPerson", v)}
            autoComplete="name"
          />
          <Field
            label="Sähköposti"
            htmlFor="email"
            type="email"
            required
            value={values.email}
            onChange={(v) => update("email", v)}
            autoComplete="email"
          />

          <button
            type="submit"
            disabled={status === "sending"}
            className="pressable inline-flex w-full items-center justify-center gap-2 rounded-pill bg-orange px-7 py-4 font-display text-lg font-bold text-bg-0 shadow-glow-orange transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
          >
            {status === "sending" ? "Lähetetään…" : "Lähetä"}
            {status !== "sending" && <ArrowRight size={20} strokeWidth={2.5} aria-hidden />}
          </button>

          {status === "error" && (
            <p className="font-body text-sm text-red">
              Lähetys ei onnistunut juuri nyt.{" "}
              <a href={mailtoFallback()} className="underline underline-offset-2">
                Lähetä tiedot sähköpostilla
              </a>{" "}
              sen sijaan.
            </p>
          )}

          <p className="font-body text-xs leading-relaxed text-fg-3">
            Rekisterinpitäjä on {SITE.companyName} (Y-tunnus {SITE.businessId}). Tietoja
            käytetään ainoastaan yhteydenottoon Sponta-yhteistyöstä. Voit pyytää tietojen
            poistamista milloin vain osoitteesta{" "}
            <a href={`mailto:${SITE.contactEmail}`} className="underline underline-offset-2">
              {SITE.contactEmail}
            </a>
            .
          </p>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  htmlFor: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block font-body text-sm text-fg-2">
        {label}
        {required && <span className="text-orange"> *</span>}
      </label>
      <input
        id={htmlFor}
        name={htmlFor}
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-bg-3 px-4 py-3 font-body text-fg-1 placeholder:text-fg-3 focus:border-orange"
      />
    </div>
  );
}
