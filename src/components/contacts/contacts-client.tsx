"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  leadStatus: string;
  tags: string[];
}

const EMPTY_FORM = { name: "", email: "", company: "", jobTitle: "", linkedinUrl: "" };

export function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load(query = "") {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts${query ? `?search=${encodeURIComponent(query)}` : ""}`);
      const data = await res.json();
      setContacts(data.contacts ?? []);
    } catch {
      toast.error("Couldn't load contacts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Could not create contact.");
      }
      toast.success("Contact created.");
      setForm(EMPTY_FORM);
      setShowForm(false);
      load(search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    toast.success("Contact deleted.");
    load(search);
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            load(e.target.value);
          }}
          className="max-w-xs"
        />
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "Add contact"}</Button>
      </div>

      {showForm && (
        <Card className="p-5">
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input placeholder="Job title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            <Input
              placeholder="LinkedIn profile URL"
              className="md:col-span-2"
              value={form.linkedinUrl}
              onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
            />
            <div className="md:col-span-2">
              <Button type="submit">Save contact</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">LinkedIn</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={5}>Loading…</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={5}>No contacts yet — add your first one above.</td></tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.jobTitle}</div>
                  </td>
                  <td className="px-4 py-3">{c.company ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.linkedinUrl ? (
                      <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="text-[hsl(var(--accent))] hover:underline">
                        View profile
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.leadStatus} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>Delete</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
