"use client";

import { useState, useEffect } from "react";
import { getToken, AUTH_API_BASE } from "@/lib/api";

export default function UserRolesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("interviewer");

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [editRole, setEditRole] = useState("interviewer");
  const [editStatus, setEditStatus] = useState("active");

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Current User State
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Status State
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch Users on Load
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        window.location.href = "/signin";
        return;
      }

      // decode token to get role
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserRole(payload.role);
        
        if (payload.role !== 'admin') {
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("Error decoding token");
      }

      const res = await fetch(`${AUTH_API_BASE}/api/dashboard/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      } else {
        setError(data.message || "Failed to load users. Your session might have expired.");
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
      setError("Network error: Could not reach the backend dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !role) {
      setError("Please fill all required fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        setError("You are not authenticated.");
        return;
      }

      console.log("Sending Add User data:", { email, role, firstName, lastName });
      const res = await fetch(`${AUTH_API_BASE}/api/dashboard/users/add-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email, role, firstName, lastName })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to invite user");
      } else {
        setSuccess(data.message || "Invitation sent successfully!");
        setEmail("");
        setFirstName("");
        setLastName("");
        setRole("interviewer");

        // Refresh the table with the new user
        fetchUsers();

        setTimeout(() => {
          setIsModalOpen(false);
          setSuccess("");
        }, 2000);
      }
    } catch (err) {
      setError("Server error. Please try again.");
    }
  };

  const handleEditUserClick = (user: any) => {
    setUserToEdit(user);
    setEditRole(user.role);
    setEditStatus(user.status || "active");
    setIsEditModalOpen(true);
  };

  const confirmEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!userToEdit) return;

    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`${AUTH_API_BASE}/api/dashboard/users/${userToEdit._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role: editRole, status: editStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to update role");
      } else {
        setSuccess("User role updated successfully!");
        fetchUsers();
        setTimeout(() => {
          setIsEditModalOpen(false);
          setSuccess("");
          setUserToEdit(null);
        }, 1500);
      }
    } catch (err) {
      setError("Server error. Please try again.");
    }
  };

  const handleDeleteUserClick = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      console.log("Confirmation: Starting delete request for user ID:", userToDelete);
      const token = getToken();
      if (!token) {
        console.error("Delete Error: No token found");
        return;
      }

      const res = await fetch(`${AUTH_API_BASE}/api/dashboard/users/${userToDelete}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const data = await res.json();
      console.log("Delete Response Data:", data);

      if (!res.ok) {
        setError(data.message || "Failed to delete user");
        setTimeout(() => setError(""), 3000);
      } else {
        setSuccess("User removed successfully");
        fetchUsers();
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Delete Request Failed Exception:", err);
      setError("Server error. Please try again.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const getRoleColor = (roleStr: string) => {
    switch (roleStr) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'interviewer': return 'bg-blue-100 text-blue-800';
      case 'recruiter': return 'bg-orange-100 text-orange-800';
      case 'hr manager': return 'bg-teal-100 text-teal-800';
      case 'candidate': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-gray-500">Thursday, November 20</p>
        <h1 className="text-3xl font-bold">User & Roles</h1>
      </div>

      {/* Users Section */}
      <div className="bg-white rounded-2xl border p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Users</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#5D20B3] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4a1a8a] transition-colors shadow-sm">
            Invite New User
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
             <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading users...</div>
        ) : (
          <div className="relative">
            {/* Blurred Overlay for non-admins */}
            {currentUserRole !== 'admin' && (
              <div className="absolute inset-x-0 inset-y-0 z-10 backdrop-blur-md bg-white/40 flex flex-col items-center justify-center rounded-xl border border-white/50 shadow-sm p-8 text-center animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center mb-4 shadow-sm border border-purple-100">
                  <svg className="w-8 h-8 text-[#5D20B3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Administrative Restricted Area</h3>
                <p className="text-gray-600 max-w-sm">
                  You don't have permission to manage roles. Please contact your main administrator to upgrade your account access.
                </p>
              </div>
            )}

            <div className={`space-y-8 ${currentUserRole !== 'admin' ? 'opacity-40 pointer-events-none filter grayscale-[0.2]' : ''}`}>
              {/* Admins Table */}
              <div className="overflow-x-auto">
                <h3 className="text-lg font-semibold mb-4 text-[#5D20B3]">Administrators</h3>
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
                  {users.filter(u => u.role === 'admin' || u.isMainAdmin).map((user: any) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 font-medium">{user.fullName || "Admin User"}</td>
                      <td className="py-4 text-gray-600">{user.email}</td>
                      <td className="py-4">
                        <div className="flex flex-col items-start gap-1">
                          {user.isMainAdmin ? (
                            <span className="text-[10px] bg-purple-200 text-purple-900 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                              Main Admin
                            </span>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getRoleColor(user.role)}`}>
                              {user.role}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${user.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-4 flex gap-3">
                        {!user.isMainAdmin && (
                          <button onClick={() => handleEditUserClick(user)} className="text-[#5D20B3] text-sm hover:underline font-medium">Edit</button>
                        )}
                        {!user.isMainAdmin && (
                          <button onClick={() => handleDeleteUserClick(user._id)} className="text-red-600 text-sm hover:underline font-medium">Remove</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Interviewers Table */}
            <div className="overflow-x-auto pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4 text-blue-600">Interviewers</h3>
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
                  {users.filter(u => u.role === 'interviewer').map((user: any) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 font-medium">{user.fullName}</td>
                      <td className="py-4 text-gray-600">{user.email}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${user.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-4 flex gap-3">
                        <button onClick={() => handleEditUserClick(user)} className="text-[#5D20B3] text-sm hover:underline font-medium">Edit</button>
                        <button onClick={() => handleDeleteUserClick(user._id)} className="text-red-600 text-sm hover:underline font-medium">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {users.filter(u => u.role === 'interviewer').length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-gray-500 text-sm">No interviewers found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-1 text-slate-800">Invite New User</h2>
            <p className="text-sm text-slate-500 mb-6">Send an invitation link to join the dashboard.</p>

            {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>{error}</div>}
            {success && <div className="mb-4 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>{success}</div>}

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#5D20B3]/20 focus:border-[#5D20B3] outline-none transition-all"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#5D20B3]/20 focus:border-[#5D20B3] outline-none transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#5D20B3]/20 focus:border-[#5D20B3] outline-none transition-all"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#5D20B3]/20 focus:border-[#5D20B3] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="admin">Administrator</option>
                  <option value="interviewer">Interviewer</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="hr manager">HR Manager</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setError(""); setSuccess(""); }}
                  className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5D20B3] text-white font-medium hover:bg-[#4a1a8a] rounded-lg transition-all shadow-sm flex items-center gap-2"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit User Modal */}
      {isEditModalOpen && userToEdit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-1 text-slate-800">Edit User Role</h2>
            <p className="text-sm text-slate-500 mb-6">Change the role for {userToEdit.email}</p>

            {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2">{error}</div>}
            {success && <div className="mb-4 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 flex items-center gap-2">{success}</div>}

            <form onSubmit={confirmEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#5D20B3]/20 focus:border-[#5D20B3] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="admin">Administrator</option>
                  <option value="interviewer">Interviewer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#5D20B3]/20 focus:border-[#5D20B3] outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t mt-6">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setError(""); setSuccess(""); setUserToEdit(null); }}
                  className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5D20B3] text-white font-medium hover:bg-[#4a1a8a] rounded-lg transition-all shadow-sm flex items-center gap-2"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-2 text-slate-800">Remove User</h2>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to completely remove this user? This action cannot be undone.</p>

            {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}

            <div className="flex justify-center gap-3">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setUserToDelete(null); setError(""); }}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-all w-full"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-5 py-2.5 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-all shadow-sm w-full"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
