import React from "react";

export function ToolsHeader({ folder }: { folder?: { name: string } }) {
  return (
    <header className="top">
      <nav className="brand" aria-label="Breadcrumb">
        <a className="brand-title" href="https://www.criticalbusinessschool.com">Critical Business School</a>
        <a className="brand-sub" href="/">Tools</a>
        {folder && <span className="brand-sub crumb">{folder.name}</span>}
      </nav>
      <a className="byline" href="https://www.criticalbusinessschool.com">criticalbusinessschool.com</a>
    </header>
  );
}

export function ToolsFooter() {
  return (
    <footer className="foot">
      <a href="https://www.criticalbusinessschool.com">Critical Business School</a>
      <span>New York City and online</span>
    </footer>
  );
}
