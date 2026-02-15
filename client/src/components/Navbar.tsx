"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--deep-forest)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}

function TrophyIcon({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--deep-forest)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}

function UsersIcon({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--deep-forest)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function UserIcon({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--deep-forest)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

const NAV_ITEMS = [
    { href: "/settings", icon: HomeIcon, label: "Home" },
    { href: "/leaderboard", icon: TrophyIcon, label: "Board" },
    { href: "/friends", icon: UsersIcon, label: "Friends" },
    { href: "/profile/me", icon: UserIcon, label: "Profile" },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="nav-bar">
            {NAV_ITEMS.map((item) => {
                const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/") ||
                    (item.href === "/friends" && pathname.startsWith("/circles"));
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${isActive ? "nav-item--active" : ""}`}
                    >
                        <span className="nav-icon"><Icon active={isActive} /></span>
                        <span className="nav-label">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
