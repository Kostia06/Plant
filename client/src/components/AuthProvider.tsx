"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user) ensureProfile(session.user);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) ensureProfile(session.user);
        });

        return () => subscription.unsubscribe();
    }, []);

    async function ensureProfile(u: User) {
        const { data } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", u.id)
            .single();
        if (!data) {
            await supabase.from("profiles").insert({
                id: u.id,
                display_name: u.email?.split("@")[0] ?? "Anon",
            });
        }
    }

    async function signOut() {
        await supabase.auth.signOut();
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
