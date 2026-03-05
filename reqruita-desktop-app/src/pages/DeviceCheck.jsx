import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./auth-ui.css";

/* ── SVG icons ── */
const MicIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
);

const CamIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
        <circle cx="12" cy="13" r="3" />
    </svg>
);

const ScreenIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

/* ── Audio Level Bars Component ── */
function AudioLevelBars({ stream }) {
    const barsRef = useRef([]);
    const rafRef = useRef(null);
    const analyserRef = useRef(null);

    useEffect(() => {
        if (!stream) return;

        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.6;
        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);

        function tick() {
            analyser.getByteFrequencyData(data);
            // Pick 5 representative frequency bands
            const bands = [3, 6, 10, 14, 18];
            bands.forEach((bi, i) => {
                const bar = barsRef.current[i];
                if (bar) {
                    const val = data[bi] || 0;
                    const h = Math.max(4, (val / 255) * 32);
                    bar.style.height = `${h}px`;
                }
            });
            rafRef.current = requestAnimationFrame(tick);
        }
        tick();

        return () => {
            cancelAnimationFrame(rafRef.current);
            ctx.close();
        };
    }, [stream]);

    return (
        <div className="dc-audio-bars">
            {[0, 1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    ref={(el) => (barsRef.current[i] = el)}
                    className="dc-audio-bar"
                />
            ))}
        </div>
    );
}

