export default function JobFormsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-gray-500">Thursday, November 20</p>
        <h1 className="text-3xl font-bold">Job Forms</h1>
      </div>

      {/* Job Forms Section */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Job Application Form Submissions</h2>
          <button className="bg-[#5D20B3] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4a1a8a]">
            Create New Form
          </button>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-400 border-b">
              <th className="py-3 font-medium">Date</th>
              <th className="py-3 font-medium">Job Role</th>
              <th className="py-3 font-medium">Name</th>
              <th className="py-3 font-medium">Email</th>
              <th className="py-3 font-medium">Status</th>
              <th className="py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-4">July {16 + i}, 2025</td>
                <td className="py-4">Software Engineer</td>
                <td className="py-4">John Doe</td>
                <td className="py-4">john@email.com</td>
                <td className="py-4">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                    Submitted
                  </span>
                </td>
                <td className="py-4 flex gap-2">
                  <button className="bg-[#5D20B3] text-white px-3 py-1 rounded text-xs hover:bg-[#4a1a8a]">
                    View
                  </button>
                  <button className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-50">
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Templates */}
      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">Form Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {["Software Engineer", "Product Manager", "Data Analyst", "UI Designer", "DevOps Engineer"].map(
            (title) => (
              <div
                key={title}
                className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
              >
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Customizable form template for {title} positions
                </p>
                <button className="text-[#5D20B3] text-sm font-medium hover:underline">
                  Edit Template →
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
