const JobForm = require("../models/JobForm");
const FormSubmission = require("../models/FormSubmission");

const DEFAULT_UNKNOWN_EMAIL = "unknown@example.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const PERMANENT_FIELDS = [
  { label: "Full Name", type: "text", required: true },
  { label: "Email", type: "email", required: true },
];

const normalizeFieldLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isPermanentField = (field) => {
  const normalizedLabel = normalizeFieldLabel(field.label);

  if (field.type === "email" && normalizedLabel === "email") {
    return true;
  }

  if (
    field.type === "text" &&
    (normalizedLabel === "name" || normalizedLabel === "fullname")
  ) {
    return true;
  }

  return false;
};

const ensurePermanentFields = (fields = []) => {
  const sanitizedInput = (fields || [])
    .map((f) => ({
      label: String(f.label || "").trim(),
      type: f.type || "text",
      required: f.required !== false,
    }))
    .filter((f) => f.label.length > 0);

  const customFields = sanitizedInput.filter((field) => !isPermanentField(field));

  return [...PERMANENT_FIELDS, ...customFields].map((field, index) => ({
    label: field.label,
    type: field.type,
    required: true,
    order: index,
  }));
};

const extractSubmittedEmail = (submittedData = {}) => {
  const entries = Object.entries(submittedData || {});

  const directEmail = String(submittedData.email || "")
    .trim()
    .toLowerCase();

  if (EMAIL_PATTERN.test(directEmail) && directEmail !== DEFAULT_UNKNOWN_EMAIL) {
    return directEmail;
  }

  const matchedEmail = entries
    .map(([key, value]) => ({
      key: normalizeFieldLabel(key),
      value: String(value || "")
        .trim()
        .toLowerCase(),
    }))
    .find(
      (entry) =>
        entry.key.includes("email") &&
        EMAIL_PATTERN.test(entry.value) &&
        entry.value !== DEFAULT_UNKNOWN_EMAIL,
    );

  return matchedEmail ? matchedEmail.value : DEFAULT_UNKNOWN_EMAIL;
};

const hasSubmittedName = (submittedData = {}) => {
  const entries = Object.entries(submittedData || {});

  return entries.some(([key, value]) => {
    const normalizedKey = normalizeFieldLabel(key);
    if (normalizedKey !== "name" && normalizedKey !== "fullname") {
      return false;
    }

    return String(value || "").trim().length > 0;
  });
};

// Create a new job form
const createJobForm = async (req, res) => {
  try {
    const { title, description, fields, jobRole } = req.body;
    const userId = req.user?.id;

    if (!title || !userId) {
      return res.status(400).json({ error: "Title and user ID are required" });
    }

    const sanitizedFields = ensurePermanentFields(fields || []);

    const newForm = new JobForm({
      title: title.trim(),
      description: description?.trim() || "",
      jobRole: jobRole?.trim() || "",
      createdBy: userId,
      fields: sanitizedFields,
    });

    await newForm.save();
    res.status(201).json({
      message: "Job form created successfully",
      form: newForm,
    });
  } catch (error) {
    console.error("Error creating job form:", error);
    res.status(500).json({ error: "Failed to create job form" });
  }
};

// Get all job forms for authenticated user
const getAllJobForms = async (req, res) => {
  try {
    const userId = req.user?.id;

    const forms = await JobForm.find({ createdBy: userId })
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({
      forms,
      count: forms.length,
    });
  } catch (error) {
    console.error("Error fetching job forms:", error);
    res.status(500).json({ error: "Failed to fetch job forms" });
  }
};

// Get single job form by ID (for public view)
const getJobFormById = async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await JobForm.findById(formId).populate(
      "createdBy",
      "firstName lastName companyName",
    );

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    // Don't expose createdBy email for public view
    const publicForm = {
      id: form._id,
      title: form.title,
      description: form.description,
      jobRole: form.jobRole,
      fields: ensurePermanentFields(form.fields),
      isActive: form.isActive,
      company: form.createdBy?.companyName || "Our Company",
    };

    res.json(publicForm);
  } catch (error) {
    console.error("Error fetching job form:", error);
    res.status(500).json({ error: "Failed to fetch form" });
  }
};

