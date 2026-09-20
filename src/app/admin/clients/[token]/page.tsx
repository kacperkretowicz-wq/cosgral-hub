import { redirect } from "next/navigation";

export default function LegacyClientPortalRemoved() {
  redirect("/admin/klienci");
}
