"use client";

import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", key: "session", icon: "bolt", label: "Current Session" },
  { href: "/history", key: "history", icon: "history", label: "Topic History" },
  { href: "/flashcards", key: "flashcards", icon: "style", label: "Flashcards" },
];

function NavLink({ item, activePage, onClick }) {
  return (
    <a
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all ${
        activePage === item.key
          ? "text-primary bg-lime-glow border-r-2 border-primary-fixed"
          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
      }`}
    >
      <span className="material-symbols-outlined">{item.icon}</span>
      <span className="font-body-md">{item.label}</span>
    </a>
  );
}

export default function Shell({ activePage, activeTopic, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* TopAppBar - visible at all widths */}
      <header className="fixed top-0 w-full z-50 bg-glass-bg backdrop-blur-md border-b border-slate-600">
        <div className="flex justify-between items-center px-page-padding-x h-16 w-fulljustify-between">
          <span className="font-headline-md text-headline-md font-bold text-primary">
            StudyAgent AI
          </span>
          {/* Menu button - only shown below the lg breakpoint, where the sidebar is hidden */}
          <button
            className="lg:hidden text-on-surface-variant"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined">{mobileOpen ? "close" : "menu"}</span>
          </button>
        </div>

        {/* Mobile dropdown menu - same links as the desktop sidebar */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-600 bg-surface-container-low px-4 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.key}
                item={item}
                activePage={activePage}
                onClick={() => setMobileOpen(false)}
              />
            ))}
            <a
              href="/"
              className="w-full py-3 mt-2 bg-primary-fixed text-on-primary-fixed font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              New Research Topic
            </a>
          </div>
        )}
      </header>

      {/* SideNavBar - desktop only (lg and up) */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low border-r border-slate-600 hidden lg:flex flex-col py-6 px-4 gap-y-4 z-40">
        <div className="mb-8 pt-16">
          <h2 className="font-headline-md text-headline-md text-primary px-2">Research Lab</h2>
          {activeTopic && (
            <p className="text-xs text-on-surface-variant px-2 mt-1">
              Active session: <span className="text-primary-fixed-dim">{activeTopic}</span>
            </p>
          )}
        </div>
        <nav className="flex-grow space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.key} item={item} activePage={activePage} />
          ))}
        </nav>
        <a
          href="/"
          className="w-full py-4 bg-primary-fixed text-on-primary-fixed font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-[0.98] transition-transform shadow-lg shadow-primary-fixed-dim/20 mt-4"
        >
          <span className="material-symbols-outlined">add</span>
          New Research Topic
        </a>
      </aside>

      <main className="pt-page-padding-top lg:pl-64 min-h-screen">
        <div className="max-w-container-max mx-auto px-page-padding-x pb-24">{children}</div>
      </main>
    </>
  );
}
