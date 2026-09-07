import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Pengaturan</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Kelola profil dan preferensi akun kamu.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>
            Informasi dasar yang tampil di aplikasi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            fullName={profile?.full_name ?? ""}
            email={profile?.email ?? user.email ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
