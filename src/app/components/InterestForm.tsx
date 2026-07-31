"use client";

import { FormEvent, useState } from "react";
import { SectionLabel } from "./SectionLabel";
import { SITE } from "@/lib/constants";

type Status = "idle" | "sending" | "sent" | "error";

const LOUNASTAJA_OPTIONS = ["", "Kyllä", "En vielä", "En osaa sanoa"];

export function InterestForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [values, setValues] = useState({
    venueName: "",
    contactPerson: "",
    email: "",
    lounastaja: "",
  });

  function update<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function mailtoFallback() {
    const subject = encodeURIComponent(`Kiinnostus Spontaan — ${values.venueName || "venue"}`);
    const bodyLines = [
      `Yritys: ${values.venueName}`,
      `Yhteyshenkilö: ${values.contactPerson}`,
      `Sähköposti: ${values.email}`,
      values.lounastaja ? `Julkaiseeko lounaslistaa jo: ${values.lounastaja}` : "",
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
          <p className="font-display text-3xl font-bold uppercase text-flare sm:text-4xl">
            Kiitos — olemme yhteydessä.
          </p>
          <p className="mt-3 max-w-md font-body text-mist">
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
        <h2 className="font-display text-3xl font-bold uppercase leading-tight text-paper sm:text-4xl">
          Ilmoita kiinnostuksesi
        </h2>
        <p className="mt-3 max-w-md font-body text-mist">
          Alle 60 sekuntia. Vahvistamme paikan ja lähetämme kutsulinkin sähköpostiisi.
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

          <div>
            <label htmlFor="lounastaja" className="mb-2 block font-body text-sm text-mist">
              Julkaisetko lounaslistaasi jo jossain, esim. Lounastajassa?{" "}
              <span className="text-mist/70">(valinnainen)</span>
            </label>
            <select
              id="lounastaja"
              value={values.lounastaja}
              onChange={(e) => update("lounastaja", e.target.value)}
              className="w-full rounded-sm border border-ink-line bg-ink-raised px-4 py-3 font-body text-paper focus:border-flare"
            >
              {LOUNASTAJA_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt || "Valitse…"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-sm bg-flare px-6 py-4 font-display text-lg font-bold uppercase tracking-wide text-ink transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
          >
            {status === "sending" ? "Lähetetään…" : "Lähetä"}
          </button>

          {status === "error" && (
            <p className="font-body text-sm text-signal">
              Lähetys ei onnistunut juuri nyt.{" "}
              <a href={mailtoFallback()} className="underline underline-offset-2">
                Lähetä tiedot sähköpostilla
              </a>{" "}
              sen sijaan.
            </p>
          )}

          <p className="font-body text-xs leading-relaxed text-mist/80">
            Rekisterinpitäjä on {SITE.companyName} (Y-tunnus {SITE.businessId}). Tietoja
            käytetään ainoastaan yhteydenottoon Sponta-yhteistyöstä. Voit pyytää tietojen
            poistamista milloin tahansa osoitteesta{" "}
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
      <label htmlFor={htmlFor} className="mb-2 block font-body text-sm text-mist">
        {label}
        {required && <span className="text-flare"> *</span>}
      </label>
      <input
        id={htmlFor}
        name={htmlFor}
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-ink-line bg-ink-raised px-4 py-3 font-body text-paper placeholder:text-mist/50 focus:border-flare"
      />
    </div>
  );
}
