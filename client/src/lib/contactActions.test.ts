import { describe, expect, it } from "vitest";
import {
  phoneContacts,
  phoneHref,
  publicServiceContacts,
} from "./contactActions";

describe("ações de contato", () => {
  it("supports freephone and national service numbers", () => {
    expect(phoneHref("0800 062 0196")).toBe("tel:08000620196");
    expect(phoneHref("180")).toBe("tel:180");
    expect(phoneHref("4000-1515")).toBe("tel:40001515");
    expect(phoneHref("+55 (61) 99306-3637")).toBe("tel:61993063637");
  });
  it("separates alternative and department numbers", () => {
    expect(
      phoneContacts(
        "(61) 99303-3717",
        "ITBI: (61) 92005-3453 · Nota Fiscal/ISS: (61) 99305-7551"
      ).map(item => [item.label, item.href])
    ).toEqual([
      ["", "tel:61993033717"],
      ["ITBI", "tel:61920053453"],
      ["Nota Fiscal/ISS", "tel:61993057551"],
    ]);
    expect(phoneContacts("190 / 193").map(item => item.href)).toEqual([
      "tel:190",
      "tel:193",
    ]);
  });
  it("opens WhatsApp-only departments in the published channel", () => {
    const contacts = publicServiceContacts({
      phone: "(61) 99303-3717",
      extraPhone: "ITBI: (61) 92005-3453 · Nota Fiscal/ISS: (61) 99305-7551",
      whatsappOnly: ["(61) 92005-3453", "(61) 99305-7551"],
    });
    expect(contacts.map(item => item.href)).toEqual([
      "tel:61993033717",
      "https://wa.me/5561920053453",
      "https://wa.me/5561993057551",
    ]);
    expect(contacts.map(item => item.channel)).toEqual([
      "phone",
      "whatsapp",
      "whatsapp",
    ]);
  });
  it("ignores missing, invalid and duplicated contacts", () => {
    expect(
      phoneContacts(undefined, "sem telefone", "190 / 190").map(
        item => item.href
      )
    ).toEqual(["tel:190"]);
    expect(phoneHref("190 · 193")).toBe("tel:190");
  });
});
