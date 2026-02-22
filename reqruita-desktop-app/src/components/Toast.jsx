import React, { useEffect, useState } from "react";

/* ---- Icon SVGs ---- */
const ICONS = {
    success: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    ),
    error: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    ),
    warning: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    info: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
};

/* ---- Color palette per type ---- */
const COLORS = {
    success: { bg: "rgba(16,185,129,0.14)", border: "rgba(16,185,129,0.35)", text: "#34d399", icon: "#10b981" },
    error: { bg: "rgba(239,68,68,0.14)", border: "rgba(239,68,68,0.35)", text: "#fca5a5", icon: "#ef4444" },
    warning: { bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.35)", text: "#fcd34d", icon: "#f59e0b" },
    info: { bg: "rgba(99,102,241,0.14)", border: "rgba(99,102,241,0.35)", text: "#a5b4fc", icon: "#6366f1" },
};

/* ---- Single toast item ---- */
function ToastItem({ toast, onRemove }) {
    const [visible, setVisible] = useState(false);
    const c = COLORS[toast.type] || COLORS.info;

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
    }, []);

    function dismiss() {
        setVisible(false);
        setTimeout(() => onRemove(toast.id), 220);
    }

    return (
        <div
            className="rq-toast"
            style={{
                background: c.bg,
                borderColor: c.border,
                opacity: visible ? 1 : 0,
                transform: visible ? "translateX(0)" : "translateX(120%)",
            }}
            onClick={dismiss}
        >
            <span style={{ color: c.icon, flexShrink: 0, display: "flex" }}>
                {ICONS[toast.type] || ICONS.info}
            </span>
            <span style={{ color: c.text }}>{toast.message}</span>
        </div>
    );
}

/* ---- Toast container (fixed top-right) ---- */
export default function ToastContainer({ toasts, removeToast }) {
    if (!toasts.length) return null;

    return (
        <div className="rq-toast-wrap">
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onRemove={removeToast} />
            ))}
        </div>
    );
}
