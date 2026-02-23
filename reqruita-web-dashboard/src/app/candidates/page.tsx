export default function CandidatesPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-gray-500">Thursday, November 20</p>
        <h1 className="text-3xl font-bold">Candidates</h1>
      </div>

      {/* Candidates Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { stage: "Applied", count: 24, color: "bg-blue-100 text-blue-800" },
          {
            stage: "Screening",
            count: 12,
            color: "bg-yellow-100 text-yellow-800",
          },
          {
            stage: "Interview",
            count: 8,
            color: "bg-purple-100 text-purple-800",
          },
          { stage: "Offer", count: 3, color: "bg-green-100 text-green-800" },
          {
            stage: "Hired",
            count: 2,
            color: "bg-emerald-100 text-emerald-800",
          },
        ].map((stage) => (
          <div
            key={stage.stage}
            className="bg-white rounded-2xl border p-6 text-center hover:shadow-md transition"
          >
            <p className="text-gray-600 text-sm mb-2">{stage.stage}</p>
            <p
              className={`text-3xl font-bold ${stage.color} inline-block px-4 py-2 rounded-lg`}
            >
              {stage.count}
            </p>
          </div>
        ))}
      </div>

      {/* Candidates List */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">All Candidates</h2>
          <button className="bg-[#5D20B3] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4a1a8a]">
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
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const stages = ["Applied", "Screening", "Interview", "Offer"];
              const stage = stages[i % stages.length];
              const stageColors = {
                Applied: "bg-blue-100 text-blue-800",
                Screening: "bg-yellow-100 text-yellow-800",
                Interview: "bg-purple-100 text-purple-800",
                Offer: "bg-green-100 text-green-800",
              };
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-4 font-medium">Candidate {i}</td>
                  <td className="py-4">candidate{i}@email.com</td>
                  <td className="py-4">Software Engineer</td>
                  <td className="py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${stageColors[stage]}`}
                    >
                      {stage}
                    </span>
                  </td>
                  <td className="py-4">Nov {20 - i}, 2025</td>
                  <td className="py-4">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#5D20B3] h-2 rounded-full"
                        style={{ width: `${60 + i * 5}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-4 flex gap-2">
                    <button className="text-[#5D20B3] text-sm hover:underline">
                      View
                    </button>
                    <button className="text-gray-600 text-sm hover:underline">
                      Note
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Top Candidates */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">Top 3 Candidates</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#5D20B3] text-white rounded-full flex items-center justify-center font-bold">
                  {i}
                </div>
                <div>
                  <h3 className="font-bold">Top Candidate {i}</h3>
                  <p className="text-gray-600 text-sm">
                    Software Engineer • 95% Match
                  </p>
                </div>
              </div>
              <button className="bg-[#5D20B3] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4a1a8a]">
                Send Interview
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
