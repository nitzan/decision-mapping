import type { Metadata } from "next";
import { FOLDERS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Tools — Critical Business School",
  description: "Working tools from Critical Business School, a design and leadership program in New York City and online.",
};

export default function Index() {
  return (
    <div className="mat mat-narrow">
      <main className="index">
        <h1 className="index-title">Tools</h1>
        <p className="index-lede">Methods and exercises from the program, made usable on their own.</p>
        <ul className="index-list">
          {FOLDERS.map((f) => (
            <li key={f.slug}>
              <a className="index-row" href={`/${f.slug}`}>
                <span className="index-name folder-name">{f.name}</span>
                <span className="index-kind">{f.tools.length === 1 ? "1 tool" : `${f.tools.length} tools`}</span>
                <span className="index-about">{f.about}</span>
                <span className="folder-contents">{f.tools.map((t) => t.name).join(", ")}</span>
                <span className="index-open">Open folder</span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
