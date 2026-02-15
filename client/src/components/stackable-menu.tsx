"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU_ITEMS = [
  { href: "/settings", label: "Dashboard", icon: "🏠" },
  { href: "/settings/app-lock", label: "App Lock", icon: "🔒" },
  { href: "/settings/screen-time", label: "Screen Time", icon: "📊" },
  { href: "/settings/lock-gate", label: "Lock Gate", icon: "🚪" },
  { href: "/settings/earn", label: "Earn", icon: "🌱" },
  { href: "/settings/progress", label: "Progress", icon: "📈" },
  { href: "/settings/analyze", label: "Analyze", icon: "🔍" },
  { href: "/settings/reflections", label: "Reflect", icon: "📝" },
  { href: "/settings/teasers", label: "Teasers", icon: "🧩" },
  { href: "/settings/friends", label: "Friends", icon: "👥" },
  { href: "/settings/profile", label: "Profile", icon: "👤" },
  { href: "/settings/settings", label: "Settings", icon: "⚙️" },
];

function isActive(pathname: string, href: string) {
  if (href === "/settings") return pathname === "/settings";
  return pathname.startsWith(href);
}

export function StackableMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="menu-toggle"
        aria-label="Open menu"
      >
        <span className="menu-bar" />
        <span className="menu-bar" />
        <span className="menu-bar" />
      </button>

      {isOpen && (
        <div className="menu-overlay" onClick={() => setIsOpen(false)}>
          <nav
            className="menu-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="menu-header">
              <span className="menu-brand">Mind Bloom</span>
              <button
                onClick={() => setIsOpen(false)}
                className="menu-close"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="menu-stack">
              {MENU_ITEMS.map(({ href, label, icon }, i) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`menu-item ${isActive(pathname, href) ? "menu-item--active" : ""}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="menu-icon">{icon}</span>
                  <span className="menu-label">{label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
