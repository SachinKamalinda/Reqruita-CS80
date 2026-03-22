const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require("dotenv").config();
const mongoose = require("mongoose");
const getDb = require("../desktop-app/src/config/sqlite");
const { syncAuthData } = require("../desktop-app/src/services/syncService");

const User = require("../dashboard/src/models/User");
const FormSubmission = require("../dashboard/src/models/FormSubmission");
const InterviewSession = require("../dashboard/src/models/InterviewSession");
const Company = require("../dashboard/src/models/Company");
const JobForm = require("../dashboard/src/models/JobForm");

async function runTest() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reqruita");
        console.log("Connected to MongoDB.\n");

        console.log("Creating mock data in MongoDB...");
        const adminId = new mongoose.Types.ObjectId();
        const company = await new Company({
            name: "Test Sync Company",
            mainAdminId: adminId,
            plan: "free",
            status: "active"
        }).save({ validateBeforeSave: false });

        const jobForm = await new JobForm({
            companyId: company._id,
            title: "Test Sync Job",
            description: "Sync Test Description",
            status: "published"
        }).save({ validateBeforeSave: false });

        const user = await new User({
            firstName: "Alice",
            lastName: "SyncInterviewer",
            email: "alice.sync@reqruita.com",
            role: "interviewer",
            companyId: company._id
        }).save({ validateBeforeSave: false });

        const formSub = await new FormSubmission({
            formId: jobForm._id,
            submitterEmail: "bob.candidate@reqruita.com",
            submittedData: { name: "Bob SyncCandidate" }
        }).save({ validateBeforeSave: false });

        const session = await new InterviewSession({
            sessionId: "SYNC9999",
            jobId: jobForm._id.toString(),
            name: "Sync Test Interview",
            interviewerId: user._id.toString(), // or user.email
            deadline: new Date(),
            requirements: "None",
            remarks: "None",
            sessionDate: new Date(),
            meetingId: "MEET-SYNC9999",
            meetingPassword: "SYNC-PASSWORD",
            candidates: [{ candidateId: formSub._id.toString() }]
        }).save({ validateBeforeSave: false });
        console.log("Mock data created in MongoDB.\n");

        // Run sync process directly
        console.log("Running Sync Service to update SQLite local database...");
        await syncAuthData();
        console.log("Sync Service finished.\n");

        // Wait a few milliseconds to ensure SQLite operations finish (syncAuthData creates unresolved promise for finalize but runs quickly)
        await new Promise(r => setTimeout(r, 1000));

        // Query SQLite to see what was saved
        console.log("Querying local SQLite database 'auth_credentials' table...");
        const db = getDb();
        await new Promise((resolve) => {
            db.all("SELECT * FROM auth_credentials WHERE meetingId = 'MEET-SYNC9999'", (err, rows) => {
                if (err) {
                    console.error("SQLite Query Error:", err);
                } else {
                    console.log(`\nFound ${rows.length} records in SQLite matching our mock sync session:`);
                    console.table(rows);
                }
                resolve();
            });
        });

        // Cleanup
        console.log("\nCleaning up mock data...");
        await InterviewSession.deleteOne({ _id: session._id });
        await FormSubmission.deleteOne({ _id: formSub._id });
        await User.deleteOne({ _id: user._id });
        await JobForm.deleteOne({ _id: jobForm._id });
        await Company.deleteOne({ _id: company._id });
        console.log("Cleanup complete.");

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        await mongoose.disconnect();
        // Allow SQLite to close naturally or process to exit
        setTimeout(() => process.exit(0), 500);
    }
}

runTest();
