const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../dashboard/src/models/User");
const FormSubmission = require("../dashboard/src/models/FormSubmission");
const InterviewSession = require("../dashboard/src/models/InterviewSession");
const Company = require("../dashboard/src/models/Company");
const JobForm = require("../dashboard/src/models/JobForm");
const { login } = require("../desktop-app/src/controllers/authController");

async function runTests() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reqruita");
        console.log("Connected.");

        // Create mock data
        console.log("Creating mock data...");
        const adminId = new mongoose.Types.ObjectId();
        const company = await new Company({
            name: "Test Company",
            mainAdminId: adminId,
            plan: "free",
            status: "active"
        }).save({ validateBeforeSave: false });

        const jobForm = await new JobForm({
            companyId: company._id,
            title: "Test Job",
            description: "Test Description",
            status: "published"
        }).save({ validateBeforeSave: false });

        const user = await new User({
            firstName: "Test",
            lastName: "Interviewer",
            email: "test.interviewer@example.com",
            role: "interviewer",
            companyId: company._id
        }).save({ validateBeforeSave: false });

        const formSub = await new FormSubmission({
            formId: jobForm._id,
            submitterEmail: "test.candidate@example.com",
            submittedData: { name: "Test Candidate" }
        }).save({ validateBeforeSave: false });

        const session = await new InterviewSession({
            sessionId: "TEST1234",
            jobId: jobForm._id.toString(),
            name: "Test Interview",
            interviewerId: user._id.toString(),
            deadline: new Date(),
            requirements: "None",
            remarks: "None",
            sessionDate: new Date(),
            meetingId: "MEET-TEST1234",
            meetingPassword: "PASSWORD123",
            candidates: [{ candidateId: formSub._id.toString() }]
        }).save({ validateBeforeSave: false });
        console.log("Mock data created successfully.");

        // Helper to mock req and res
        const execLogin = async (body) => {
            let resStatus = 200;
            let resJson = null;

            const req = { body };
            const res = {
                status: (code) => { resStatus = code; return res; },
                json: (data) => { resJson = data; return res; }
            };

            await login(req, res);
            return { status: resStatus, data: resJson };
        };

        console.log("\n--- Running Tests ---");

        // Test 1: Candidate login (Success)
        console.log("Test 1: Candidate Login (Valid)");
        let res1 = await execLogin({
            email: "test.candidate@example.com",
            meetingId: "MEET-TEST1234",
            password: "PASSWORD123",
            role: "join"
        });
        if (res1.status === 200 && res1.data.success) {
            console.log("✅ Passed");
        } else {
            console.error("❌ Failed:", res1);
        }

        // Test 2: Interviewer login (Success)
        console.log("Test 2: Interviewer Login (Valid)");
        let res2 = await execLogin({
            email: "test.interviewer@example.com",
            meetingId: "MEET-TEST1234",
            password: "PASSWORD123",
            role: "conduct"
        });
        if (res2.status === 200 && res2.data.success) {
            console.log("✅ Passed");
        } else {
            console.error("❌ Failed:", res2);
        }

        // Test 3: Invalid password
        console.log("Test 3: Invalid Password");
        let res3 = await execLogin({
            email: "test.interviewer@example.com",
            meetingId: "MEET-TEST1234",
            password: "WRONGPASSWORD",
            role: "conduct"
        });
        if (res3.status === 401 && !res3.data.success) {
            console.log("✅ Passed");
        } else {
            console.error("❌ Failed:", res3);
        }


        // Test 4: Interviewer trying to login as Candidate
        console.log("Test 4: Interviewer logging in with wrong role");
        let res4 = await execLogin({
            email: "test.interviewer@example.com",
            meetingId: "MEET-TEST1234",
            password: "PASSWORD123",
            role: "join"
        });
        if (res4.status === 401 && !res4.data.success) {
            console.log("✅ Passed");
        } else {
            console.error("❌ Failed:", res4);
        }

        // Cleanup
        console.log("\nCleaning up mock data...");
        await InterviewSession.deleteOne({ _id: session._id });
        await FormSubmission.deleteOne({ _id: formSub._id });
        await User.deleteOne({ _id: user._id });
        await JobForm.deleteOne({ _id: jobForm._id });
        await Company.deleteOne({ _id: company._id });
        console.log("Cleanup complete.");

    } catch (err) {
        console.error("Test execution error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

runTests();
