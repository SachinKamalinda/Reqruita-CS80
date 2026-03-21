import React, { useEffect, useState } from "react";

/**
 * SessionTimer Component
 * Displays elapsed time from timerStartedAt timestamp
 * Updates every second while interview is active
 */
export default function SessionTimer({ timerStartedAt, isActive = true }) {
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

    return (
        <div style={timerContainerStyle}>
            <div style={timerLabelStyle}>SESSION TIME</div>
            <div style={timerDisplayStyle}>{formatTime(elapsed)}</div>
        </div>
    );
}

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
