import { publicServiceContacts } from "./contactActions";
import type { PublicService } from "./publicServices";

// The official public-service directory is immutable between snapshot loads.
// A single contact lookup is shared by contact filters and rendered cards, so
// switching categories, expanding a card or favoriting it cannot reparse all
// the same phone numbers and WhatsApp-only department channels.
type ContactList = ReturnType<typeof publicServiceContacts>;
const contactsByService = new WeakMap<PublicService, ContactList>();

export function cachedPublicServiceContacts(service: PublicService): Readonly<ContactList> {
  let contacts = contactsByService.get(service);
  if (!contacts) {
    contacts = publicServiceContacts(service);
    contactsByService.set(service, contacts);
  }
  return contacts;
}

export function publicServiceHasContacts(service: PublicService) {
  return cachedPublicServiceContacts(service).length > 0;
}
