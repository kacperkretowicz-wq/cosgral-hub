import { redirect } from "next/navigation";

/** Leady zwinęte do inboxu na Home. */
export default function LeadyRedirect() {
  redirect("/admin#leads");
}
