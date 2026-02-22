export default function LiveMonitorPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-gray-500">Thursday, November 20</p>
        <h1 className="text-3xl font-bold">Live Monitor</h1>
      </div>

      {/* Live Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition">
            <div className="bg-gradient-to-r from-[#5D20B3] to-purple-700 h-32 flex items-center justify-center">
              <div className="text-center text-white">
                <p className="text-sm opacity-80">Session {i}</p>
                <p className="text-lg font-bold">Live Interview</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">Jane Candidate {i}</h3>
                  <p className="text-gray-600 text-sm">Software Engineer Position</p>
                </div>
                <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                  LIVE
                </span>
              </div>
              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <p>Interviewer: Mike Johnson</p>
                <p>Duration: 15 min 23 sec</p>
              </div>
              <button className="w-full bg-[#5D20B3] text-white py-2 rounded-lg hover:bg-[#4a1a8a] font-medium">
                View Session Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Active Sessions", value: "4", color: "bg-blue-100 text-blue-800" },
          { label: "Total Today", value: "8", color: "bg-green-100 text-green-800" },
          { label: "Avg. Duration", value: "42 min", color: "bg-purple-100 text-purple-800" },
          { label: "Completion Rate", value: "95%", color: "bg-orange-100 text-orange-800" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border p-6">
            <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color} inline-block px-3 py-1 rounded-lg`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recording Status */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">Session Recordings</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600 font-bold">
                  ●
                </div>
                <div>
                  <h3 className="font-bold">Session Recording {i}</h3>
                  <p className="text-gray-600 text-sm">Nov {20 - i}, 2:15 PM - 3:00 PM</p>
                </div>
              </div>
              <button className="text-[#5D20B3] text-sm font-medium hover:underline">
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
