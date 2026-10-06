import React from "react";

// Header and footer copied from criticalbusinessschool.com (Ghost theme "cbs"), so the tools
// read as the Library section of the main site.
const CBS = "https://www.criticalbusinessschool.com";

export function SiteHeader() {
  return (
    <>
      <header className="site">
        <div className="header-inner">
          <div className="hd-row">
            <div className="hd-id">
              <p className="brand">
                <a href={CBS}>Critical Business School</a>
              </p>
              <p className="loc">New York City</p>
            </div>
            <div className="hd-actions">
              <a className="hd-teams" href="https://in-process.net" target="_blank" rel="noopener">
                1:1 Coaching
              </a>
              <a className="hd-btn" href={`${CBS}/#/portal/signup`}>
                Subscribe
              </a>
            </div>
          </div>
          <div className="hd-row hd-row--nav">
            <nav className="hd-tabs" aria-label="Main">
              <a href={`${CBS}/about/`}>Program</a>
              <a href={`${CBS}/events/`}>Events</a>
              <a href={`${CBS}/read/`}>Writing</a>
              <a href={`${CBS}/library/`} aria-current="page">
                Library
              </a>
              <a href={`${CBS}/ai-literacy-for-teams/`}>Teams</a>
            </nav>
            <form className="hd-search" action={`${CBS}/read/`} method="get" role="search">
              <label htmlFor="hd-q" className="hd-search-ico">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m20 20-4.8-4.8" />
                </svg>
              </label>
              <input id="hd-q" type="search" name="q" placeholder="Search" aria-label="Search the writing" autoComplete="off" />
            </form>
          </div>
        </div>
      </header>
      <nav className="subnav" aria-label="Library">
        <a href={`${CBS}/library/`}>Reading room</a>
        <a href={`${CBS}/moodboard/`}>Visual library</a>
        <a href={`${CBS}/prompts/`}>Prompts</a>
        <a href="/" aria-current="page">
          Tools
        </a>
      </nav>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="foot-top">
        <div className="foot-intro">
          <a className="foot-brand" href={CBS}>
            Critical Business School
          </a>
          <p className="foot-lede">A design and leadership program, in person and online, based in New York City.</p>
          <a className="foot-cta" href={`${CBS}/#/portal/signup`}>
            Subscribe <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="foot-cols">
          <nav className="foot-group" aria-label="School">
            <div className="foot-h">School</div>
            <a href={`${CBS}/about/`}>Program</a>
            <a href={`${CBS}/events/`}>Events</a>
            <a href={`${CBS}/meetups/`}>Meetups</a>
            <a href={`${CBS}/ai-literacy-for-teams/`}>For teams</a>
            <a href={`${CBS}/cbs-store/`}>Store</a>
          </nav>
          <nav className="foot-group" aria-label="Writing">
            <div className="foot-h">Writing</div>
            <a href={`${CBS}/read/`}>All writing</a>
            <a href={`${CBS}/tag/ai-literacy/`}>AI Literacy</a>
            <a href={`${CBS}/tag/how-to-find/`}>How to Find</a>
            <a href={`${CBS}/podcast/`}>Podcast</a>
            <a href={`${CBS}/rss/`}>RSS</a>
          </nav>
          <nav className="foot-group" aria-label="Library">
            <div className="foot-h">Library</div>
            <a href={`${CBS}/library/`}>Reading room</a>
            <a href={`${CBS}/moodboard/`}>Visual library</a>
            <a href={`${CBS}/prompts/`}>Prompts</a>
            <a href="/">Tools</a>
          </nav>
          <nav className="foot-group" aria-label="Contact">
            <div className="foot-h">Contact</div>
            <a href={`${CBS}/#contact`}>Email</a>
            <a href="https://www.linkedin.com/company/criticalbusinessschool/" target="_blank" rel="noopener">
              LinkedIn
            </a>
            <a href="https://in-process.net" target="_blank" rel="noopener">
              1:1 Coaching
            </a>
            <a href="https://www.instagram.com/nitzan.hermon/" target="_blank" rel="noopener">
              Instagram
            </a>
          </nav>
        </div>
      </div>
      <div className="foot-bottom">
        <span>&copy; 2026 Critical Business School</span>
        <a href={`${CBS}/privacy/`}>Privacy</a>
        <a href={`${CBS}/about/`}>About</a>
        <a className="foot-top-link" href="#top">
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </div>
    </footer>
  );
}
