import { apiEndpoints } from "@/lib/api/endpoints";
import { deleteJson, getJson, postJson } from "@/lib/api/http";
import type { InteractionContact } from "@/types/interaction-contact";

export function interactionContactsQueryKey(interactionId: string) {
  return ["interactions", "contacts", interactionId] as const;
}

export function getInteractionContacts(interactionId: string) {
  return getJson<InteractionContact[]>(
    apiEndpoints.interactions.interactions.contacts(interactionId),
  );
}

export function linkInteractionContact(
  interactionId: string,
  contactId: string,
  csrfToken: string,
) {
  return postJson<InteractionContact>(
    apiEndpoints.interactions.interactions.contacts(interactionId),
    { contact_person: contactId },
    csrfToken,
  );
}

export function unlinkInteractionContact(
  interactionId: string,
  contactId: string,
  csrfToken: string,
) {
  return deleteJson(
    apiEndpoints.interactions.interactions.contact(interactionId, contactId),
    csrfToken,
  );
}
