export default function SessionsPage() {
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
          <button className="bg-[#5D20B3] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4a1a8a]">
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
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-4">SES-{2025000 + i}</td>
                <td className="py-4">Jane Candidate</td>
                <td className="py-4">Mike Interviewer</td>
                <td className="py-4">Nov 20, 2:00 PM</td>
                <td className="py-4">45 min</td>
                <td className="py-4">
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                    In Progress
                  </span>
                </td>
                <td className="py-4 flex gap-2">
                  <button className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">
                    Join
                  </button>
                  <button className="text-[#5D20B3] text-sm hover:underline">
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
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div>
                <h3 className="font-bold">
                  Session {i}: Senior Developer Interview
                </h3>
                <p className="text-gray-600 text-sm">
                  Completed on Nov {20 - i}, 2025
                </p>
              </div>
              <div className="text-right">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                  Completed
                </span>
                <p className="text-gray-600 text-sm mt-1">45 minutes</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
