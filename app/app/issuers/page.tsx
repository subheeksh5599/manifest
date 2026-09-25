import { redirect } from "next/navigation";

/** The issuer board is the assets screen now: the same mints, read live, with a price series each. */
export default function Old() {
  redirect("/assets");
}