// Update job form
const updateJobForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const { title, description, fields, jobRole, isActive } = req.body;
    const userId = req.user?.id;

    const form = await JobForm.findById(formId);

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    if (form.createdBy.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (title) form.title = title.trim();
    if (description !== undefined) form.description = description.trim();
    if (jobRole !== undefined) form.jobRole = jobRole.trim();
    if (typeof isActive === "boolean") form.isActive = isActive;

    if (fields && Array.isArray(fields)) {
      form.fields = ensurePermanentFields(fields);
    }

    await form.save();

    res.json({
      message: "Form updated successfully",
      form,
    });
  } catch (error) {
    console.error("Error updating job form:", error);
    res.status(500).json({ error: "Failed to update form" });
  }
};

// Delete job form
const deleteJobForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user?.id;

    const form = await JobForm.findById(formId);

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    if (form.createdBy.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Delete all submissions for this form
    await FormSubmission.deleteMany({ formId });

    await JobForm.findByIdAndDelete(formId);

    res.json({ message: "Form and its submissions deleted successfully" });
  } catch (error) {
    console.error("Error deleting job form:", error);
    res.status(500).json({ error: "Failed to delete form" });
  }
};

// Submit form response (public endpoint)
const submitFormResponse = async (req, res) => {
  try {
    const { formId } = req.params;
    const { submittedData } = req.body;

    if (!submittedData || Object.keys(submittedData).length === 0) {
      return res.status(400).json({ error: "No form data provided" });
    }

    const form = await JobForm.findById(formId);

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    if (!form.isActive) {
      return res
        .status(400)
        .json({ error: "This form is no longer accepting submissions" });
    }

    if (!hasSubmittedName(submittedData)) {
      return res.status(400).json({
        error: "Name is required",
      });
    }

    const submitterEmail = extractSubmittedEmail(submittedData);
    if (submitterEmail === DEFAULT_UNKNOWN_EMAIL) {
      return res.status(400).json({
        error: "Valid email is required",
      });
    }

    const submission = new FormSubmission({
      formId,
      submittedData,
      submitterEmail,
      ipAddress: req.ip || req.connection.remoteAddress || "",
    });

    await submission.save();

    // Update submission count
    form.submissionCount += 1;
    await form.save();

    res.status(201).json({
      message: "Form submitted successfully",
      submissionId: submission._id,
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({ error: "Failed to submit form" });
  }
};

// Get submissions for a form
const getFormSubmissions = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user?.id;
    const {
      sortBy = "latest",
      status = "all",
      page = 1,
      limit = 20,
    } = req.query;

    // Verify ownership
    const form = await JobForm.findById(formId);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    if (form.createdBy.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    let query = { formId };

    if (status !== "all") {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let sortOption = { createdAt: -1 };

    if (sortBy === "oldest") {
      sortOption = { createdAt: 1 };
    }

    const submissions = await FormSubmission.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FormSubmission.countDocuments(query);

    res.json({
      submissions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

// Update submission status
const updateSubmissionStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, notes, rating } = req.body;
    const userId = req.user?.id;

    const submission = await FormSubmission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Verify ownership
    const form = await JobForm.findById(submission.formId);
    if (form.createdBy.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (status) {
      if (!["submitted", "reviewed", "rejected", "accepted"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      submission.status = status;
    }

    if (notes !== undefined) {
      submission.notes = notes.trim();
    }

    if (rating !== undefined && rating >= 0 && rating <= 5) {
      submission.rating = rating;
    }

    await submission.save();

    res.json({
      message: "Submission updated successfully",
      submission,
    });
  } catch (error) {
    console.error("Error updating submission:", error);
    res.status(500).json({ error: "Failed to update submission" });
  }
};

module.exports = {
  createJobForm,
  getAllJobForms,
  getJobFormById,
  updateJobForm,
  deleteJobForm,
  submitFormResponse,
  getFormSubmissions,
  updateSubmissionStatus,
};
