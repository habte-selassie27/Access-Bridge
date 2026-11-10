import { Mail, Phone, MapPin, Globe, User, Building2, HelpCircle } from "lucide-react";
import type { Contact } from "../../lib/api/types.ts";

export interface ContactsCardProps {
  contacts: Contact[];
}

const ICONS: Record<Contact["kind"], typeof Mail> = {
  email: Mail,
  phone: Phone,
  address: MapPin,
  website: Globe,
  person: User,
  organization: Building2,
  other: HelpCircle,
};

const LABELS: Record<Contact["kind"], string> = {
  email: "Email",
  phone: "Phone",
  address: "Address",
  website: "Website",
  person: "Person",
  organization: "Organisation",
  other: "Contact",
};

/**
 * Who to ask.
 *
 * Phone numbers, email addresses and websites are found by looking at the
 * document itself, so a wrong digit cannot slip through. Names and
 * organisations are only shown when the text they came from is in the
 * document too.
 */
export function ContactsCard({ contacts }: ContactsCardProps) {
  if (!contacts || contacts.length === 0) return null;
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-1 text-base font-semibold text-text">Who to ask</h2>
      <p className="mb-3 text-[0.8rem] text-subtle">
        Every detail below was found in your document.
      </p>
      <ul className="space-y-2">
        {contacts.map((contact, i) => {
          const Icon = ICONS[contact.kind] ?? HelpCircle;
          const isLink =
            contact.kind === "email"
              ? `mailto:${contact.value}`
              : contact.kind === "website"
                ? contact.value.startsWith("http")
                  ? contact.value
                  : `https://${contact.value}`
                : null;
          return (
            <li key={i} className="flex items-start gap-2 rounded-md border border-border bg-background p-3">
              <Icon size={16} className="mt-0.5 shrink-0 text-subtle" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[0.75rem] uppercase tracking-wide text-subtlest">
                  {LABELS[contact.kind] ?? contact.label}
                </p>
                {isLink ? (
                  <a
                    href={isLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="break-words text-sm font-medium text-link"
                  >
                    {contact.value}
                  </a>
                ) : (
                  <p className="break-words text-sm font-medium text-text">{contact.value}</p>
                )}
                {contact.label && contact.label !== LABELS[contact.kind] && (
                  <p className="text-[0.75rem] text-subtle">{contact.label}</p>
                )}
                {contact.quote && (
                  <p className="mt-1 border-l-2 border-border pl-2 text-[0.75rem] italic text-subtlest">
                    “{contact.quote}”
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
