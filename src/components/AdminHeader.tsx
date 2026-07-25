"use client";

import { Button } from "@/components/ui/Button";

export function AdminHeader() {
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <div className="mb-8 flex items-center justify-end">
      <Button variant="ghost" onClick={handleLogout}>
        Wyloguj
      </Button>
    </div>
  );
}
