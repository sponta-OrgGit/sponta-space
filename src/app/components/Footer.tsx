import { SITE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-ink-line bg-ink-raised/40 px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-content flex-col gap-2 font-mono text-xs text-mist sm:flex-row sm:items-center sm:justify-between">
        <p>
          {SITE.companyName} · Y-tunnus {SITE.businessId}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <a href={`mailto:${SITE.contactEmail}`} className="underline-offset-2 hover:underline">
            {SITE.contactEmail}
          </a>
          <a href="#ilmoittaudu" className="underline-offset-2 hover:underline">
            Ilmoita kiinnostuksesi
          </a>
        </div>
      </div>
    </footer>
  );
}