/* ── Main Component ── */
export default function DeviceCheck({ role, onReady, onBack, addToast }) {
    const camVideoRef = useRef(null);
    const screenVideoRef = useRef(null);

    const [micOn, setMicOn] = useState(false);
    const [camOn, setCamOn] = useState(false);
    const [screenOn, setScreenOn] = useState(false);

    const [micStream, setMicStream] = useState(null);
    const [camStream, setCamStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);

    const [error, setError] = useState("");

    const mustPassAll = role === "join";

    const canContinue = useMemo(() => {
        return mustPassAll ? micOn && camOn && screenOn : true;
    }, [mustPassAll, micOn, camOn, screenOn]);

    const readyCount = [micOn, camOn, screenOn].filter(Boolean).length;

    useEffect(() => {
        document.body.classList.add("rq-noscr");
        return () => {
            document.body.classList.remove("rq-noscr");
            stopStream(micStream);
            stopStream(camStream);
            stopStream(screenStream);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleMic = useCallback(async () => {
        setError("");
        if (micOn) {
            stopStream(micStream);
            setMicStream(null);
            setMicOn(false);
            addToast?.("Microphone disabled", "info");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setMicStream(stream);
            setMicOn(true);
            addToast?.("Microphone enabled", "success");
        } catch (e) {
            setError("Mic permission denied or no mic available.");
            addToast?.("Mic permission denied", "error");
        }
    }, [micOn, micStream, addToast]);

    const toggleCam = useCallback(async () => {
        setError("");
        if (camOn) {
            stopStream(camStream);
            setCamStream(null);
            setCamOn(false);
            if (camVideoRef.current) camVideoRef.current.srcObject = null;
            addToast?.("Camera disabled", "info");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setCamStream(stream);
            setCamOn(true);
            if (camVideoRef.current) camVideoRef.current.srcObject = stream;
            addToast?.("Camera enabled", "success");
        } catch (e) {
            setError("Camera permission denied or no camera available.");
            addToast?.("Camera permission denied", "error");
        }
    }, [camOn, camStream, addToast]);

    const toggleScreen = useCallback(async () => {
        setError("");
        if (screenOn) {
            stopStream(screenStream);
            setScreenStream(null);
            setScreenOn(false);
            if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
            addToast?.("Screen share disabled", "info");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            setScreenStream(stream);
            setScreenOn(true);
            if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
            addToast?.("Screen share enabled", "success");

            const track = stream.getVideoTracks()[0];
            if (track) {
                track.onended = () => {
                    stopStream(stream);
                    setScreenStream(null);
                    setScreenOn(false);
                    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
                };
            }
        } catch (e) {
            setError("Screen share denied or not supported.");
            addToast?.("Screen share denied", "error");
        }
    }, [screenOn, screenStream, addToast]);

    function continueNext() {
        if (!canContinue) return;
        onReady({ micOn, camOn, screenOn });
    }

    const devices = [
        {
            key: "mic",
            label: "Microphone",
            sublabel: "Required for voice communication",
            icon: <MicIcon />,
            on: micOn,
            toggle: toggleMic,
            extra: micOn && micStream ? <AudioLevelBars stream={micStream} /> : null,
        },
        {
            key: "cam",
            label: "Camera",
            sublabel: "Required for video feed",
            icon: <CamIcon />,
            on: camOn,
            toggle: toggleCam,
        },
        {
            key: "screen",
            label: "Screen Share",
            sublabel: "Required for interview monitoring",
            icon: <ScreenIcon />,
            on: screenOn,
            toggle: toggleScreen,
        },
    ];

    return (
        <div className="dc-wrap">
            <div className="dc-card dc-card-v2">
                {/* Progress header */}
                <div className="dc-progress-header">
                    <div className="dc-step-label">
                        Step <span className="dc-step-num">3</span> of 4
                    </div>
                    <div className="dc-progress-track">
                        <div className="dc-progress-fill" style={{ width: "75%" }} />
                    </div>
                </div>

                {/* Title section */}
                <div className="dc-top-v2">
                    <div>
                        <h2 className="dc-title-v2">Device Setup</h2>
                        <p className="dc-sub-v2">
                            {mustPassAll
                                ? "Enable all devices to continue. These are required for the interview."
                                : "Configure your devices. You can also enable them later during the meeting."}
                        </p>
                    </div>
                    <div className="dc-readiness">
                        <span className={`dc-ready-badge ${canContinue ? "dc-ready-go" : ""}`}>
                            {readyCount}/3 Ready
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="dc-err-v2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Device cards */}
                <div className="dc-devices-v2">
                    {devices.map((d) => (
                        <button
                            key={d.key}
                            className={`dc-device-card ${d.on ? "dc-device-on" : ""}`}
                            onClick={d.toggle}
                        >
                            <div className="dc-device-icon">{d.icon}</div>
                            <div className="dc-device-info">
                                <div className="dc-device-name">{d.label}</div>
                                <div className="dc-device-sub">{d.sublabel}</div>
                                {d.extra}
                            </div>
                            <div className={`dc-device-status ${d.on ? "dc-status-on" : ""}`}>
                                {d.on ? <CheckIcon /> : null}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Video previews */}
                <div className="dc-previews-v2">
                    <div className={`dc-prev-card ${camOn ? "dc-prev-active" : ""}`}>
                        <div className="dc-prev-label">Camera Preview</div>
                        <div className="dc-prev-body">
                            {camOn ? (
                                <video ref={camVideoRef} autoPlay playsInline muted className="dc-prev-video" />
                            ) : (
                                <div className="dc-prev-off">
                                    <CamIcon />
                                    <span>Camera is off</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={`dc-prev-card ${screenOn ? "dc-prev-active" : ""}`}>
                        <div className="dc-prev-label">Screen Share Preview</div>
                        <div className="dc-prev-body">
                            {screenOn ? (
                                <video ref={screenVideoRef} autoPlay playsInline muted className="dc-prev-video" />
                            ) : (
                                <div className="dc-prev-off">
                                    <ScreenIcon />
                                    <span>Screen share is off</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="dc-footer-v2">
                    <button onClick={onBack} className="dc-back-v2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Back
                    </button>

                    <button
                        onClick={continueNext}
                        className={`dc-next-v2 ${canContinue ? "" : "dc-next-disabled-v2"}`}
                        disabled={!canContinue}
                    >
                        Continue to Meeting
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

function stopStream(stream) {
    if (!stream) return;
    for (const track of stream.getTracks()) track.stop();
}
