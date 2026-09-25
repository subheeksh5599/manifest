import { redirect } from "next/navigation";

/** The reading tape is part of the transactions screen now, beside the pasted-signature lookup. */
export default function Old() {
  redirect("/tx");
}
