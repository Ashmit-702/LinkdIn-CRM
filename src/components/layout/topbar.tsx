"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <Button variant="secondary" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
        Sign out
      </Button>
    </header>
  );
}
