import { redirect } from "next/navigation";

/** The desk's exit pricing is the settlement screen now, so an old link lands on the live one. */
export default function Old() {
  redirect("/settle");
}
