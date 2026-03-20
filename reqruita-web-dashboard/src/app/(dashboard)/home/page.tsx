"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // March 2026
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  // Sessions data
  const sessions = [
    {
      id: "session-1",
      name: "Frontend Engineers - Round 1",
      jobTitle: "Senior Frontend Engineer",
      date: "July 25, 2025",
      candidates: 5,
      status: "Scheduled",
    },
    {
      id: "session-2",
      name: "Backend Engineers - Round 1",
      jobTitle: "Backend Engineer",
      date: "July 26, 2025",
      candidates: 3,
      status: "Scheduled",
    },
  ];

  const handleCreateTask = () => {
    if (taskTitle.trim()) {
      alert(`Task created: ${taskTitle}`);
      setTaskTitle("");
      setTaskDescription("");
      setShowTaskModal(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  };

  return (
    <div className="grid gap-8">
      {/* Left Column: Stats & Tables */}
      <div className="space-y-8">
        <div>
          <p className="text-gray-500">Friday, March 2, 2026</p>
          <h1 className="text-3xl font-bold">Good day, Bob!</h1>
        </div>

        {/* Sessions Card */}
        <div className="bg-white rounded-2xl border p-6 min-h-[200px]">
          <h2 className="text-xl font-bold mb-6">Upcoming Sessions</h2>
          {sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{session.name}</p>
                      <p className="text-sm text-gray-500">
                        {session.jobTitle}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {session.date} • {session.candidates} candidates
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push("/sessions")}
                        className="text-sm font-medium text-[#5D20B3] bg-purple-100 px-3 py-1 rounded-full hover:bg-purple-200 transition"
                      >
                        View Session
                      </button>
                      <span className="text-sm font-medium text-[#5D20B3] bg-purple-100 px-3 py-1 rounded-full">
                        {session.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              No upcoming sessions
            </div>
          )}
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">
              Job Application Form Submissions
            </h2>
            <button
              onClick={() => router.push("/job-forms")}
              className="text-[#5D20B3] text-sm font-medium hover:underline"
            >
              View All &gt;
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-400 border-b">
                <th className="py-3 font-medium">Date</th>
                <th className="py-3 font-medium">Job Role</th>
                <th className="py-3 font-medium">Name</th>
                <th className="py-3 font-medium">Email</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-4">July 16, 2025</td>
                  <td className="py-4">Software Engineer</td>
                  <td className="py-4">John</td>
                  <td className="py-4">john@email.com</td>
                  <td className="py-4">
                    <button className="bg-[#5D20B3] text-white px-3 py-1 rounded text-xs hover:bg-[#4a1a8a]">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
