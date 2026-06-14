import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMyDocuments, getSharedWithMe } from "@/lib/documents/actions";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [myDocs, sharedDocs] = await Promise.all([
    getMyDocuments(),
    getSharedWithMe(),
  ]);

  return (
    <DashboardClient
      user={{ id: user.id, email: user.email ?? "" }}
      myDocuments={myDocs}
      sharedDocuments={sharedDocs}
    />
  );
}
