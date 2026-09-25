import { redirect } from "next/navigation";

/**
 * The claims and their commands now live behind the runner that produces them,
 * rather than on a page of prose that repeats what the run already shows.
 */
export default function EvidencePage() {
  redirect("/verify");
}
