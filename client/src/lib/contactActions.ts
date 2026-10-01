/** Public directories sometimes list alternatives separated by a slash. */
export function phoneHref(phone?: string) {
  let digits = phone?.split(/[\/·]/)[0].replace(/\D/g, "") ?? "";
  if ([12, 13].includes(digits.length) && digits.startsWith("55")) digits = digits.slice(2);
  return [3, 8, 10, 11].includes(digits.length) ? "tel:" + digits : null;
}

export function phoneContacts(...values: Array<string | undefined>) {
  const contacts: Array<{ label: string; number: string; href: string }> = [];
  for (const value of values) {
    for (const part of value?.split(/·|\/(?=\s*(?:\+?\d|\(\d))/) ?? []) {
      const number = part.match(/\+?(?:\(\d{2}\)|\d)[\d\s()-]*\d/)?.[0].trim();
      const href = phoneHref(number);
      if (!number || !href || contacts.some(contact => contact.href === href)) continue;
      const label = part.replace(number, "").replace(/[:\s]+$/, "").trim();
      contacts.push({ label, number, href });
    }
  }
  return contacts;
}
