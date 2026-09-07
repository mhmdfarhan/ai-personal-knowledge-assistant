import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KnowledgeForm } from "@/components/knowledge-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Buat Knowledge" };

export default function NewKnowledgePage() {
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
          <CardTitle>Buat Knowledge Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <KnowledgeForm />
        </CardContent>
      </Card>
    </div>
  );
}
