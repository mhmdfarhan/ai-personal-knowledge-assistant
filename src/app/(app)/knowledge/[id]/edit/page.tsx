import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { KnowledgeForm } from "@/components/knowledge-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Knowledge } from "@/types/database";

export const metadata = { title: "Edit Knowledge" };

export default async function EditKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("knowledge")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const knowledge = data as Knowledge | null;
  if (!knowledge) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/knowledge"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Knowledge
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit Knowledge</CardTitle>
        </CardHeader>
        <CardContent>
          <KnowledgeForm initial={knowledge} />
        </CardContent>
      </Card>
    </div>
  );
}
