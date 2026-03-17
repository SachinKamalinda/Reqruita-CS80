// src/pages/MeetingWorkspace.jsx
import React, { useState, useEffect } from "react";
import "./auth-ui.css";
import FileExplorer from "../components/FileExplorer";

/**
 * MeetingWorkspace.jsx
 * Standalone workspace view intended to be opened in a separate Electron window.
 * Contains Google Search and File Explorer.
 */
export default function MeetingWorkspace() {
    // activePanel: 'google' | 'files' | 'pdf'
    const [activePanel, setActivePanel] = useState('google');
    const [pdfSrc, setPdfSrc] = useState(null);
    const [pdfName, setPdfName] = useState("");

    useEffect(() => {
        document.title = "Reqruita-Workspace-Source";
        document.body.classList.add("rq-noscr");
        return () => document.body.classList.remove("rq-noscr");
    }, []);

    return (
        <div className="jm-wrap" style={{ background: "#070b14" }}>
            <div className="jm-main" style={{ inset: 0, position: 'absolute', border: 'none', borderRadius: 0 }}>
                <div className="jm-google">
                    {/* Google panel */}
                    {activePanel === 'google' && (
                        <div className="jm-google-shell">
                            <div className="jm-google-bar">
                                <div className="jm-google-badge sm">G</div>
                                <div style={{ flex: 1, fontWeight: 800, fontSize: 13, color: '#1e293b' }}>Google Workspace</div>
                                <button className="mt-icon-btn sm" onClick={() => setActivePanel('files')} style={{ height: 28, fontSize: 11, padding: '0 12px', background: '#fff' }}>
                                    Open Files
                                </button>
                            </div>
                            <iframe
                                className="jm-google-frame"
                                title="Google"
                                src="https://www.google.com/webhp?igu=1"
                            />
                        </div>
                    )}

                    {/* File Explorer panel */}
                    {activePanel === 'files' && (
                        <FileExplorer
                            onClose={() => setActivePanel('google')}
                            onOpenPDF={(src, name) => {
                                setPdfSrc(src);
                                setPdfName(name);
                                setActivePanel('pdf');
                            }}
                        />
                    )}

                    {/* PDF panel */}
                    {activePanel === 'pdf' && (
                        <div className="jm-google-shell">
                            <div className="jm-google-bar">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                </svg>
                                <div style={{ flex: 1, fontWeight: 800, fontSize: 13, color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {pdfName}
                                </div>
                                <button
                                    className="jm-google-close"
                                    style={{ marginLeft: 4, flexShrink: 0 }}
                                    onClick={() => {
                                        if (pdfSrc?.startsWith('blob:')) URL.revokeObjectURL(pdfSrc);
                                        setActivePanel('files');
                                    }}
                                    title="Back to File Explorer"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                </button>
                                <button
                                    className="jm-google-close"
                                    onClick={() => {
                                        if (pdfSrc?.startsWith('blob:')) URL.revokeObjectURL(pdfSrc);
                                        setActivePanel('google');
                                        setPdfSrc(null);
                                    }}
                                    title="Back to Google"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                            <iframe
                                className="jm-google-frame"
                                title={pdfName}
                                src={pdfSrc}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
