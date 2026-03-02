"use client";

import { useState } from "react";

interface Candidate {
  id: number;
  name: string;
  email: string;
  position: string;
  stage: "Applied" | "Screening" | "Interview" | "Offer";
  appliedDate: string;
  score: number;
  notes: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([
    {
      id: 1,
      name: "Candidate 1",
      email: "candidate1@email.com",
      position: "Software Engineer",
      stage: "Applied",
      appliedDate: "Nov 19, 2025",
      score: 60,
      notes: "Great technical skills",
    },
    {
      id: 2,
      name: "Candidate 2",
      email: "candidate2@email.com",
      position: "Software Engineer",
      stage: "Screening",
      appliedDate: "Nov 18, 2025",
      score: 65,
      notes: "Good communication",
    },
    {
      id: 3,
      name: "Candidate 3",
      email: "candidate3@email.com",
      position: "Software Engineer",
      stage: "Interview",
      appliedDate: "Nov 17, 2025",
      score: 70,
      notes: "Excellent problem solving",
    },
    {
      id: 4,
      name: "Candidate 4",
      email: "candidate4@email.com",
      position: "Software Engineer",
      stage: "Offer",
      appliedDate: "Nov 16, 2025",
      score: 75,
      notes: "Perfect fit for team",
    },
    {
      id: 5,
      name: "Candidate 5",
      email: "candidate5@email.com",
      position: "Software Engineer",
      stage: "Applied",
      appliedDate: "Nov 15, 2025",
      score: 80,
      notes: "Strong portfolio",
    },
    {
      id: 6,
      name: "Candidate 6",
      email: "candidate6@email.com",
      position: "Software Engineer",
      stage: "Screening",
      appliedDate: "Nov 14, 2025",
      score: 85,
      notes: "Impressive experience",
    },
    {
      id: 7,
      name: "Candidate 7",
      email: "candidate7@email.com",
      position: "Software Engineer",
      stage: "Interview",
      appliedDate: "Nov 13, 2025",
      score: 90,
      notes: "Outstanding candidate",
    },
    {
      id: 8,
      name: "Candidate 8",
      email: "candidate8@email.com",
      position: "Software Engineer",
      stage: "Applied",
      appliedDate: "Nov 12, 2025",
      score: 95,
      notes: "Top candidate",
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null,
  );
  const [newCandidateName, setNewCandidateName] = useState("");
  const [newCandidateEmail, setNewCandidateEmail] = useState("");
  const [noteText, setNoteText] = useState("");

  const handleAddCandidate = () => {
    if (newCandidateName.trim() && newCandidateEmail.trim()) {
      const newCandidate: Candidate = {
        id: candidates.length + 1,
        name: newCandidateName,
        email: newCandidateEmail,
        position: "Software Engineer",
        stage: "Applied",
        appliedDate: new Date().toLocaleDateString(),
        score: 50,
        notes: "",
      };
      setCandidates([...candidates, newCandidate]);
      setNewCandidateName("");
      setNewCandidateEmail("");
      setShowAddModal(false);
      alert("Candidate added successfully!");
    }
  };

  const handleViewCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowViewModal(true);
  };

  const handleAddNote = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setNoteText(candidate.notes);
    setShowNoteModal(true);
  };

  const handleSaveNote = () => {
    if (selectedCandidate) {
      setCandidates(
        candidates.map((c) =>
          c.id === selectedCandidate.id ? { ...c, notes: noteText } : c,
        ),
      );
      setShowNoteModal(false);
      alert("Note saved successfully!");
    }
  };

