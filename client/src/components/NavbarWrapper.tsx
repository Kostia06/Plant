"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

const HIDE_NAV_ROUTES = ["/login"];

export default function NavbarWrapper() {
    const pathname = usePathname();
    const hidden = HIDE_NAV_ROUTES.some((r) => pathname.startsWith(r));
    if (hidden) return null;
    return <Navbar />;
}
