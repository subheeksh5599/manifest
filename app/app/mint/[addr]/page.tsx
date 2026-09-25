import { redirect } from "next/navigation";

/** A mint page and the analyzer are the same read, so this keeps the address and moves on. */
export default async function MintPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  redirect(`/analyze?mint=${encodeURIComponent(addr)}`);
}