  const handleSendInterview = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowInterviewModal(true);
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      Applied: "bg-blue-100 text-blue-800",
      Screening: "bg-yellow-100 text-yellow-800",
      Interview: "bg-purple-100 text-purple-800",
      Offer: "bg-green-100 text-green-800",
    };
    return colors[stage] || "bg-gray-100 text-gray-800";
  };

  const topCandidates = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-gray-500">Thursday, November 20</p>
        <h1 className="text-3xl font-bold">Candidates</h1>
      </div>

      {/* Candidates Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          {
            stage: "Applied",
            count: candidates.filter((c) => c.stage === "Applied").length,
          },
          {
            stage: "Screening",
            count: candidates.filter((c) => c.stage === "Screening").length,
          },
          {
            stage: "Interview",
            count: candidates.filter((c) => c.stage === "Interview").length,
          },
          {
            stage: "Offer",
            count: candidates.filter((c) => c.stage === "Offer").length,
          },
          { stage: "Hired", count: 2 },
        ].map((stage) => (
          <div
            key={stage.stage}
            className="bg-white rounded-2xl border p-6 text-center hover:shadow-md transition"
          >
            <p className="text-gray-600 text-sm mb-2">{stage.stage}</p>
            <p className="text-3xl font-bold bg-blue-100 text-blue-800 inline-block px-4 py-2 rounded-lg">
              {stage.count}
            </p>
          </div>
        ))}
      </div>

      {/* Candidates List */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">All Candidates</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#5D20B3] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4a1a8a]"
          >
            Add Candidate
          </button>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-400 border-b">
              <th className="py-3 font-medium">Name</th>
              <th className="py-3 font-medium">Email</th>
              <th className="py-3 font-medium">Position</th>
              <th className="py-3 font-medium">Stage</th>
              <th className="py-3 font-medium">Applied Date</th>
              <th className="py-3 font-medium">Score</th>
              <th className="py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="hover:bg-gray-50">
                <td className="py-4 font-medium">{candidate.name}</td>
                <td className="py-4">{candidate.email}</td>
                <td className="py-4">{candidate.position}</td>
                <td className="py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(candidate.stage)}`}
                  >
                    {candidate.stage}
                  </span>
                </td>
                <td className="py-4">{candidate.appliedDate}</td>
                <td className="py-4">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#5D20B3] h-2 rounded-full"
                      style={{ width: `${candidate.score}%` }}
                    ></div>
                  </div>
                </td>
                <td className="py-4 flex gap-2">
                  <button
                    onClick={() => handleViewCandidate(candidate)}
                    className="text-[#5D20B3] text-sm hover:underline"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleAddNote(candidate)}
                    className="text-gray-600 text-sm hover:underline"
                  >
                    Note
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Candidates */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">Top 3 Candidates</h2>
        <div className="space-y-4">
          {topCandidates.map((candidate, idx) => (
            <div
              key={candidate.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#5D20B3] text-white rounded-full flex items-center justify-center font-bold">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="font-bold">{candidate.name}</h3>
                  <p className="text-gray-600 text-sm">
                    {candidate.position} • {candidate.score}% Match
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleSendInterview(candidate)}
                className="bg-[#5D20B3] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4a1a8a]"
              >
                Send Interview
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/10 flex items-center justify-center z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Add New Candidate</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newCandidateName}
                  onChange={(e) => setNewCandidateName(e.target.value)}
                  placeholder="Candidate name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D20B3]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={newCandidateEmail}
                  onChange={(e) => setNewCandidateEmail(e.target.value)}
                  placeholder="candidate@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D20B3]"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddCandidate}
                  className="flex-1 bg-[#5D20B3] text-white px-4 py-2 rounded-lg hover:bg-[#4a1a8a]"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Candidate Modal */}
      {showViewModal && selectedCandidate && (
        <div
          className="fixed inset-0 bg-black/10 flex items-center justify-center z-50"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">
              {selectedCandidate.name}
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{selectedCandidate.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Position</p>
                <p className="font-medium">{selectedCandidate.position}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Stage</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(selectedCandidate.stage)}`}
                >
                  {selectedCandidate.stage}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Applied Date</p>
                <p className="font-medium">{selectedCandidate.appliedDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Match Score</p>
                <p className="font-medium">{selectedCandidate.score}%</p>
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

      {/* Add Note Modal */}
      {showNoteModal && selectedCandidate && (
        <div
          className="fixed inset-0 bg-black/10 flex items-center justify-center z-50"
          onClick={() => setShowNoteModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">
              Add Note for {selectedCandidate.name}
            </h2>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your notes here..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5D20B3]"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveNote}
                className="flex-1 bg-[#5D20B3] text-white px-4 py-2 rounded-lg hover:bg-[#4a1a8a]"
              >
                Save Note
              </button>
              <button
                onClick={() => setShowNoteModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Interview Modal */}
      {showInterviewModal && selectedCandidate && (
        <div
          className="fixed inset-0 bg-black/10 flex items-center justify-center z-50"
          onClick={() => setShowInterviewModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">
              Send Interview Invitation
            </h2>
            <p className="text-gray-600 mb-4">
              Send interview invitation to {selectedCandidate.name}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  alert(
                    `Interview invitation sent to ${selectedCandidate.name}!`,
                  );
                  setShowInterviewModal(false);
                }}
                className="flex-1 bg-[#5D20B3] text-white px-4 py-2 rounded-lg hover:bg-[#4a1a8a]"
              >
                Send
              </button>
              <button
                onClick={() => setShowInterviewModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
