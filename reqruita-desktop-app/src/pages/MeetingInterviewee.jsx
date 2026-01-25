// src/pages/MeetingInterviewee.jsx
import React, { useEffect, useRef, useState } from "react";
import "./auth-ui.css";

/**
 * Interviewee (Join) Meeting
 * - Enters "interview mode" (fullscreen + kiosk-ish) on mount via preload API
 * - Exits interview mode when leaving / unmounting
 * - Main area: REAL screen share (getDisplayMedia)
 * - Left tile: REAL interviewee camera (getUserMedia)
 * - Right tile: interviewer placeholder (image/box for now)
 * - Footer: Mic/Video toggles + Leave Interview
 *
 * Requires preload exposing:
 * window.reqruita.enterInterviewMode()
 * window.reqruita.exitInterviewMode()
 */

export default function MeetingInterviewee({ session, onLeave }) {
    const shareRef = useRef(null);
    const camRef = useRef(null);

    const [shareStream, setShareStream] = useState(null);
    const [camStream, setCamStream] = useState(null);

    const [micMuted, setMicMuted] = useState(false);
    const [camOff, setCamOff] = useState(false);

    const [error, setError] = useState("");

    // Enter full-screen "locked" mode when candidate joins
    useEffect(() => {
        try {
            window.reqruita?.enterInterviewMode?.();
        } catch (e) {
            // ignore (e.g., running in browser dev without Electron)
        }

        // Safety: always unlock on unmount
        return () => {
            try {
                window.reqruita?.exitInterviewMode?.();
            } catch (e) {
                // ignore
            }
        };
    }, []);

    // Keep meeting non-scroll (panel can scroll internally elsewhere)
    useEffect(() => {
        document.body.classList.add("rq-noscr");
        return () => document.body.classList.remove("rq-noscr");
    }, []);

    // Start camera + screen share when entering meeting
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                setError("");

                // Interviewee camera + mic (local)
                const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (!mounted) return;

                setCamStream(cam);
                if (camRef.current) camRef.current.srcObject = cam;

                // Screen share (candidate shares screen)
                const scr = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                if (!mounted) return;

                setShareStream(scr);
                if (shareRef.current) shareRef.current.srcObject = scr;

                // Detect stop share from browser UI
                const track = scr.getVideoTracks()[0];
                if (track) {
                    track.onended = () => {
                        stopStream(scr);
                        setShareStream(null);
                        if (shareRef.current) shareRef.current.srcObject = null;
                        setError("Screen sharing stopped.");
                    };
                }
            } catch (e) {
                setError("Could not start camera/screen share. Please check permissions.");
            }
        })();

        return () => {
            mounted = false;
            stopStream(camStream);
            stopStream(shareStream);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Apply mic toggle
    useEffect(() => {
        if (!camStream) return;
        setTracksEnabled(camStream, "audio", !micMuted);
    }, [micMuted, camStream]);

    // Apply camera toggle
    useEffect(() => {
        if (!camStream) return;
        setTracksEnabled(camStream, "video", !camOff);
    }, [camOff, camStream]);

    function toggleMic() {
        setMicMuted((v) => !v);
    }

    function toggleVideo() {
        setCamOff((v) => !v);
    }

    function leave() {
        // Unlock app window first
        try {
            window.reqruita?.exitInterviewMode?.();
        } catch (e) {
            // ignore
        }

        stopStream(camStream);
        stopStream(shareStream);
        onLeave?.();
    }

    return (
        <div className="jm-wrap">
            {error && (
                <div className="mt-err" style={{ background: "rgba(220,38,38,0.92)" }}>
                    {error}
                </div>
            )}

            <div className="jm-row">
                {/* Main shared screen */}
                <div className="jm-main">
                    <div className="jm-share">
                        {shareStream ? (
                            <video ref={shareRef} autoPlay playsInline muted />
                        ) : (
                            <div className="jm-share-placeholder">
                                Screen share (not active)
                                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8, fontWeight: 700 }}>
                                    Meeting: {session?.meetingId || "—"}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Side videos */}
                <div className="jm-side">
                    {/* Interviewee video (real) */}
                    <div className="jm-tile">
                        <video ref={camRef} autoPlay playsInline muted />
                        <div className="jm-label">You (Candidate)</div>
                    </div>

                    {/* Interviewer video (placeholder for now) */}
                    <div className="jm-tile">
                        <div
                            style={{
                                width: "100%",
                                height: "100%",
                                background:
                                    "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
                                display: "grid",
                                placeItems: "center",
                                color: "rgba(255,255,255,0.9)",
                                fontWeight: 900,
                                fontSize: 12,
                            }}
                        >
                            Interviewer video (placeholder)
                        </div>
                        <div className="jm-label">Interviewer</div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="jm-footer">
                <div className="jm-left">
                    <button className={`mt-ctl ${micMuted ? "mt-ctl-off" : ""}`} onClick={toggleMic}>
                        {micMuted ? "Mic Off" : "Mic"}
                    </button>

                    <button className={`mt-ctl ${camOff ? "mt-ctl-off" : ""}`} onClick={toggleVideo}>
                        {camOff ? "Video Off" : "Video"}
                    </button>
                </div>

                <button className="mt-end" onClick={leave}>
                    Leave interview
                </button>
            </div>
        </div>
    );
}

/* helpers */
function stopStream(stream) {
    if (!stream) return;
    for (const track of stream.getTracks()) track.stop();
}

function setTracksEnabled(stream, kind, enabled) {
    const tracks = kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();
    for (const t of tracks) t.enabled = enabled;
}