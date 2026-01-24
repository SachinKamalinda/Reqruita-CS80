// src/App.jsx
import React, { useMemo, useState, useEffect } from "react";

import RoleSelect from "./pages/RoleSelect.jsx";
import Login from "./pages/Login.jsx";
import DeviceCheck from "./pages/DeviceCheck.jsx";

import MeetingInterviewer from "./pages/MeetingInterviewer.jsx";
import MeetingInterviewee from "./pages/MeetingInterviewee.jsx";

//TEMP hardcoded credentials 

const USERS = [
  {
    role: "join", // Interviewee (Candidate) joins interview
    email: "candi@com.com",
    meetingId: "wuo12333",
    password: "8d3#223",
  },
  {
    role: "conduct", // Interviewer conducts interview
    email: "work@crn.com",
    meetingId: "wuo12333",
    password: "8d3#223",
  },
];


export default function App() {
  const [step, setStep] = useState("role"); // role | login | devices | meeting
  const [role, setRole] = useState(null);   // "join" | "conduct"
  const [session, setSession] = useState(null);

  const users = useMemo(() => USERS, []);

  // Keep base background consistent 
  useEffect(() => {
    document.documentElement.style.background = "#fff";
    document.body.style.background = "#fff";
  }, []);

  function resetAll() {
    setStep("role");
    setRole(null);
    setSession(null);
  }

  function onPickRole(nextRole) {
    setRole(nextRole); // "join" or "conduct"
    setStep("login");
  }

  //We keep "id" as email for now to avoid heavy changes in Login.jsx
  function onLogin({ id, meetingId, password, role: roleFromLogin }) {
    const email = (id || "").trim().toLowerCase();
    const mId = (meetingId || "").trim();
    const currentRole = roleFromLogin || role;

    const found = users.find(
      (u) =>
        u.role === currentRole &&
        u.email.toLowerCase() === email &&
        u.meetingId === mId &&
        u.password === password
    );

    if (!found) {
      return { ok: false, error: "Invalid Email, Meeting ID, or Password." };
    }

    setSession({
      role: found.role,
      email: found.email,
      meetingId: found.meetingId,
    });

    setStep("devices");
    return { ok: true };
  }

  function onDevicesReady(deviceState) {
    // If you want to store device state later:
    // setSession((s) => ({ ...s, deviceState }));
    setStep("meeting");
  }

  // End/Leave meeting -> reset to start
  function onEnd() {
    resetAll();
  }

  return (
    <>
      {step === "role" && (
        <RoleSelect onPickRole={onPickRole} />
      )}

      {step === "login" && (
        <Login
          role={role}
          onLogin={onLogin}
          onBack={() => setStep("role")}
          // If Login.jsx uses onSuccess internally, keep consistent:
          onSuccess={() => setStep("devices")}
        />
      )}

      {step === "devices" && (
        <DeviceCheck
          role={role}
          session={session}
          onReady={onDevicesReady}
          onBack={() => setStep("login")}
        />
      )}

      {step === "meeting" && (
        role === "conduct" ? (
          <MeetingInterviewer session={session} onEnd={onEnd} />
        ) : (
          <MeetingInterviewee session={session} onLeave={onEnd} />
        )
      )}
    </>
  );
}

