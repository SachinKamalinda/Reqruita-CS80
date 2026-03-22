const mongoose = require("mongoose");
const getDb = require("../config/sqlite");
const User = require("../../../dashboard/src/models/User");
const FormSubmission = require("../../../dashboard/src/models/FormSubmission");
const InterviewSession = require("../../../dashboard/src/models/InterviewSession");

async function syncAuthData() {
    try {
        console.log("[Sync Service] Starting MongoDB -> SQLite Auth Sync...");

        const db = getDb();
        
        // Ensure table is clear before syncing to prevent stale data
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM auth_credentials", (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        const sessions = await InterviewSession.find({});
        console.log(`[Sync Service] Found ${sessions.length} sessions in MongoDB.`);

        const insertStmt = db.prepare(
            `INSERT INTO auth_credentials (id, email, meetingId, password, role, participantId, name) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        );

        let insertedCount = 0;

        for (const session of sessions) {
            const meetingId = session.meetingId || "";
            const password = session.meetingPassword || "";

            if (!meetingId || !password) continue;

            // 1. Sync Interviewer
            if (session.interviewerId) {
                let user;
                if (mongoose.Types.ObjectId.isValid(session.interviewerId)) {
                    user = await User.findById(session.interviewerId);
                }
                if (!user) {
                    user = await User.findOne({ email: session.interviewerId.toLowerCase() });
                }

                if (user && user.email) {
                    const id = `cond_${session._id}_${user._id}`;
                    const name = user.fullName || user.firstName || "Interviewer";
                    await new Promise((res) => {
                        insertStmt.run([id, user.email.toLowerCase(), meetingId, password, "conduct", user._id.toString(), name], (err) => {
                            if (!err) insertedCount++;
                            res();
                        });
                    });
                }
            }

            // 2. Sync Candidates
            if (session.candidates && session.candidates.length > 0) {
                for (const c of session.candidates) {
                    if (!c.candidateId) continue;
                    
                    let formSub;
                    if (mongoose.Types.ObjectId.isValid(c.candidateId)) {
                        formSub = await FormSubmission.findById(c.candidateId);
                    }
                    if (!formSub) {
                        formSub = await FormSubmission.findOne({ submitterEmail: c.candidateId.toLowerCase() });
                    }

                    if (formSub && formSub.submitterEmail) {
                        const id = `join_${session._id}_${formSub._id}`;
                        const email = formSub.submitterEmail.toLowerCase();
                        await new Promise((res) => {
                            insertStmt.run([id, email, meetingId, password, "join", formSub._id.toString(), email], (err) => {
                                if (!err) insertedCount++;
                                res();
                            });
                        });
                    }
                }
            }
        }

        await new Promise((resolve) => insertStmt.finalize(resolve));
        console.log(`[Sync Service] Sync complete. Populated ${insertedCount} credentials into SQLite.`);

    } catch (err) {
        console.error("[Sync Service] Error during synchronization:", err);
    }
}

module.exports = { syncAuthData };
