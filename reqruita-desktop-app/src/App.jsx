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