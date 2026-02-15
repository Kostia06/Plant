"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isSignUp) {
                const { error: err } = await supabase.auth.signUp({ email, password });
                if (err) throw err;
            } else {
                const { error: err } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (err) throw err;
            }
            router.push("/settings");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">MindBloom</h1>
                <p className="auth-subtitle">
                    {isSignUp ? "Create your account" : "Welcome back, grower"}
                </p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input auth-input"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input auth-input"
                        required
                        minLength={6}
                    />

                    {error && <p className="error-text">{error}</p>}

                    <button
                        type="submit"
                        className="btn btn-primary auth-submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Loading..."
                            : isSignUp
                                ? "Sign Up"
                                : "Sign In"}
                    </button>
                </form>

                <button
                    className="btn-link auth-toggle"
                    onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError("");
                    }}
                >
                    {isSignUp
                        ? "Already have an account? Sign in"
                        : "Need an account? Sign up"}
                </button>
            </div>
        </div>
    );
}
