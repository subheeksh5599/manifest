import { redirect } from "next/navigation";

/** The checks live on the proof screen, where they run in the browser rather than describing a run. */
export default function Old() {
  redirect("/proof");
}
