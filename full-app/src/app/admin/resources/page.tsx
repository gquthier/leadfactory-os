import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase-server";
import { TeamResourcesReader } from "./TeamResourcesReader";

export default async function AdminResourcesPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, is_active, is_super_admin")
    .eq("id", session.user.id)
    .single();

  if (profile?.role !== "admin") redirect("/client/overview");
  if (!profile?.is_active) redirect("/login?disabled=1");

  const canManage = profile.is_super_admin === true;
  const {data: members} = canManage
    ? await admin.from("profiles").select("id, full_name, email").eq("role", "admin").eq("is_active", true).order("full_name")
    : {data: []};

  return <TeamResourcesReader canManage={canManage} members={members ?? []} />;
}
