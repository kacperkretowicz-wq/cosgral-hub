import { redirect } from "next/navigation";

/** Oferty automatyczne wyłączone — przyszła zakładka statusów. */
export default function GeneratorRemoved() {
  redirect("/admin");
}
