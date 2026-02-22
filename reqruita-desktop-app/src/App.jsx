// src/App.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";

import RoleSelect from "./pages/RoleSelect.jsx";
import Login from "./pages/Login.jsx";
import DeviceCheck from "./pages/DeviceCheck.jsx";

import MeetingInterviewer from "./pages/MeetingInterviewer.jsx";
import MeetingInterviewee from "./pages/MeetingInterviewee.jsx";

import ToastContainer from "./components/Toast.jsx";
import useToast from "./hooks/useToast.js";

// TEMP hardcoded credentials
const USERS = [
  {
    role: "join", // Interviewee (Candidate) joins interview
    email: "123",
    meetingId: "123",
    password: "123",
  },
  {
    role: "conduct", // Interviewer conducts interview
    email: "123",
    meetingId: "123",
    password: "123",
  },
];

export default function App() {
  const [step, setStep] = useState("role"); // role | login | devices | meeting
  const [role, setRole] = useState(null); // "join" | "conduct"
  const [session, setSession] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  const { toasts, addToast, removeToast } = useToast();

  const users = useMemo(() => USERS, []);

  useEffect(() => {
    document.documentElement.style.background = "#fff";
    document.body.style.background = "#fff";
  }, []);

  /* ── Smooth page transition helper ── */
  const goTo = useCallback((nextStep) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setTransitioning(false);
    }, 180);
  }, []);

  function resetAll() {
    setStep("role");
    setRole(null);
    setSession(null);
  }

  function onPickRole(nextRole) {
    setRole(nextRole);
    goTo("login");
  }

  // Accept BOTH shapes:
  // - { id, meetingId, password, role }
  // - { email, meetingId, password, role }
  function onLogin(payload) {
    const {
      id,
      email,
      meetingId,
      password,
      role: roleFromLogin,
    } = payload || {};

    const em = (id || email || "").trim().toLowerCase();
    const mId = (meetingId || "").trim();
    const pwd = (password || "").trim();
    const currentRole = roleFromLogin || role;

    if (!em || !mId || !pwd || !currentRole) {
      addToast("Please enter Email, Meeting ID, and Password.", "error");
      return { ok: false };
    }

    const found = users.find(
      (u) =>
        u.role === currentRole &&
        u.email.toLowerCase() === em &&
        u.meetingId === mId &&
        u.password === pwd
    );

    if (!found) {
      addToast("Invalid Email, Meeting ID, or Password.", "error");
      return { ok: false };
    }

    setSession({
      role: found.role,
      email: found.email,
      meetingId: found.meetingId,
    });

    addToast("Login successful! Setting up devices…", "success");
    goTo("devices");
    return { ok: true };
  }

  function onDevicesReady() {
    addToast("Devices configured. Joining meeting…", "success");
    goTo("meeting");
  }

  function onEnd() {
    addToast("You left the meeting.", "info");
    resetAll();
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className={`rq-page ${transitioning ? "rq-page-exit" : "rq-page-enter"}`}>
        {step === "role" && <RoleSelect onPickRole={onPickRole} />}

        {step === "login" && (
          <Login
            role={role}
            onBack={() => goTo("role")}
            onSuccess={(payload) => {
              onLogin(payload);
            }}
            addToast={addToast}
          />
        )}

        {step === "devices" && (
          <DeviceCheck
            role={role}
            session={session}
            onReady={onDevicesReady}
            onBack={() => goTo("login")}
            addToast={addToast}
          />
        )}

        {step === "meeting" &&
          (role === "conduct" ? (
            <MeetingInterviewer session={session} onEnd={onEnd} addToast={addToast} />
          ) : (
            <MeetingInterviewee session={session} onLeave={onEnd} addToast={addToast} />
          ))}
      </div>
    </>
  );
}
