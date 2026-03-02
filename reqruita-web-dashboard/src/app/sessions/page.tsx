"use client";

import { useState } from "react";

interface Session {
  id: string;
  candidate: string;
  interviewer: string;
  dateTime: string;
  duration: string;
  status: "In Progress" | "Completed" | "Scheduled";
}

interface HistorySession {
  id: number;
  title: string;
  completedDate: string;
  duration: string;
}

export default function SessionsPage() {
  const [activeSessions, setActiveSessions] = useState<Session[]>([
    {
      id: "SES-2025001",
      candidate: "Jane Candidate",
      interviewer: "Mike Interviewer",
      dateTime: "Nov 20, 2:00 PM",
      duration: "45 min",
      status: "In Progress",
    },
    {
      id: "SES-2025002",
      candidate: "John Developer",
      interviewer: "Sarah Manager",
      dateTime: "Nov 20, 3:00 PM",
      duration: "45 min",
      status: "In Progress",
    },
    {
      id: "SES-2025003",
      candidate: "Alice Engineer",
      interviewer: "Tom Recruiter",
      dateTime: "Nov 20, 4:00 PM",
      duration: "45 min",
      status: "In Progress",
    },
    {
      id: "SES-2025004",
      candidate: "Bob coder",
      interviewer: "Lisa HR",
      dateTime: "Nov 20, 5:00 PM",
      duration: "45 min",
      status: "In Progress",
    },
    {
      id: "SES-2025005",
      candidate: "Carol Designer",
      interviewer: "David Lead",
      dateTime: "Nov 20, 6:00 PM",
      duration: "45 min",
      status: "In Progress",
    },
  ]);

  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [newSessionCandidate, setNewSessionCandidate] = useState("");
  const [newSessionInterviewer, setNewSessionInterviewer] = useState("");

  const handleNewSession = () => {
    if (newSessionCandidate.trim() && newSessionInterviewer.trim()) {
      const newSession: Session = {
        id: `SES-${2025000 + activeSessions.length + 1}`,
        candidate: newSessionCandidate,
        interviewer: newSessionInterviewer,
        dateTime:
          new Date().toLocaleDateString() +
          ", " +
          new Date().toLocaleTimeString(),
        duration: "45 min",
        status: "Scheduled",
      };
      setActiveSessions([...activeSessions, newSession]);
      setNewSessionCandidate("");
      setNewSessionInterviewer("");
      setShowNewSessionModal(false);
      alert("Session created successfully!");
    }
  };

  const handleJoinClick = (session: Session) => {
    setSelectedSession(session);
    setShowJoinModal(true);
  };

  const handleViewClick = (session: Session) => {
    setSelectedSession(session);
    setShowViewModal(true);
  };

  const handleConfirmJoin = () => {
    if (selectedSession) {
      alert(
        `Joined session ${selectedSession.id}. Opening meeting interface...`,
      );
      setShowJoinModal(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-gray-500">Thursday, November 20</p>
        <h1 className="text-3xl font-bold">Sessions</h1>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Active Interview Sessions</h2>
          <button
            onClick={() => setShowNewSessionModal(true)}
            className="bg-[#5D20B3] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4a1a8a]"
          >
            New Session
          </button>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-400 border-b">
              <th className="py-3 font-medium">Session ID</th>
              <th className="py-3 font-medium">Candidate</th>
              <th className="py-3 font-medium">Interviewer</th>
              <th className="py-3 font-medium">Date & Time</th>
              <th className="py-3 font-medium">Duration</th>
              <th className="py-3 font-medium">Status</th>
              <th className="py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {activeSessions.map((session) => (
              <tr key={session.id} className="hover:bg-gray-50">
                <td className="py-4">{session.id}</td>
                <td className="py-4">{session.candidate}</td>
                <td className="py-4">{session.interviewer}</td>
                <td className="py-4">{session.dateTime}</td>
                <td className="py-4">{session.duration}</td>
                <td className="py-4">
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                    {session.status}
                  </span>
                </td>
                <td className="py-4 flex gap-2">
                  <button
                    onClick={() => handleJoinClick(session)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => handleViewClick(session)}
                    className="text-[#5D20B3] text-sm hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Session History */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">Session History</h2>
        <div className="space-y-4">
          {[
            {
              id: 1,
              title: "Senior Developer Interview",
              date: "Nov 19, 2025",
              duration: "45 minutes",
            },
            {
              id: 2,
              title: "Frontend Engineer Interview",
              date: "Nov 18, 2025",
              duration: "50 minutes",
            },
            {
              id: 3,
              title: "Backend Engineer Interview",
              date: "Nov 17, 2025",
              duration: "45 minutes",
            },
          ].map((history) => (
            <div
              key={history.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div>
                <h3 className="font-bold">{history.title}</h3>
                <p className="text-gray-600 text-sm">
                  Completed on {history.date}
                </p>
              </div>
              <div className="text-right">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                  Completed
                </span>
                <p className="text-gray-600 text-sm mt-1">{history.duration}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div
          className="fixed inset-0 bg-black/10 flex items-center justify-center z-50"
          onClick={() => setShowNewSessionModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Create New Session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Candidate Name
                </label>
                <input
                  type="text"
                  value={newSessionCandidate}
                  onChange={(e) => setNewSessionCandidate(e.target.value)}
                  placeholder="Enter candidate name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D20B3]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Interviewer Name
                </label>
                <input
                  type="text"
                  value={newSessionInterviewer}
                  onChange={(e) => setNewSessionInterviewer(e.target.value)}
                  placeholder="Enter interviewer name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D20B3]"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleNewSession}
                  className="flex-1 bg-[#5D20B3] text-white px-4 py-2 rounded-lg hover:bg-[#4a1a8a]"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewSessionModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Session Modal */}
      {showJoinModal && selectedSession && (
        <div
          className="fixed inset-0 bg-black/10 flex items-center justify-center z-50"
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Join Session</h2>
            <p className="text-gray-600 mb-4">
              Join session {selectedSession.id} with {selectedSession.candidate}
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmJoin}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Join Now
              </button>
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Session Modal */}
      {showViewModal && selectedSession && (
        <div
          className="fixed inset-0 bg-black/10 flex items-center justify-center z-50"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Session Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Session ID</p>
                <p className="font-medium">{selectedSession.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Candidate</p>
                <p className="font-medium">{selectedSession.candidate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Interviewer</p>
                <p className="font-medium">{selectedSession.interviewer}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="font-medium">{selectedSession.dateTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium">{selectedSession.duration}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                  {selectedSession.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowViewModal(false)}
              className="w-full mt-6 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
