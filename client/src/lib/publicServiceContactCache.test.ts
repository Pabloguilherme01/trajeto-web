import { expect, it } from "vitest";
import type { PublicService } from "./publicServices";
import { cachedPublicServiceContacts, publicServiceHasContacts } from "./publicServiceContactCache";
import { publicServiceContacts } from "./contactActions";

function service(phone?: string, extraPhone?: string, whatsappOnly?: string[]): PublicService {
  return {
    id: "teste",
    name: "Atendimento público",
    category: "cidadania",
    description: "Atendimento do município",
    phone, extraPhone, whatsappOnly,
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://www.aguaslindasdegoias.go.gov.br",
  };
}

it("keeps the exact public-service contact order, labels and channel URLs", () => {
  const official = service(
    "(61) 99303-3717",
    "ITBI: (61) 92005-3453 · Nota Fiscal/ISS: (61) 99305-7551",
    ["(61) 92005-3453", "(61) 99305-7551"],
  );
  const expected = publicServiceContacts(official);
  const first = cachedPublicServiceContacts(official);
  expect(first).toEqual(expected);
  expect(cachedPublicServiceContacts(official)).toBe(first);
  expect(publicServiceHasContacts(official)).toBe(true);
  expect(first.map(c => c.channel)).toEqual(["phone", "whatsapp", "whatsapp"]);
  expect(first.map(c => c.href)).toEqual([
    "tel:61993033717", "https://wa.me/5561920053453",
    "https://wa.me/5561993057551",
  ]);
});

it("does not reparse the same immutable service when a card or filter rerenders", () => {
  let reads = 0;
  const official = service("190 / 193");
  Object.defineProperty(official, "phone", {
    get: () => { reads++; return "190 / 193"; },
    enumerable: true,
  });
  expect(publicServiceHasContacts(official)).toBe(true);
  const afterFirst = reads;
  expect(afterFirst).toBeGreaterThan(0);
  expect(cachedPublicServiceContacts(official).map(c => c.href))
    .toEqual(["tel:190", "tel:193"]);
  expect(publicServiceHasContacts(official)).toBe(true);
  expect(reads).toBe(afterFirst);
});

it("isolates changed official snapshots rather than reusing a previous record", () => {
  const previous = service("192");
  const updated = { ...previous, phone: "193" };
  expect(cachedPublicServiceContacts(previous).map(c => c.href)).toEqual(["tel:192"]);
  expect(cachedPublicServiceContacts(updated).map(c => c.href)).toEqual(["tel:193"]);
  expect(cachedPublicServiceContacts(previous).map(c => c.href)).toEqual(["tel:192"]);
  expect(publicServiceHasContacts(service("sem telefone"))).toBe(false);
});
