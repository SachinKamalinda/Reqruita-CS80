// src/App.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";

import RoleSelect from "./pages/RoleSelect.jsx";
import Login from "./pages/Login.jsx";
import DeviceCheck from "./pages/DeviceCheck.jsx";

import MeetingInterviewer from "./pages/MeetingInterviewer.jsx";
import MeetingInterviewee from "./pages/MeetingInterviewee.jsx";
import MeetingWorkspace from "./pages/MeetingWorkspace.jsx";
import FeedbackModal from "./components/FeedbackModal.jsx";

import ToastContainer from "./components/Toast.jsx";
import useToast from "./hooks/useToast.js";

// Removed hardcoded USERS array

function AppHeader({ isWorkspace, isInterviewer }) {
  const headerClass = isWorkspace
    ? "rq-header-glass"
    : isInterviewer
      ? "rq-header-interviewer"
      : "";

  return (
    <div className={`rq-header ${headerClass}`}>
      <div className="rq-header-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <span className="rq-header-title">Reqruita</span>
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState("role"); // role | login | devices | meeting | workspace
  const [role, setRole] = useState(null); // "join" | "conduct"
  const [session, setSession] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  const { toasts, addToast, removeToast } = useToast();

  // Removed legacy users array
  useEffect(() => {
    // Check if we are in the workspace view via URL check
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "workspace") {
      setStep("workspace");
    } else if (params.get("view") === "feedback") {
      setStep("feedback");
      setRole(params.get("role"));
    }

    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
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
    if (window.reqruita && step === "feedback") {
      window.close();
      return;
    }
    setStep("role");
    setRole(null);
    setSession(null);
  }

  function onPickRole(nextRole) {
    setRole(nextRole);
    goTo("login");
  }

  function onLogin(payload) {
    const {
      email,
      meetingId,
      role: roleFromLogin,
      participantId,
      name
    } = payload || {};

    const currentRole = roleFromLogin || role;

    setSession({
      role: currentRole,
      email: email,
      meetingId: meetingId,
      participantId: participantId,
      name: name
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
    // Open the dedicated feedback window and close this one
    if (window.reqruita?.openFeedback) {
      window.reqruita.openFeedback(role);
    } else {
      // Fallback for browser testing
      goTo("feedback");
    }
  }

  function onFeedbackSubmit(data) {
    // Here you could send data to backend
    console.log("Feedback submitted:", data);
    if (window.reqruita) {
      window.close(); // Close the feedback pop-up
    } else {
      resetAll();
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {step !== "feedback" && (
        <AppHeader
          isWorkspace={step === "workspace"}
          isInterviewer={step === "meeting" && role === "conduct"}
        />
      )}

      {step === "feedback" && (
        <style>
          {`
            html, body, #root, .rq-page, .fb-overlay {
              background: transparent !important;
            }
            .fb-card {
              background: rgba(255, 255, 255, 0.98) !important;
            }
          `}
        </style>
      )}

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

        {step === "feedback" && (
            <FeedbackModal 
                isOpen={true} 
                role={role} 
                onSubmit={onFeedbackSubmit} 
                onClose={resetAll}
                addToast={addToast}
            />
        )}

        {step === "workspace" && <MeetingWorkspace />}
      </div>
    </>
  );
}
