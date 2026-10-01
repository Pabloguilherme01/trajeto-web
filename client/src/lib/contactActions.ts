/** Public directories sometimes list alternatives separated by a slash. */
export function phoneHref(phone?: string) {
  const digits = phone?.split("/")[0].replace(/\D/g, "") ?? "";
  return [3, 10, 11].includes(digits.length) ? "tel:" + digits : null;
}
