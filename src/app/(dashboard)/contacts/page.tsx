import { Topbar } from "@/components/layout/topbar";
import { ContactsClient } from "@/components/contacts/contacts-client";

export default function ContactsPage() {
  return (
    <div>
      <Topbar title="Contacts" />
      <ContactsClient />
    </div>
  );
}
