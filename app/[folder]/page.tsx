import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FOLDERS } from "@/lib/tools";

export const dynamicParams = false;
export function generateStaticParams() {
  return FOLDERS.map((f) => ({ folder: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ folder: string }> }): Promise<Metadata> {
  const { folder } = await params;
  const f = FOLDERS.find((x) => x.slug === folder);
  return { title: f ? `${f.name} — Critical Business School Tools` : "Tools — Critical Business School", description: f?.about };
}

export default async function FolderPage({ params }: { params: Promise<{ folder: string }> }) {
  const { folder } = await params;
  const f = FOLDERS.find((x) => x.slug === folder);
  if (!f) notFound();
  return (
    <div className="mat mat-narrow">
      <main className="index">
        <a className="back" href="/">All tools</a>
        <h1 className="index-title">{f.name}</h1>
        <p className="index-lede">{f.about}</p>
        <ul className="index-list">
          {f.tools.map((t) => (
            <li key={t.href}>
              <a className="index-row" href={t.href} {...(t.external ? { target: "_blank", rel: "noreferrer" } : {})}>
                <span className="index-name">{t.name}</span>
                <span className="index-kind">{t.from ? `${t.kind} · ${t.from}` : t.kind}</span>
                <span className="index-about">{t.about}</span>
                <span className="index-open">{t.download ? "Preview and download" : t.external ? "Open in a new tab" : "Open the tool"}</span>
              </a>
            </li>
          ))}
        </ul>
        {f.more && (
          <p className="folder-more">
            More about this: <a className="link" href={f.more.href}>{f.more.label}</a>
          </p>
        )}
      </main>
    </div>
  );
}
