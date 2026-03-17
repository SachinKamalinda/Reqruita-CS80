// src/pages/MeetingInterviewee.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./auth-ui.css";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../config";
import { useWebRTC } from "../webrtc/useWebRTC";
import FileExplorer from "../components/FileExplorer";

/**
 * MeetingInterviewee.jsx (FINAL - WebRTC + Candidate Google Window + Screen Share)
 *
 * ✅ Candidate sends cam+mic to interviewer (two-way)
 * ✅ Candidate receives interviewer cam+audio
 * ✅ Candidate can screen share ("Share Screen") which shows on interviewer main stage
 * ✅ Still registers candidate in participants list (so interviewer sees them)
 *
 * IMPORTANT:
 * - meetingId MUST be a real id (not "—") and must match both sides.
 *   (Interviewer and interviewee must join same meetingId.)
 * - BACKEND_URL must be reachable from BOTH laptops (use LAN IP, not localhost).
 */

export default function MeetingInterviewee({ session, onLeave, addToast }) {
    const meetingId = useMemo(() => session?.meetingId || "", [session]);

    // Video refs
    const localCamRef = useRef(null);
    const remoteCamRef = useRef(null);
    const autoShareAttemptedRef = useRef(false);

    // UI toggles
    const [micMuted, setMicMuted] = useState(false);
    const [camOff, setCamOff] = useState(false);
    const [sharing, setSharing] = useState(false);

    // UI state
    const [error, setError] = useState("");
    const [activePanel, setActivePanel] = useState(null); // 'files' | 'pdf' | null
    const [googleOpen, setGoogleOpen] = useState(false);
    const [pdfSrc, setPdfSrc] = useState(null);
    const [pdfName, setPdfName] = useState("");

    // Chat UI
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const chatEndRef = useRef(null);
    const seenIdsRef = useRef(new Set());

    // Socket ref for chat
    const chatSocketRef = useRef(null);
    const chatOpenRef = useRef(false);
    useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);

    // Candidate display name (later replace with real input)
    const candidateName = session?.candidateName || session?.name || "Candidate";

    // ✅ WebRTC hook
    const {
        localCamStream,
        localScreenStream,
        remoteCamStream,
        remoteScreenStream,
        startScreenShare,
        stopScreenShare,
        setMicEnabled,
        setCamEnabled,
    } = useWebRTC({ meetingId, role: "interviewee" });

    //chat shocket connection
    useEffect(() => {
        if (!meetingId) return;

        // Create socket connection ONLY for chat
        const socket = io(BACKEND_URL);
        chatSocketRef.current = socket;

        // Join chat room (same interviewId as interviewer)
        socket.emit("join-chat", { interviewId: meetingId });

        // Listen for incoming messages 
        socket.on("chat-message", (msg) => {
            const msgId = msg._id || msg.id || `${msg.senderRole}_${msg.message}_${msg.createdAt}`;
            const clientId = msg.clientId;

            // Deduplicate: skip if we already added this message optimistically (by clientId or msgId)
            if ((clientId && seenIdsRef.current.has(clientId)) || seenIdsRef.current.has(msgId)) return;

            if (clientId) seenIdsRef.current.add(clientId);
            seenIdsRef.current.add(msgId);

            const uiMsg = {
                id: msgId,
                who: msg.senderRole === "interviewee" ? "me" : "them",
                name: msg.senderName || msg.senderRole,
                text: msg.message,
                time: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };

            setMessages((prev) => [...prev, uiMsg]);

            // If this message is from the OTHER person and chat is closed → toast + badge
            if (msg.senderRole !== "interviewee") {
                if (!chatOpenRef.current) {
                    setUnreadCount((n) => n + 1);
                    addToast?.(`${msg.senderName || "Interviewer"}: ${msg.message}`, "info");
                }
            }
        });

        // Cleanup on unmount
        return () => {
            socket.disconnect();
        };
    }, [meetingId]);

    // Load chat history
    useEffect(() => {
        if (!meetingId) return;

        fetch(`${BACKEND_URL}/api/chat/${meetingId}`)
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    const uiMessages = data.map((msg) => {
                        const id = msg._id;
                        seenIdsRef.current.add(id);
                        return {
                            id,
                            who: msg.senderRole === "interviewee" ? "me" : "them",
                            name: msg.senderName || msg.senderRole,
                            text: msg.message,
                            time: new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        };
                    });
                    setMessages(uiMessages);
                }
            })
            .catch(() => { });
    }, [meetingId]);

    // Auto-scroll chat to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Clear unread badge when chat is opened
    useEffect(() => {
        if (chatOpen) setUnreadCount(0);
    }, [chatOpen]);

    // Toggle chat panel
    function toggleChatPanel() {
        setChatOpen((prev) => !prev);
    }

    // Send chat message — add optimistically so sender sees it immediately
    function sendChatMessage() {
        const text = chatInput.trim();
        if (!text || !chatSocketRef.current) return;

        const tempId = `opt_${Date.now()}`;
        seenIdsRef.current.add(tempId); // prevent server echo from doubling it

        const optimistic = {
            id: tempId,
            who: "me",
            name: candidateName,
            text,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, optimistic]);

        chatSocketRef.current.emit("chat-message", {
            interviewId: meetingId,
            senderRole: "interviewee",
            senderName: candidateName,
            message: text,
            clientId: tempId,
        });

        setChatInput("");
    }


    // 1) Enter/Exit interview mode (Electron)
    useEffect(() => {
        try {
            window.reqruita?.enterInterviewMode?.();
        } catch (e) {
            // ignore in browser dev
        }

        return () => {
            try {
                window.reqruita?.exitInterviewMode?.();
                window.reqruita?.closeWorkspace?.(); // Ensure workspace is closed on exit
            } catch (e) {
                // ignore
            }
        };
    }, []);

    // 2) Prevent body scroll
    useEffect(() => {
        document.body.classList.add("rq-noscr");
        return () => document.body.classList.remove("rq-noscr");
    }, []);

    // 3) Register candidate on backend (waiting room)
    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            try {
                setError("");

                await fetch(`${BACKEND_URL}/api/participants/join`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({ name: candidateName }),
                });
            } catch (e) {
                if (e.name === "AbortError") return; // normal cleanup
                console.log("Join backend failed:", e);
                setError("Could not connect to interview server. Check backend + Wi-Fi/IP.");
            }
        })();

        return () => controller.abort();
    }, [candidateName]);

    // 4) Attach local stream
    useEffect(() => {
        if (localCamRef.current && localCamStream) {
            localCamRef.current.srcObject = localCamStream;
        }
    }, [localCamStream]);

    // 5) Attach remote interviewer stream
    useEffect(() => {
        if (remoteCamRef.current && remoteCamStream) {
            remoteCamRef.current.srcObject = remoteCamStream;
        }
    }, [remoteCamStream]);

    // 6) Apply toggles to WebRTC tracks
    useEffect(() => {
        setMicEnabled(!micMuted);
    }, [micMuted, setMicEnabled]);

    useEffect(() => {
        setCamEnabled(!camOff);
    }, [camOff, setCamEnabled]);

    // 7) Track screen share state + auto-open Google when sharing starts
    useEffect(() => {
        const isSharing = !!localScreenStream;
        setSharing((prev) => {
            if (isSharing && !prev) addToast?.("Screen sharing started", "info");
            if (!isSharing && prev) addToast?.("Screen sharing stopped", "warning");
            return isSharing;
        });
        if (isSharing) {
            // Open detached workspace window
            try {
                window.reqruita?.openWorkspace?.();
            } catch (e) {
                // Fallback to embedded if not in Electron? 
                // Currently just doing nothing, as the window is detached.
            }
        } else {
            // Close detached workspace window
            try {
                window.reqruita?.closeWorkspace?.();
            } catch (e) { }
        }
    }, [localScreenStream, addToast]);

    // Automatically share the desktop on join inside the Electron shell so the interviewer sees the full screen immediately
    useEffect(() => {
        const runningInDesktop = typeof window !== "undefined" && !!window.reqruita;
        if (!runningInDesktop) return;
        if (autoShareAttemptedRef.current) return;
        if (!meetingId || !localCamStream) return;

        autoShareAttemptedRef.current = true;
        (async () => {
            try {
                // Open workspace first so the main process can find it as a source
                window.reqruita?.openWorkspace?.();

                // Wait for the window to be created and registered by the OS
                await new Promise(resolve => setTimeout(resolve, 1000));

                await startScreenShare();
            } catch (err) {
                console.error("Automatic screen share failed:", err);
                setError((prev) => prev || "Automatic screen share failed. Use Share Screen or grant permissions.");
            }
        })();
    }, [meetingId, localCamStream, startScreenShare]);

    function toggleMic() {
        setMicMuted((v) => !v);
    }

    function toggleVideo() {
        setCamOff((v) => !v);
    }

    async function toggleShare() {
        try {
            setError("");
            if (sharing) {
                await stopScreenShare();
                try {
                    window.reqruita?.closeWorkspace?.();
                } catch (e) { }
            } else {
                // Ensure workspace is open first so main process can target it
                try {
                    window.reqruita?.openWorkspace?.();
                } catch (e) { }

                // Wait for the window to be registered by the OS
                await new Promise(resolve => setTimeout(resolve, 1000));

                await startScreenShare();
            }
        } catch (e) {
            console.error("Screen share failed:", e);
            setError("Screen share failed. Please check permissions / Electron settings.");
        }
    }

    function toggleGoogle() {
        setGoogleOpen((prev) => {
            const next = !prev;
            if (next) {
                setActivePanel(null); // Close files if opening google
                try { window.reqruita?.openWorkspace?.(); } catch (e) { }
            }
            return next;
        });
    }

    function toggleFiles() {
        setActivePanel((prev) => {
            const next = prev === 'files' ? null : 'files';
            if (next === 'files') {
                setGoogleOpen(false); // Close google if opening files
                try { window.reqruita?.openWorkspace?.(); } catch (e) { }
            }
            return next;
        });
    }

    function leave() {
        if (!window.confirm("Are you sure you want to leave the interview?")) return;
        try {
            window.reqruita?.exitInterviewMode?.();
            window.reqruita?.closeWorkspace?.(); // Ensure workspace is closed on leaving
        } catch (e) { }

        try {
            stopScreenShare();
        } catch (e) { }

        onLeave?.();
    }

    const hasRemote = !!remoteCamStream;

    return (
        <div className={`jm-wrap ${sharing ? "jm-sharing-active" : ""}`}>
            {error && (
                <div className="mt-err" style={{ background: "rgba(220,38,38,0.92)" }}>
                    {error}
                </div>
            )}

            {/* If meetingId is missing, show a clear warning */}
            {!meetingId && (
                <div className="mt-err" style={{ background: "rgba(245,158,11,0.95)" }}>
                    Missing meetingId. Both devices must join the SAME meetingId for video to work.
                </div>
            )}

            {/* Connection status indicator */}
            <div className="mt-conn-status">
                <span className={`mt-conn-dot ${hasRemote ? "mt-conn-on" : "mt-conn-pulse"}`} />
                <span className="mt-conn-text">
                    {hasRemote ? "Interviewer connected" : "Waiting for interviewer…"}
                </span>
                <span className="mt-conn-text" style={{ marginLeft: 8, opacity: 0.6 }}>
                    Meeting: {meetingId || "—"}
                </span>
            </div>

            <div className="jm-row">
                {/* Main area */}
                <div className="jm-main">
                    <div className="jm-share">
                        {remoteScreenStream ? (
                            <video
                                autoPlay
                                playsInline
                                ref={(v) => v && (v.srcObject = remoteScreenStream)}
                            />
                        ) : (
                            <div className="jm-share-placeholder">
                                <div className="mt-ph-content">
                                    <div className="jm-google-badge">R</div>
                                    <div className="mt-ph-title" style={{ marginTop: 24 }}>
                                        Sharing Workspace
                                    </div>
                                    <div className="mt-ph-sub" style={{ marginTop: 8, maxWidth: 300, textAlign: 'center' }}>
                                        Your standalone workspace window is being shared with the interviewer.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Inline Google Panel Overlay */}
                        {googleOpen && (
                            <div className="jm-google-shell" style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                                <div className="jm-google-bar">
                                    <div className="jm-google-badge sm">G</div>
                                    <div className="jm-google-bar-title">Google Workspace</div>
                                    <button className="jm-google-close" onClick={() => setGoogleOpen(false)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <iframe
                                    className="jm-google-frame"
                                    title="Google"
                                    src="https://www.google.com/webhp?igu=1"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        )}

                        {/* Inline File Explorer Panel Overlay */}
                        {activePanel === 'files' && (
                            <div className="jm-google-shell" style={{ position: 'absolute', inset: 0, zIndex: 11 }}>
                                <FileExplorer
                                    onClose={() => setActivePanel(null)}
                                    onOpenPDF={(src, name) => {
                                        setPdfSrc(src);
                                        setPdfName(name);
                                        setActivePanel('pdf');
                                    }}
                                />
                            </div>
                        )}

                        {/* Inline PDF Viewer Panel Overlay */}
                        {activePanel === 'pdf' && (
                            <div className="jm-google-shell" style={{ position: 'absolute', inset: 0, zIndex: 12 }}>
                                <div className="jm-google-bar">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                    </svg>
                                    <div className="jm-google-bar-title" style={{ color: 'rgba(255,255,255,0.92)' }}>
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

                {/* Side videos */}
                <div className="jm-side">
                    {/* Candidate video */}
                    <div className="jm-tile">
                        <video ref={localCamRef} autoPlay playsInline muted />
                        <div className="jm-label">You</div>
                    </div>

                    {/* Interviewer remote video */}
                    <div className="jm-tile">
                        {hasRemote ? (
                            <video ref={remoteCamRef} autoPlay playsInline />
                        ) : (
                            <div className="mt-tile-ph">
                                <div className="mt-tile-ph-avatar mt-tile-ph-pulse">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                                <span className="mt-tile-ph-text">Connecting…</span>
                            </div>
                        )}
                        <div className="jm-label">Interviewer</div>
                    </div>
                </div>
            </div>

            {/* ── Horizontal Chat Overlay (above footer) ── */}
            {chatOpen && (
                <div className="jm-chat-overlay mt-side-enter">
                    <div className="jm-chat-overlay-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span className="mt-side-title">Chat</span>
                        </div>
                        <button className="mt-side-close" onClick={toggleChatPanel}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                    <div className="jm-chat-overlay-body">
                        <div className="jm-chat-messages">
                            {messages.length === 0 && (
                                <div className="mt-empty" style={{ marginTop: 12 }}>No messages yet. Say hello! 👋</div>
                            )}
                            {messages.map((m) => (
                                <div key={m.id} className={`mt-msg ${m.who}`}>
                                    <div className="mt-msgmeta">
                                        <span>{m.name}</span>
                                        <span>{m.time}</span>
                                    </div>
                                    <div className="mt-bubble">{m.text}</div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="jm-chat-input-row">
                            <input
                                autoFocus
                                className="mt-chat-field"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type a message and press Enter…"
                                onKeyDown={(e) => { if (e.key === "Enter") sendChatMessage(); }}
                            />
                            <button className="mt-send" onClick={sendChatMessage} disabled={!chatInput.trim()}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Footer Toolbar */}
            <div className="jm-footer">
                <div className="jm-left">
                    {/* Mic */}
                    <button className={`mt-icon-btn ${micMuted ? "mt-icon-off" : ""}`} onClick={toggleMic} title={micMuted ? "Unmute" : "Mute"}>
                        {micMuted ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
                                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        )}
                        <span className="mt-icon-label">{micMuted ? "Unmute" : "Mute"}</span>
                    </button>

                    {/* Camera */}
                    <button className={`mt-icon-btn ${camOff ? "mt-icon-off" : ""}`} onClick={toggleVideo} title={camOff ? "Turn on camera" : "Turn off camera"}>
                        {camOff ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
                                <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1-2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        )}
                        <span className="mt-icon-label">{camOff ? "Start" : "Stop"}</span>
                    </button>

                    {/* Google Search Panel */}
                    <button
                        className={`mt-icon-btn mt-icon-google ${googleOpen ? "mt-icon-active" : ""}`}
                        onClick={toggleGoogle}
                        title={googleOpen ? "Close Google Search" : "Open Google Search"}
                    >
                        <div className="jm-google-badge sm" style={{ marginBottom: 4 }}>G</div>
                        <span className="mt-icon-label">{googleOpen ? "Google ✓" : "Google"}</span>
                    </button>

                    {/* File Explorer */}
                    <button
                        className={`mt-icon-btn mt-icon-files ${activePanel === 'files' ? "mt-icon-active" : ""}`}
                        onClick={toggleFiles}
                        title={activePanel === 'files' ? "Close File Explorer" : "Open File Explorer"}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="mt-icon-label">{activePanel === 'files' ? "Files ✓" : "Files"}</span>
                    </button>

                    {/* Share Screen */}
                    <button className={`mt-icon-btn ${sharing ? "mt-icon-active" : ""}`} onClick={toggleShare} disabled={!meetingId} title={sharing ? "Stop Sharing" : "Share Screen"}>
                        {sharing ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
                                <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                                <line x1="17" y1="3" x2="23" y2="9" /><line x1="23" y1="3" x2="17" y2="9" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                        )}
                        <span className="mt-icon-label">{sharing ? "Stop" : "Share"}</span>
                    </button>
                    {/* Chat */}
                    <button className={`mt-icon-btn ${chatOpen ? "mt-icon-active" : ""}`} onClick={toggleChatPanel} title="Chat" style={{ position: 'relative' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {unreadCount > 0 && !chatOpen && (
                            <span className="mt-icon-badge" style={{ background: '#ef4444' }}>{unreadCount}</span>
                        )}
                        <span className="mt-icon-label">Chat</span>
                    </button>
                </div>

                <button className="mt-end" onClick={leave}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                        <line x1="23" y1="1" x2="1" y2="23" />
                    </svg>
                    <span>Leave</span>
                </button>
            </div>


        </div>


    );
}
