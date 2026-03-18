import React from "react";
import "./ExternalDisplayWarning.css";

/**
 * ExternalDisplayWarning.jsx
 * 
 * Displays a prominent warning banner when external display is detected
 * Variants:
 * - "candidate" - Shows on candidate's side (they're using external display)
 * - "interviewer" - Shows on interviewer's side (candidate is using external display)
 */
export default function ExternalDisplayWarning({
    visible,
    variant = "candidate",
    displayCount = 1,
    onDismiss,
}) {
    if (!visible) return null;

    const isCandidateView = variant === "candidate";
    const title = isCandidateView
        ? "⚠️ External Display Detected"
        : "⚠️ Candidate Using External Display";

    const message = isCandidateView
        ? `You are using ${displayCount} display(s). External displays are not allowed during interviews to prevent cheating. Please disconnect any external monitors, projectors, or screen mirroring devices and use only your primary display.`
        : `The candidate is using an external display (${displayCount} display(s) detected). This behavior has been recorded and flagged. Only primary displays are allowed during interviews.`;

    const severity = isCandidateView ? "warning" : "alert";

    return (
        <div className={`external-display-warning warning-${severity} warning-${variant}`}>
            <div className="warning-container">
                <div className="warning-header">
                    <h3 className="warning-title">{title}</h3>
                    {onDismiss && variant === "candidate" && (
                        <button
                            className="warning-close"
                            onClick={onDismiss}
                            aria-label="Dismiss warning"
                        >
                            ✕
                        </button>
                    )}
                </div>
                <p className="warning-message">{message}</p>
                
                <div className="warning-details">
                    <span className="detail-badge">
                        {displayCount} Display{displayCount !== 1 ? "s" : ""} Detected
                    </span>
                    {!isCandidateView && (
                        <span className="detail-badge alert-recorded">
                            ⚠️ Incident Recorded
                        </span>
                    )}
                </div>

                {isCandidateView && (
                    <div className="warning-actions">
                        <button className="action-button primary-action">
                            Disconnect External Display
                        </button>
                        <p className="action-note">
                            This interview will be paused until only one display is active.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
