export default function UserRolesPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-gray-500">Thursday, November 20</p>
        <h1 className="text-3xl font-bold">User & Roles</h1>
      </div>

      {/* Users Section */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Users</h2>
          <button className="bg-[#5D20B3] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4a1a8a]">
            Add New User
          </button>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-400 border-b">
              <th className="py-3 font-medium">Name</th>
              <th className="py-3 font-medium">Email</th>
              <th className="py-3 font-medium">Role</th>
              <th className="py-3 font-medium">Status</th>
              <th className="py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[
              "Admin",
              "Interviewer",
              "Recruiter",
              "HR Manager",
              "Candidate",
            ].map((role, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-4">John Smith</td>
                <td className="py-4">john.smith@company.com</td>
                <td className="py-4">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                    {role}
                  </span>
                </td>
                <td className="py-4">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                    Active
                  </span>
                </td>
                <td className="py-4 flex gap-2">
                  <button className="text-[#5D20B3] text-sm hover:underline">
                    Edit
                  </button>
                  <button className="text-red-600 text-sm hover:underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Roles Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { name: "Admin", permission: "Full Access" },
          { name: "Interviewer", permission: "Interview & Feedback" },
          {
            name: "Recruiter",
            permission: "Job Posting & Candidate Management",
          },
          { name: "HR Manager", permission: "Reports & Settings" },
          { name: "Candidate", permission: "View & Apply" },
        ].map((role) => (
          <div key={role.name} className="bg-white rounded-2xl border p-6">
            <h3 className="font-bold text-lg mb-2">{role.name}</h3>
            <p className="text-gray-600 text-sm mb-4">{role.permission}</p>
            <button className="text-[#5D20B3] text-sm font-medium hover:underline">
              Configure Permissions →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
