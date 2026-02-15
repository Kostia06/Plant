"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function Navbar() {
    const { user, signOut } = useAuth();

    return (
        <nav className="navbar">
            <Link href="/" className="navbar-brand">
                🌳 Yggdrasil
            </Link>
            <div className="navbar-links">
                <Link href="/leaderboard">Leaderboard</Link>
                {user ? (
                    <>
                        <Link href={`/profile/${user.id}`}>Profile</Link>
                        <button onClick={signOut} className="navbar-btn">
                            Logout
                        </button>
                    </>
                ) : (
                    <Link href="/login">Login</Link>
                )}
            </div>
        </nav>
    );
}
