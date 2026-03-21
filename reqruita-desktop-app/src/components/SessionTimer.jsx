import React, { useEffect, useState } from "react";

/**
 * SessionTimer Component
 * Displays elapsed time from timerStartedAt timestamp
 * Updates every second while interview is active
 */
export default function SessionTimer({ timerStartedAt, isActive = true }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!timerStartedAt || !isActive) return;

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
    }, [timerStartedAt, isActive]);

    // Format seconds to MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    if (!timerStartedAt || !isActive) {
        return null;
    }

    return (
        <div style={timerContainerStyle}>
            <div style={timerLabelStyle}>Session Time</div>
            <div style={timerDisplayStyle}>{formatTime(elapsed)}</div>
        </div>
    );
}

const timerContainerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 16px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "8px",
    minWidth: "100px",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
};

const timerLabelStyle = {
    fontSize: "11px",
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.75)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
};

const timerDisplayStyle = {
    fontSize: "24px",
    fontWeight: "700",
    color: "#ffffff",
    fontFamily: "monospace",
};
