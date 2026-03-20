"use client";

import { DragEvent, useEffect, useState } from "react";
import {
  createJobForm,
  getAllJobForms,
  getFormSubmissions,
  updateFormSubmissionStatus,
  updateJobForm,
  deleteJobForm,
  JobForm,
  FormSubmission,
  FieldType,
} from "@/lib/api";

interface FormField {
  label: string;
  type: FieldType;
  required?: boolean;
  order?: number;
}

interface SubmissionWithForm extends FormSubmission {
  formTitle: string;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  phone: "Phone Number",
  email: "Email",
  file: "File Upload",
  link: "Link",
};

export default function JobFormsPage() {
  const [templates, setTemplates] = useState<JobForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<SubmissionWithForm[]>(
    [],
  );
  const [loadingForms, setLoadingForms] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingAllSubmissions, setLoadingAllSubmissions] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showViewSubmissionModal, setShowViewSubmissionModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<FormSubmission | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<JobForm | null>(
    null,
  );
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"latest" | "oldest">("latest");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form creation state
  const [newFormTitle, setNewFormTitle] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [newFormJobRole, setNewFormJobRole] = useState("");
  const [newFormFields, setNewFormFields] = useState<FormField[]>([]);

  // Form editing state
  const [editFormTitle, setEditFormTitle] = useState("");
  const [editFormDescription, setEditFormDescription] = useState("");
  const [editFormJobRole, setEditFormJobRole] = useState("");
  const [editFormFields, setEditFormFields] = useState<FormField[]>([]);

  // Load all forms on mount
  useEffect(() => {
    fetchAllForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (templates.length > 0) {
      fetchAllSubmissions(templates);
    } else {
      setAllSubmissions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, filterStatus]);

  const fetchAllForms = async () => {
    try {
      setLoadingForms(true);
      const { forms } = await getAllJobForms();
      setTemplates(forms);
      await fetchAllSubmissions(forms);
    } catch (error) {
      console.error("Failed to load forms:", error);
    } finally {
      setLoadingForms(false);
    }
  };

  const fetchAllSubmissions = async (forms: JobForm[]) => {
    if (forms.length === 0) {
      setAllSubmissions([]);
      setLoadingAllSubmissions(false);
      return;
    }

    try {
      setLoadingAllSubmissions(true);

      const responses = await Promise.all(
        forms.map(async (form) => {
          const { submissions: formSubmissions } = await getFormSubmissions(
            form._id,
            {
              sortBy,
              status: filterStatus === "all" ? undefined : filterStatus,
              page: 1,
              limit: 1000,
            },
          );

          return formSubmissions.map((submission) => ({
            ...submission,
            formTitle: form.title,
          }));
        }),
      );

      const merged = responses.flat();
      merged.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return sortBy === "latest" ? bTime - aTime : aTime - bTime;
      });

      setAllSubmissions(merged);
    } catch (error) {
      console.error("Failed to load all submissions:", error);
    } finally {
      setLoadingAllSubmissions(false);
    }
  };

  const fetchSubmissions = async (formId: string) => {
    try {
      setLoadingSubmissions(true);
      const { submissions: data } = await getFormSubmissions(formId, {
        sortBy,
        status: filterStatus === "all" ? undefined : filterStatus,
      });
      setSubmissions(data);
      setSelectedFormId(formId);
    } catch (error) {
      console.error("Failed to load submissions:", error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleCreateForm = async () => {
    if (!newFormTitle.trim()) {
      alert("Form title is required");
      return;
    }

    const sanitizedFields = newFormFields
      .map((f) => ({ ...f, label: f.label.trim() }))
      .filter((f) => f.label.length > 0);

    try {
      await createJobForm({
        title: newFormTitle,
        description: newFormDescription,
        jobRole: newFormJobRole,
        fields: sanitizedFields,
      });

      // Reset form and reload
      setNewFormTitle("");
      setNewFormDescription("");
      setNewFormJobRole("");
      setNewFormFields([]);
      setShowCreateModal(false);
      await fetchAllForms();
    } catch (error) {
      alert(
        `Failed to create form: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleEditForm = (form: JobForm) => {
    setSelectedTemplate(form);
    setEditFormTitle(form.title);
    setEditFormDescription(form.description);
    setEditFormJobRole(form.jobRole);
    setEditFormFields([...form.fields]);
    setShowEditModal(true);
  };

  const handleSaveEditForm = async () => {
    if (!selectedTemplate || !editFormTitle.trim()) {
      alert("Form title is required");
      return;
    }

    const sanitizedFields = editFormFields
      .map((f) => ({ ...f, label: f.label.trim() }))
      .filter((f) => f.label.length > 0);

    try {
      await updateJobForm(selectedTemplate._id, {
        title: editFormTitle,
        description: editFormDescription,
        jobRole: editFormJobRole,
        fields: sanitizedFields,
      });

      setShowEditModal(false);
      setSelectedTemplate(null);
      await fetchAllForms();
    } catch (error) {
      alert(
        `Failed to update form: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this form and all its submissions?",
      )
    ) {
      return;
    }

    try {
      await deleteJobForm(formId);
      await fetchAllForms();
      if (selectedFormId === formId) {
        setSelectedFormId(null);
        setSubmissions([]);
      }
    } catch (error) {
      alert(
        `Failed to delete form: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleUpdateSubmissionStatus = async (
    submissionId: string,
    status: "submitted" | "reviewed" | "rejected" | "accepted",
  ) => {
    try {
      await updateFormSubmissionStatus(submissionId, { status });
      if (selectedFormId) {
        await fetchSubmissions(selectedFormId);
      }
      await fetchAllSubmissions(templates);
    } catch (error) {
      alert(
        `Failed to update submission: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleCopyLink = (formId: string) => {
    const formUrl = `${window.location.origin}/apply/${formId}`;
    navigator.clipboard.writeText(formUrl).then(() => {
      setCopySuccess(formId);
      setTimeout(() => setCopySuccess(null), 2000);
    });
  };

  const handleFieldChange = (
    index: number,
    key: keyof FormField,
    value: string,
    isEdit: boolean,
  ) => {
    if (isEdit) {
      setEditFormFields((prev) =>
        prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)),
      );
    } else {
      setNewFormFields((prev) =>
        prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)),
      );
    }
  };

  const handleAddField = (isEdit: boolean) => {
    if (isEdit) {
      setEditFormFields((prev) => [...prev, { label: "", type: "text" }]);
    } else {
      setNewFormFields((prev) => [...prev, { label: "", type: "text" }]);
    }
  };

  const handleRemoveField = (index: number, isEdit: boolean) => {
    if (isEdit) {
      setEditFormFields((prev) => prev.filter((_, i) => i !== index));
    } else {
      setNewFormFields((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleDragStart = (
    e: DragEvent<HTMLDivElement>,
    index: number,
    isEdit: boolean,
  ) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ index, isEdit }));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    e: DragEvent<HTMLDivElement>,
    targetIndex: number,
    isEdit: boolean,
  ) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));

    if (data.isEdit !== isEdit || data.index === targetIndex) return;

    if (isEdit) {
      const fields = [...editFormFields];
      const [movedField] = fields.splice(data.index, 1);
      fields.splice(targetIndex, 0, movedField);
      setEditFormFields(fields);
    } else {
      const fields = [...newFormFields];
      const [movedField] = fields.splice(data.index, 1);
      fields.splice(targetIndex, 0, movedField);
      setNewFormFields(fields);
    }
  };

  const renderFormModal = (isEdit: boolean) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    const setIsOpen = isEdit ? setShowEditModal : setShowCreateModal;
    const fields = isEdit ? editFormFields : newFormFields;
    const title = isEdit ? editFormTitle : newFormTitle;
    const setTitle = isEdit ? setEditFormTitle : setNewFormTitle;
    const description = isEdit ? editFormDescription : newFormDescription;
    const setDescription = isEdit
      ? setEditFormDescription
      : setNewFormDescription;
    const jobRole = isEdit ? editFormJobRole : newFormJobRole;
    const setJobRole = isEdit ? setEditFormJobRole : setNewFormJobRole;

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={() => setIsOpen(false)}
      >
        <div
          className="bg-white rounded-3xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isEdit ? "Edit Form" : "Create New Form"}
            </h2>
            <p className="text-gray-600">
              {isEdit
                ? "Modify your job application form"
                : "Build a custom job application form to collect candidate information"}
            </p>
          </div>

          <div className="space-y-8">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </span>
                Basic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Form Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-600 focus:bg-purple-50 transition text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the title candidates will see
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Job Role{" "}
                      <span className="text-gray-400 text-xs font-normal">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={jobRole}
                      onChange={(e) => setJobRole(e.target.value)}
                      placeholder="e.g., Engineering"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-600 focus:bg-purple-50 transition text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">
                      Department
                    </label>
                    <div className="text-xs text-gray-500 px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50">
                      Auto-filled from job role
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description{" "}
                    <span className="text-gray-400 text-xs font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell candidates about the role and what you're looking for..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-600 focus:bg-purple-50 transition resize-none text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {description.length}/500 characters
                  </p>
                </div>
              </div>
            </div>

            {/* Form Fields Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </span>
                Form Fields
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Customize the fields candidates need to fill out. Drag to
                reorder.
              </p>

              <div className="space-y-3 mb-6 bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border-2 border-dashed border-gray-300">
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">
                      No fields added yet. Click &ldquo;Add Field&rdquo; below
                      to get started.
                    </p>
                  </div>
                ) : (
                  fields.map((field, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx, isEdit)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx, isEdit)}
                      className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg transition cursor-move group"
                    >
                      <div className="text-gray-400 group-hover:text-purple-600 text-xl font-bold transition">
                        ⋮
                      </div>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "label",
                            e.target.value,
                            isEdit,
                          )
                        }
                        placeholder="Field label (e.g., Full Name, Portfolio URL)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                      />
                      <select
                        value={field.type}
                        onChange={(e) =>
                          handleFieldChange(idx, "type", e.target.value, isEdit)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-semibold bg-white text-gray-700 cursor-pointer"
                      >
                        {Object.entries(FIELD_TYPE_LABELS).map(
                          ([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(idx, isEdit)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => handleAddField(isEdit)}
                className="flex items-center gap-2 px-4 py-3 bg-purple-50 border-2 border-purple-200 text-purple-600 hover:bg-purple-100 hover:border-purple-400 rounded-xl font-semibold text-sm transition"
              >
                <span className="text-lg">+</span> Add Field
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-10 pt-6 border-t border-gray-200">
            <button
              onClick={isEdit ? handleSaveEditForm : handleCreateForm}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition active:scale-95 shadow-lg hover:shadow-xl"
            >
              {isEdit ? "Save Changes" : "Create Form"}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-gray-500">Thursday, November 20</p>
        <h1 className="text-4xl font-bold">Job Forms</h1>
      </div>

      {/* Form Templates Section */}
      <div className="bg-white rounded-2xl border p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Form Templates</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition active:scale-95"
          >
            + Create New Form
          </button>
        </div>

        {loadingForms ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading forms...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-lg mb-4">No forms created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((form) => (
              <div
                key={form._id}
                className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
              >
                <h3 className="font-bold text-lg mb-2">{form.title}</h3>
                {form.jobRole && (
                  <p className="text-sm text-gray-500 mb-2">
                    📍 {form.jobRole}
                  </p>
                )}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {form.description}
                </p>

                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 flex-wrap">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {form.submissionCount} submissions
                  </span>
                  {form.isActive ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium text-xs">
                      ● Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium text-xs">
                      ● Inactive
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      fetchSubmissions(form._id);
                      setShowSubmissionsModal(true);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition active:scale-95"
                  >
                    View Submissions ({form.submissionCount})
                  </button>

                  <button
                    onClick={() => handleCopyLink(form._id)}
                    className="w-full bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg text-sm font-semibold transition active:scale-95"
                  >
                    {copySuccess === form._id ? "✓ Copied!" : "🔗 Copy Link"}
                  </button>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleEditForm(form)}
                      className="flex-1 text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-lg text-sm font-medium transition border border-purple-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteForm(form._id)}
                      className="flex-1 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition border border-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Submissions Table */}
      <div className="bg-white rounded-2xl border p-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <h2 className="text-2xl font-bold">All Submissions</h2>
          <div className="flex gap-3 flex-wrap">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "latest" | "oldest")}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 font-medium"
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 font-medium"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loadingForms || loadingAllSubmissions ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading submissions...</p>
          </div>
        ) : allSubmissions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No submissions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Form</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">
                    Submitted
                  </th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allSubmissions.map((sub) => (
                  <tr
                    key={sub._id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {sub.formTitle}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {sub.submitterEmail}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          sub.status === "accepted"
                            ? "bg-green-100 text-green-800"
                            : sub.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : sub.status === "reviewed"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedSubmission(sub);
                          setShowViewSubmissionModal(true);
                        }}
                        className="text-purple-600 hover:underline font-semibold transition"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submissions Modal */}
      {showSubmissionsModal && selectedFormId && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSubmissionsModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6">Form Submissions</h2>

            <div className="mb-6 flex gap-4 flex-wrap">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as "latest" | "oldest");
                  if (selectedFormId) {
                    fetchSubmissions(selectedFormId);
                  }
                }}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 font-medium"
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  if (selectedFormId) {
                    fetchSubmissions(selectedFormId);
                  }
                }}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 font-medium"
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {loadingSubmissions ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No submissions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Submitted
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr
                        key={sub._id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 font-medium">
                          {sub.submitterEmail}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              sub.status === "accepted"
                                ? "bg-green-100 text-green-800"
                                : sub.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : sub.status === "reviewed"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setShowViewSubmissionModal(true);
                            }}
                            className="text-purple-600 hover:underline font-semibold transition"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={() => setShowSubmissionsModal(false)}
              className="mt-6 w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* View Submission Modal */}
      {showViewSubmissionModal && selectedSubmission && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
          onClick={() => setShowViewSubmissionModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6">Submission Details</h2>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-lg text-gray-900 font-medium">
                    {selectedSubmission.submitterEmail}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={selectedSubmission.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as
                        | "submitted"
                        | "reviewed"
                        | "rejected"
                        | "accepted";
                      handleUpdateSubmissionStatus(
                        selectedSubmission._id,
                        newStatus,
                      );
                      setSelectedSubmission({
                        ...selectedSubmission,
                        status: newStatus,
                      });
                    }}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 font-medium"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Submitted Data
                </label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                  {Object.entries(selectedSubmission.submittedData).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="border-b border-gray-200 pb-3 last:border-b-0"
                      >
                        <p className="text-sm font-semibold text-gray-700">
                          {key}
                        </p>
                        <p className="text-gray-900 break-all text-sm mt-1">
                          {String(value)}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  defaultValue={selectedSubmission.notes}
                  onBlur={(e) => {
                    if (e.target.value !== selectedSubmission.notes) {
                      updateFormSubmissionStatus(selectedSubmission._id, {
                        notes: e.target.value,
                      }).then(() => {
                        setSelectedSubmission({
                          ...selectedSubmission,
                          notes: e.target.value,
                        });
                      });
                    }
                  }}
                  placeholder="Add notes about this application..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => setShowViewSubmissionModal(false)}
              className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Form Modals */}
      {renderFormModal(false)}
      {renderFormModal(true)}
    </div>
  );
}
