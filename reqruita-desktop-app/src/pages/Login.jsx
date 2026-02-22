import React, { useEffect, useState } from "react";
import "./auth-ui.css";

// Default credentials
const CREDS = {
    join: {
        email: "123",
        meetingId: "123",
        password: "123",
    },
    conduct: {
        email: "123",
        meetingId: "123",
        password: "123",
    },
};

export default function Login({ role, onBack, onSuccess, addToast }) {
    const [email, setEmail] = useState("");
    const [meetingId, setMeetingId] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [remember, setRemember] = useState(true);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    // Disable scrolling only on this screen
    useEffect(() => {
        document.body.classList.add("rq-noscr");
        return () => document.body.classList.remove("rq-noscr");
    }, []);

    async function submit(e) {
        e.preventDefault();
        setErr("");
        setLoading(true);

        // Simulate tiny network delay for feedback
        await new Promise((r) => setTimeout(r, 350));

        const r = CREDS[role];
        if (!r) {
            setErr("Unknown role.");
            setLoading(false);
            return;
        }

        const ok =
            email.trim().toLowerCase() === r.email.toLowerCase() &&
            meetingId.trim() === r.meetingId &&
            password === r.password;

        if (!ok) {
            setErr("Invalid credentials. Please check Email, Meeting ID, and Password.");
            setLoading(false);
            addToast?.("Login failed — check your credentials", "error");
            return;
        }

        setLoading(false);

        // Move to next stage (DeviceCheck)
        onSuccess?.({
            role,
            email: email.trim(),
            meetingId: meetingId.trim(),
            password: password.trim(),
            remember,
        });
    }

    const title = role === "join" ? "Join interview" : "Conduct interview";
    const subtitle =
        role === "join"
            ? "Enter your credentials to join the interview session"
            : "Sign in to start conducting interviews";

    return (
        <div className="lg-wrap">
            <div className="lg-card lg-fade-in">
                <h2 className="lg-title">{title}</h2>
                <p className="lg-subtitle">{subtitle}</p>

                <form onSubmit={submit}>
                    <div className="lg-field">
                        <label className="lg-label" htmlFor="rq-email">Email</label>
                        <input
                            id="rq-email"
                            className="lg-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={role === "join" ? "candidate@email.com" : "interviewer@company.com"}
                            autoComplete="username"
                        />
                    </div>

                    <div className="lg-field">
                        <label className="lg-label" htmlFor="rq-meeting">Meeting ID</label>
                        <input
                            id="rq-meeting"
                            className="lg-input"
                            value={meetingId}
                            onChange={(e) => setMeetingId(e.target.value)}
                            placeholder="e.g. abc-def-123"
                        />
                    </div>

                    <div className="lg-field">
                        <label className="lg-label" htmlFor="rq-password">Password</label>
                        <div className="lg-pwd-wrap">
                            <input
                                id="rq-password"
                                className="lg-input lg-input-pwd"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                type={showPwd ? "text" : "password"}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="lg-eye"
                                onClick={() => setShowPwd((v) => !v)}
                                tabIndex={-1}
                                aria-label={showPwd ? "Hide password" : "Show password"}
                            >
                                {showPwd ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="lg-row">
                        <label className="lg-check">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                            />
                            Remember me
                        </label>

                        <a className="lg-link" href="#" onClick={(e) => e.preventDefault()}>
                            Forgot Password?
                        </a>
                    </div>

                    {err && <div className="lg-err lg-shake">{err}</div>}

                    <button className="lg-primary" type="submit" disabled={loading}>
                        {loading ? (
                            <span className="lg-spinner" />
                        ) : (
                            role === "join" ? "Join Now" : "Start Session"
                        )}
                    </button>

                    {onBack && (
                        <button type="button" className="lg-back" onClick={onBack}>
                            ← Back to role selection
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
