import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../config";

const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun.services.mozilla.com" },
    ],
};

export function useWebRTC({ meetingId, role, participantId }) {
    const socketRef = useRef(null);
    const pcRef = useRef(null);
    const peerIdRef = useRef(null);

    const [localCamStream, setLocalCamStream] = useState(null);
    const [localScreenStream, setLocalScreenStream] = useState(null);

    const localCamStreamRef = useRef(null);
    const localScreenStreamRef = useRef(null);

    const [remoteCamStream, setRemoteCamStream] = useState(null);
    const [remoteScreenStream, setRemoteScreenStream] = useState(null);

    const screenSenderRef = useRef(null);
    const pendingScreenOfferRef = useRef(false);

    const emitSignal = useCallback(
        (data) => {
            const socket = socketRef.current;
            if (!socket) return;

            const payload = { meetingId, data };
            if (peerIdRef.current) payload.to = peerIdRef.current;

            socket.emit("webrtc-signal", payload);
        },
        [meetingId]
    );

    const sendOffer = useCallback(async () => {
        const pc = pcRef.current;
        if (!pc || pc.signalingState === "closed") return;

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            emitSignal({ type: "offer", sdp: pc.localDescription });
        } catch (err) {
            console.error("Failed to create/send offer", err);
        }
    }, [emitSignal]);

    const requestScreenOffer = useCallback(async () => {
        const pc = pcRef.current;
        if (!pc) return;

        const peerConnected = !!peerIdRef.current;
        const stable = pc.signalingState === "stable";

        if (!peerConnected || !stable) {
            pendingScreenOfferRef.current = true;
            return;
        }

        pendingScreenOfferRef.current = false;
        await sendOffer();
    }, [sendOffer]);

    // helper: pick first stream as cam, second as screen
    const clearRemoteStream = (streamId, type) => {
        if (type === "cam") {
            setRemoteCamStream((cur) => (cur?.id === streamId ? null : cur));
        } else {
            setRemoteScreenStream((cur) => (cur?.id === streamId ? null : cur));
        }
    };

    const watchRemoteStream = (stream, type) => {
        const handleEnd = () => clearRemoteStream(stream.id, type);
        stream.getTracks().forEach((track) => {
            track.onended = handleEnd;
            track.oninactive = handleEnd;
        });
    };

    useEffect(() => {
        let mounted = true;

        async function start() {
            // 1) socket
            const socket = io(BACKEND_URL);
            socketRef.current = socket;

            socket.on("connect", () => {
                console.log("Connected to signaling server:", socket.id);
            });

            socket.on("connect_error", (err) => {
                console.error("Socket connection error:", err);
            });

            // 2) peer connection
            const pc = new RTCPeerConnection(RTC_CONFIG);
            pcRef.current = pc;

            // send ICE candidates to peer
            pc.onicecandidate = (e) => {
                if (e.candidate) {
                    emitSignal({ type: "ice", candidate: e.candidate });
                }
            };

            pc.onsignalingstatechange = () => {
                if (pc.signalingState === "stable" && pendingScreenOfferRef.current && peerIdRef.current) {
                    requestScreenOffer();
                }
            };

            // Ensure we know the first video track (cam) vs subsequent (screen)
            let firstVideoTrackId = null;

            // receive remote tracks
            pc.ontrack = (e) => {
                const stream = e.streams?.[0];
                if (!stream) return;

                if (e.track.kind === "video") {
                    if (!firstVideoTrackId) {
                        // First video track received is the camera
                        firstVideoTrackId = e.track.id;
                        setRemoteCamStream((cur) => (cur?.id === stream.id ? cur : stream));
                    } else if (e.track.id !== firstVideoTrackId) {
                        // Any other video track is a screen share
                        setRemoteScreenStream((cur) => (cur?.id === stream.id ? cur : stream));
                    }
                }

                // If remote stops screen sharing, the track ends
                e.track.onended = () => {
                    if (e.track.id !== firstVideoTrackId) {
                        setRemoteScreenStream(null);
                    }
                };
                e.track.oninactive = e.track.onended;
            };

            // only the interviewer will initiate offers
            pc.onnegotiationneeded = async () => {
                if (role !== "interviewer") return;
                await sendOffer();
            };

            // 3) local camera+mic
            const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (!mounted) {
                cam.getTracks().forEach(t => t.stop());
                return;
            }
            localCamStreamRef.current = cam;
            setLocalCamStream(cam);

            // add tracks to pc
            for (const track of cam.getTracks()) pc.addTrack(track, cam);

            // 4) signaling handlers
            socket.on("peer-joined", async ({ peerId }) => {
                peerIdRef.current = peerId;

                // interviewer will auto-create offer via negotiationneeded
                if (role === "interviewer") {
                    await sendOffer();
                } else if (pendingScreenOfferRef.current) {
                    await requestScreenOffer();
                }
            });

            socket.on("peer-left", () => {
                peerIdRef.current = null;
                setRemoteCamStream(null);
                setRemoteScreenStream(null);
                pendingScreenOfferRef.current = false;
            });

            socket.on("webrtc-signal", async ({ from, data }) => {
                peerIdRef.current = from;

                if (data.type === "renegotiate") {
                    if (role === "interviewer") {
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        socket.emit("webrtc-signal", {
                            meetingId,
                            to: from,
                            data: { type: "offer", sdp: pc.localDescription },
                        });
                    }
                    return;
                }

                if (data.type === "offer") {
                    await pc.setRemoteDescription(data.sdp);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    emitSignal({ type: "answer", sdp: pc.localDescription });
                }

                if (data.type === "answer") {
                    await pc.setRemoteDescription(data.sdp);
                }

                if (data.type === "ice" && data.candidate) {
                    try {
                        await pc.addIceCandidate(data.candidate);
                    } catch (err) {
                        console.error("ICE add failed", err);
                    }
                }
            });

            // 5) join room
            socket.emit("join-meeting", { meetingId, role, participantId });
        }

        start().catch(console.error);

        return () => {
            mounted = false;
            try {
                socketRef.current?.disconnect();
            } catch { }
            try {
                pcRef.current?.close();
            } catch { }

            // stop local media
            if (localCamStreamRef.current) {
                localCamStreamRef.current.getTracks().forEach((t) => t.stop());
            }
            if (localScreenStreamRef.current) {
                localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meetingId, role, participantId]);

    async function startScreenShare() {
        const pc = pcRef.current;
        if (!pc) return;

        const scr = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        localScreenStreamRef.current = scr;
        setLocalScreenStream(scr);

        const screenTrack = scr.getVideoTracks()[0];
        screenTrack.onended = () => stopScreenShare();

        // add as separate stream so remote can treat it as “screen”
        screenSenderRef.current = pc.addTrack(screenTrack, scr);
        await requestScreenOffer();
    }

    async function stopScreenShare() {
        const pc = pcRef.current;
        const sender = screenSenderRef.current;

        if (sender && pc) {
            try { pc.removeTrack(sender); } catch { }
        }
        screenSenderRef.current = null;

        if (localScreenStreamRef.current) {
            localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
            localScreenStreamRef.current = null;
            setLocalScreenStream(null);
        }
        await requestScreenOffer();
    }

    
    function setMicEnabled(enabled) {
        if (!localCamStream) return;
        localCamStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    }

    function setCamEnabled(enabled) {
        if (!localCamStream) return;
        localCamStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
    }

    return {
        localCamStream,
        localScreenStream,
        remoteCamStream,
        remoteScreenStream,
        startScreenShare,
        stopScreenShare,
        setMicEnabled,
        setCamEnabled,
    };
}
