const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SplitContact = { kind: "email"; email: string } | { kind: "phone"; phone: string };

export function splitContactInput(contact: string): SplitContact | null {
  const t = contact.trim();
  if (!t) {
    return null;
  }
  if (t.includes("@")) {
    const email = t.toLowerCase();
    return emailRx.test(email) ? { kind: "email", email } : null;
  }
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 9 && digits.length <= 15) {
    return { kind: "phone", phone: digits };
  }
  return null;
}
