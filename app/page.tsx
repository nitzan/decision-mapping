import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools — Critical Business School",
  description: "Working tools from Critical Business School, a design and leadership program in New York City and online.",
};

const TOOLS = [
  {
    href: "/decisions",
    name: "Seats at the Table",
    kind: "Decision journey mapping",
    about:
      "List what a decision touches, draw each part as a line between two values, set the balance you want to live within, and see where your options land. Take a snapshot whenever the camera moves.",
  },
];

export default function Index() {
  return (
    <div className="mat">
      <header className="top">
        <div className="brand">
          <a className="brand-title" href="https://www.criticalbusinessschool.com">Critical Business School</a>
          <span className="brand-sub">Tools</span>
        </div>
        <a className="byline" href="https://www.criticalbusinessschool.com">criticalbusinessschool.com</a>
      </header>

      <main className="index">
        <h1 className="index-title">Tools</h1>
        <p className="index-lede">Methods from the program, made usable on their own. Your work stays in your browser.</p>
        <ul className="index-list">
          {TOOLS.map((t) => (
            <li key={t.href}>
              <a className="index-row" href={t.href}>
                <span className="index-name">{t.name}</span>
                <span className="index-kind">{t.kind}</span>
                <span className="index-about">{t.about}</span>
                <span className="index-open">Open the tool</span>
              </a>
            </li>
          ))}
        </ul>
      </main>

      <footer className="foot">
        <a href="https://www.criticalbusinessschool.com">Critical Business School</a>
        <span>New York City and online</span>
      </footer>
    </div>
  );
}
