import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PRODUCTS } from "@/lib/trade/cohort";

async function OpenAssistant({ searchParams }: PageProps<"/assistant">) {
  const { product } = await searchParams;
  const hs6 = typeof product === "string" && Object.hasOwn(PRODUCTS, product) ? product : "090111";
  return redirect(`/mulai/${hs6}?view=assistant`);
}

export default function AssistantPage(props: PageProps<"/assistant">) {
  return <Suspense fallback={<p role="status">Opening AI research…</p>}><OpenAssistant {...props} /></Suspense>;
}
