import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FOLDERS } from "@/lib/tools";
import EmailGate from "@/components/EmailGate";

export const dynamicParams = false;
export function generateStaticParams() {
  return FOLDERS.flatMap((f) => f.tools.filter((t) => t.download && t.slug).map((t) => ({ folder: f.slug, tool: t.slug as string })));
}

function find(folder: string, tool: string) {
  const f = FOLDERS.find((x) => x.slug === folder);
  const t = f?.tools.find((x) => x.slug === tool && x.download);
  return f && t ? { f, t } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ folder: string; tool: string }> }): Promise<Metadata> {
  const { folder, tool } = await params;
  const hit = find(folder, tool);
  return hit ? { title: `${hit.t.name} — Critical Business School Tools`, description: hit.t.about } : {};
}

export default async function ToolPage({ params }: { params: Promise<{ folder: string; tool: string }> }) {
  const { folder, tool } = await params;
  const hit = find(folder, tool);
  if (!hit) notFound();
  const { f, t } = hit;
  return (
    <div className="mat mat-narrow">
      <main className="sheet-page">
        <div className="sheet-copy">
          <a className="back" href={`/${f.slug}`}>{f.name}</a>
          <h1 className="index-title">{t.name}</h1>
          <div className="index-kind">{t.kind}</div>
          <p className="index-lede sheet-about">{t.about}</p>
          <EmailGate file={t.file as string} name={t.name} />
        </div>
        <figure className="sheet-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.preview} alt={`Preview of the ${t.name} worksheet`} width={935} height={1210} />
          <figcaption>Letter size, one page. Print and fill in by hand.</figcaption>
        </figure>
      </main>
    </div>
  );
}
