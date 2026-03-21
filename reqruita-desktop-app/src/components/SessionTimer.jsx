import React, { useEffect, useState } from "react";

/**
 * SessionTimer Component
 * Displays elapsed time from timerStartedAt timestamp
 * Updates every second while interview is active
 */
export default function SessionTimer({ timerStartedAt, isActive = true, compact = false }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!timerStartedAt) return;

        // Calculate initial elapsed time
        const calculateElapsed = () => {
            const startTime = new Date(timerStartedAt);
            const now = new Date();
            const diffMs = now - startTime;
            const seconds = Math.floor(diffMs / 1000);
            return seconds < 0 ? 0 : seconds;
        };

        setElapsed(calculateElapsed());

        // Update every second
        const interval = setInterval(() => {
            setElapsed(calculateElapsed());
        }, 1000);

        return () => clearInterval(interval);
    }, [timerStartedAt]);

    // Format seconds to MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    if (!timerStartedAt) {
        return null;
    }

    if (compact) {
        return (
            <div style={compactContainerStyle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15 15" />
                </svg>
                <span style={compactTimeStyle}>{formatTime(elapsed)}</span>
            </div>
        );
    }

    return (
        <div style={timerContainerStyle}>
            <div style={timerLabelStyle}>SESSION TIME</div>
            <div style={timerDisplayStyle}>{formatTime(elapsed)}</div>
        </div>
    );
}

const compactContainerStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    borderRadius: "14px",
    color: "#e5e7eb",
    background: "rgba(17, 24, 39, 0.85)",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    minWidth: "92px",
    justifyContent: "center",
};

const compactTimeStyle = {
    fontFamily: "monospace",
    fontSize: "14px",
    fontWeight: "700",
    letterSpacing: "0.4px",
    lineHeight: 1,
};

const timerContainerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 20px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "10px",
    minWidth: "110px",
    boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
    border: "1px solid rgba(255, 255, 255, 0.3)",
};

const timerLabelStyle = {
    fontSize: "10px",
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.85)",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: "6px",
};

const timerDisplayStyle = {
    fontSize: "32px",
    fontWeight: "900",
    color: "#ffffff",
    fontFamily: "monospace",
    letterSpacing: "2px",
    lineHeight: "1",
};
