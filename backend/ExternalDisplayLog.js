// backend/ExternalDisplayLog.js
/**
 * ExternalDisplayLog.js
 * Handles logging of external display detection incidents
 * This ensures compliance tracking and security auditing
 */

const fs = require("fs");
const path = require("path");

// Log incidents to a dedicated file
const DISPLAY_LOG_FILE = path.join(__dirname, "logs", "external_display_incidents.log");

// Ensure logs directory exists
const ensureLogsDir = () => {
    const logsDir = path.dirname(DISPLAY_LOG_FILE);
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
};

/**
 * Log an external display incident
 * @param {Object} incident - Incident details
 * @param {string} incident.interviewId - Interview/meeting ID
 * @param {string} incident.candidateName - Candidate name
 * @param {boolean} incident.detected - Whether external display was detected
 * @param {number} incident.displayCount - Number of displays detected
 * @param {Array} incident.displays - Display details
 * @param {string} incident.timestamp - When the incident occurred
 */
function logExternalDisplayIncident(incident) {
    ensureLogsDir();

    const logEntry = {
        timestamp: new Date().toISOString(),
        interviewId: incident.interviewId,
        candidateName: incident.candidateName,
        detected: incident.detected,
        displayCount: incident.displayCount,
        displays: incident.displays || [],
        severity: incident.detected ? "WARNING" : "INFO",
        details: incident.detected
            ? `Candidate ${incident.candidateName} was detected using ${incident.displayCount} display(s) during interview ${incident.interviewId}`
            : `Display check passed for candidate ${incident.candidateName} in interview ${incident.interviewId}`,
    };

    // Append to log file
    fs.appendFileSync(
        DISPLAY_LOG_FILE,
        JSON.stringify(logEntry) + "\n",
        (err) => {
            if (err) {
                console.error("Failed to write external display log:", err);
            }
        }
    );

    // Also log to console for monitoring
    if (incident.detected) {
        console.warn(`⚠️ EXTERNAL DISPLAY DETECTED:`, logEntry);
    }

    return logEntry;
}

/**
 * Get all incidents for a specific interview
 * @param {string} interviewId - Interview ID to search for
 * @returns {Array} Array of incidents
 */
function getIncidentsForInterview(interviewId) {
    ensureLogsDir();

    if (!fs.existsSync(DISPLAY_LOG_FILE)) {
        return [];
    }

    const content = fs.readFileSync(DISPLAY_LOG_FILE, "utf-8");
    const lines = content.trim().split("\n");

    return lines
        .filter((line) => line.trim())
        .map((line) => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        })
        .filter((entry) => entry && entry.interviewId === interviewId);
}

/**
 * Get all high-severity incidents (external display detected)
 * @returns {Array} Array of incidents where external display was detected
 */
function getHighSeverityIncidents() {
    ensureLogsDir();

    if (!fs.existsSync(DISPLAY_LOG_FILE)) {
        return [];
    }

    const content = fs.readFileSync(DISPLAY_LOG_FILE, "utf-8");
    const lines = content.trim().split("\n");

    return lines
        .filter((line) => line.trim())
        .map((line) => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        })
        .filter((entry) => entry && entry.detected && entry.severity === "WARNING");
}

/**
 * Get incident statistics
 * @returns {Object} Statistics about external display incidents
 */
function getStatistics() {
    ensureLogsDir();

    if (!fs.existsSync(DISPLAY_LOG_FILE)) {
        return {
            totalIncidents: 0,
            detectionCount: 0,
            passCount: 0,
            affectedInterviews: [],
        };
    }

    const content = fs.readFileSync(DISPLAY_LOG_FILE, "utf-8");
    const lines = content.trim().split("\n");

    const entries = lines
        .filter((line) => line.trim())
        .map((line) => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        })
        .filter((entry) => entry !== null);

    const detectionCount = entries.filter((e) => e.detected).length;
    const passCount = entries.filter((e) => !e.detected).length;
    const affectedInterviews = [...new Set(
        entries.filter((e) => e.detected).map((e) => e.interviewId)
    )];

    return {
        totalIncidents: entries.length,
        detectionCount,
        passCount,
        affectedInterviews,
        lastIncident: entries[entries.length - 1] || null,
    };
}

module.exports = {
    logExternalDisplayIncident,
    getIncidentsForInterview,
    getHighSeverityIncidents,
    getStatistics,
};
