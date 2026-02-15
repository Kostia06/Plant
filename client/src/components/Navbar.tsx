"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
    { href: "/settings", icon: "🏠", label: "Home" },
    { href: "/leaderboard", icon: "🏆", label: "Board" },
    { href: "/friends", icon: "👥", label: "Friends" },
    { href: "/profile/me", icon: "👤", label: "Profile" },
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
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${isActive ? "nav-item--active" : ""}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
