import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getDocument } from "@/lib/documents/actions";
import DocumentPageClient from "@/components/editor/DocumentPageClient";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const document = await getDocument(id);
  if (!document) notFound();

  return (
    <DocumentPageClient
      document={document}
      currentUser={{ id: user.id, email: user.email ?? "" }}
    />
  );
}
