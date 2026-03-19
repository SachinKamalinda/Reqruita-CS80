// src/components/ConfirmationModal.jsx
import React from "react";
import "./ConfirmationModal.css";

/**
 * A premium confirmation modal matching the Reqruita UI/UX.
 * 
 * Props:
 * - isOpen (boolean): Controls visibility
 * - title (string): Modal title
 * - message (string): Modal message body
 * - confirmText (string): Text for the primary action button
 * - cancelText (string): Text for the cancel action button
 * - onConfirm (function): Callback for primary action
 * - onCancel (function): Callback for cancel action
 * - variant (string): 'danger' (red) | 'primary' (purple)
 */
export default function ConfirmationModal({
    isOpen,
    title = "Are you sure?",
    message = "Do you really want to proceed with this action?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    variant = "danger"
}) {
    if (!isOpen) return null;

    return (
        <div className="cm-overlay">
            <div className="cm-card lg-fade-in">
                <div className="cm-content">
                    <div className={`cm-icon-wrap cm-icon-${variant}`}>
                        {variant === "danger" ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        )}
                    </div>
                    
                    <h2 className="cm-title">{title}</h2>
                    <p className="cm-message">{message}</p>
                </div>

                <div className="cm-actions">
                    <button className="cm-btn cm-btn-cancel" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button className={`cm-btn cm-btn-confirm cm-btn-${variant}`} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
