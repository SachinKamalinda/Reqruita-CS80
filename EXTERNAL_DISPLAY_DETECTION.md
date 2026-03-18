# External Display Detection & Warning System

## Overview

This feature detects when candidates are using external displays (connected monitors, TVs, projectors, or screen mirroring) during interviews and provides real-time warnings to both the candidate and interviewer. This helps prevent cheating and ensures interview integrity.

## Features

### ✅ Automatic Detection
- Continuously monitors for multiple displays using the **Screen Enumeration API**
- Detects:
  - External monitors connected via HDMI, DP, USB-C, etc.
  - TV/projector connections
  - Screen mirroring/duplication (Miracast, AirPlay, etc.)
  - Any non-primary display

### ✅ Real-Time Warnings
- **Candidate View**: Prominent yellow warning banner showing:
  - Number of displays detected
  - Instructions to disconnect external displays
  - Interview pause notice until only primary display is active
  
- **Interviewer View**: Red alert banner showing:
  - Candidate name
  - Number of displays detected
  - "Incident Recorded" badge for compliance tracking

### ✅ Audit & Compliance
- All incidents logged to backend with:
  - Timestamp
  - Candidate name
  - Interview ID
  - Number of displays
  - Display specifications (resolution, position, etc.)
- Queryable via REST APIs for compliance review

## Architecture

### Frontend Components

#### 1. `src/webrtc/useExternalDisplayDetection.js`
Custom React hook that:
- Polls every 1 second for display changes
- Uses Screen Enumeration API (modern browsers) with fallback
- Detects primary vs. external displays
- Triggers callback when display status changes
- Returns:
  - `displayInfo`: Array of display details
  - `hasExternalDisplay`: Boolean flag
  - `displayCount`: Number of displays

#### 2. `src/components/ExternalDisplayWarning.jsx`
React component that displays:
- Stylized warning banner
- Variant-specific messaging ("candidate" vs. "interviewer")
- Display count badge
- Action buttons (candidate can acknowledge)

#### 3. `src/components/ExternalDisplayWarning.css`
Styling for warning banners:
- Yellow gradient for candidate warnings
- Red gradient for interviewer alerts
- Fixed top positioning for visibility
- Responsive mobile design

### Integration Points

#### MeetingInterviewee.jsx (Candidate View)
```javascript
// Hook initialization
const { displayInfo, hasExternalDisplay, displayCount } = 
  useExternalDisplayDetection((detected, displays) => {
    // Emit socket event to interviewer
    chatSocketRef.current.emit("external-display-alert", {
      interviewId: meetingId,
      candidateName,
      detected,
      displayCount,
      displays,
      timestamp: new Date().toISOString(),
    });
  });

// Display warning
<ExternalDisplayWarning
  visible={externalDisplayDetected}
  variant="candidate"
  displayCount={externalDisplayCount}
/>
```

#### MeetingInterviewer.jsx (Interviewer View)
```javascript
// Listen for external display alerts
socket.on("external-display-alert", (data) => {
  setCandidateExternalDisplay(data.detected);
  setCandidateDisplayCount(data.displayCount);
  addToast(`⚠️ ${data.candidateName} is using ${data.displayCount} display(s)!`);
});

// Display warning
<ExternalDisplayWarning
  visible={candidateExternalDisplay}
  variant="interviewer"
  displayCount={candidateDisplayCount}
/>
```

### Backend Components

#### `backend/ExternalDisplayLog.js`
Logging service that:
- Logs incidents to file: `backend/logs/external_display_incidents.log`
- Each entry is JSON for easy parsing/analysis
- Functions:
  - `logExternalDisplayIncident(incident)`: Log an incident
  - `getIncidentsForInterview(interviewId)`: Get interview-specific incidents
  - `getHighSeverityIncidents()`: Get all violations
  - `getStatistics()`: Get aggregate statistics

#### `backend/server.js`
Integration points:
- Imports `ExternalDisplayLog` module
- Socket.IO handler for `"external-display-alert"` events
- Broadcasts alerts to interview rooms
- Logs incidents to file
- Three new REST API endpoints

### REST API Endpoints

#### 1. GET `/api/external-display/incidents/:interviewId`
Get all external display incidents for a specific interview.

**Response:**
```json
{
  "interviewId": "meeting123",
  "count": 2,
  "incidents": [
    {
      "timestamp": "2024-03-18T14:23:45Z",
      "interviewId": "meeting123",
      "candidateName": "John Doe",
      "detected": true,
      "displayCount": 2,
      "severity": "WARNING",
      "details": "Candidate John Doe was detected using 2 display(s)..."
    }
  ]
}
```

#### 2. GET `/api/external-display/high-severity`
Get all high-severity incidents (external display detected).

**Response:**
```json
{
  "severity": "HIGH",
  "count": 5,
  "incidents": [ /* similar structure */ ]
}
```

#### 3. GET `/api/external-display/statistics`
Get aggregate statistics about external display detections.

**Response:**
```json
{
  "totalIncidents": 42,
  "detectionCount": 12,
  "passCount": 30,
  "affectedInterviews": ["meeting123", "meeting456", "meeting789"],
  "lastIncident": { /* incident object */ }
}
```

## Flow Diagram

```
Candidate Side                          Interviewer Side
┌──────────────────────┐               ┌──────────────────────┐
│ useExternalDisplay   │               │ MeetingInterviewer   │
│ Detection Hook       │               │ (Listening)          │
└──────────┬───────────┘               └──────────┬───────────┘
           │                                      ▲
           │ Polls every 1 sec                    │
           │ for display changes                  │ Socket.IO
           │                                      │ receives event
           ▼                                      │
┌──────────────────────┐          ┌──────────────┴───────────┐
│ External Display     │          │ Socket.IO Handler       │
│ Detected?            │          │ "external-display-alert"│
└──────────┬───────────┘          └──────────┬───────────────┘
           │                                  │
           ▼ emit event                       ▼
┌──────────────────────┐          ┌──────────────────────┐
│ Socket.emit          │──────────▶│ Backend Server       │
│ "external-display-  │ via       │ Socket Handler       │
│  alert"             │ Socket.IO │                      │
└──────────────────────┘          └──────────┬───────────┘
           │                                  │
           │                                  ▼
           │                       ┌──────────────────────┐
           │                       │ Log to File:         │
           │                       │ incidents.log        │
           │                       └──────────┬───────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────────────────────────────────────────┐
│ Show Warning Banner + Toast Notification                 │
│ - Candidate sees: "Disconnect external display"         │
│ - Interviewer sees: "Candidate using X displays ⚠️"    │
└──────────────────────────────────────────────────────────┘
```

## Technical Details

### Display Detection Methods

1. **Screen Enumeration API (Preferred)**
   - Modern Web API for multi-display detection
   - Returns detailed display info (resolution, position, primary/internal flags)
   - Requires user permission (browser prompt)
   - Browser support: Chrome 114+, Edge 114+

2. **Fallback Method**
   - Uses `window.screen` API properties
   - Detects screen mirroring via `availWidth` vs `width` differences
   - Works in older browsers
   - Less precise but still effective

### Socket.IO Event Flow

**Candidate → Server → Interviewer**
```
Socket Event: "external-display-alert"
Payload: {
  interviewId: string,
  candidateName: string,
  detected: boolean,
  displayCount: number,
  displays: Array<{width, height, isPrimary, isInternal}>,
  timestamp: ISO8601 timestamp
}
```

**Server broadcasts to:**
- `chat:${interviewId}` room (chat connections)
- `${interviewId}` room (WebRTC signaling connections)

### Logging Format

File: `backend/logs/external_display_incidents.log`
Each line is a JSON object:
```json
{
  "timestamp": "2024-03-18T14:23:45.123Z",
  "interviewId": "meeting123",
  "candidateName": "Jane Smith",
  "detected": true,
  "displayCount": 2,
  "displays": [
    {
      "width": 1920,
      "height": 1080,
      "isPrimary": true,
      "isInternal": true
    },
    {
      "width": 1920,  
      "height": 1080,
      "isPrimary": false,
      "isInternal": false
    }
  ],
  "severity": "WARNING",
  "details": "Candidate Jane Smith was detected using 2 display(s) during interview meeting123"
}
```

## User Guide

### For Candidates
1. **See Warning**: Yellow banner appears at top of screen
2. **Understand Issue**: Banner explains multiple displays detected
3. **Take Action**: Disconnect/disable external monitors, stop screen sharing
4. **Continue**: Interview resumes once only primary display active

### For Interviewers
1. **Get Notified**: 
   - Red alert banner at top
   - Toast notification with candidate name
2. **Review Details**: Count of displays shown
3. **Take Action**: 
   - Document incident (automatically logged)
   - Can pause/terminate interview if needed
4. **Audit Later**: Review incidents via REST API

### For Administrators
1. **Check Statistics**:
   ```bash
   curl http://backend:3001/api/external-display/statistics
   ```

2. **Review Violations**:
   ```bash
   curl http://backend:3001/api/external-display/high-severity
   ```

3. **Audit Specific Interview**:
   ```bash
   curl http://backend:3001/api/external-display/incidents/meeting123
   ```

## Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Screen Enumeration API | 114+ | 114+ | 63+ | 16.4+ |
| Fallback Screen API | 1+ | 12+ | 1+ | 3+ |
| Socket.IO | All | All | All | All |

## Security & Privacy Considerations

1. **User Consent**: Browser prompts user for permission before accessing display info
2. **Local Processing**: Display detection happens entirely on client
3. **Audit Trail**: Server logs all detections for compliance
4. **No Recording**: Only metadata logged, no screenshots/display capture
5. **GDPR Compliant**: Users can clear logs if needed

## Future Enhancements

1. **Smart Pause**: Automatically pause video when external display detected
2. **Display Info Storage**: Database persistence for incidents
3. **Admin Dashboard**: UI to review/manage incident logs
4. **Analytics**: Trend analysis dashboard
5. **Smart Detection**: ML-based detection of suspicious activity
6. **Window Monitoring**: Detect suspicious application windows open
7. **Cross-Device Detection**: Detect nearby connected wirelessly

## Troubleshooting

### Display Not Detecting
- **Issue**: Candidate has external display but warning doesn't show
- **Solution**: 
  - Check browser support (Chrome/Edge 114+)
  - Grant screen-details permission when prompted
  - Try connecting/disconnecting display
  - Hard refresh browser

### False Positives
- **Issue**: Warning shows but only one display active
- **Solution**: 
  - Disable desktop duplication/mirroring
  - Check Windows display settings
  - Disable virtual displays (Parsec, VirtualBox, etc.)

### Backend Logs Not Created
- **Issue**: No incidents.log file in backend/logs
- **Solution**:
  - Ensure backend/logs directory exists
  - Check file permissions
  - Restart backend server

## Implementation Checklist

- [x] useExternalDisplayDetection.js hook
- [x] ExternalDisplayWarning.jsx component
- [x] ExternalDisplayWarning.css styling
- [x] MeetingInterviewee.jsx integration
- [x] MeetingInterviewer.jsx integration
- [x] ExternalDisplayLog.js backend service
- [x] server.js Socket.IO handler
- [x] REST API endpoints (3)
- [x] Logging to file
- [x] Documentation

## Files Modified/Created

### Created:
- `reqruita-desktop-app/src/webrtc/useExternalDisplayDetection.js`
- `reqruita-desktop-app/src/components/ExternalDisplayWarning.jsx`
- `reqruita-desktop-app/src/components/ExternalDisplayWarning.css`
- `backend/ExternalDisplayLog.js`

### Modified:
- `reqruita-desktop-app/src/pages/MeetingInterviewee.jsx`
- `reqruita-desktop-app/src/pages/MeetingInterviewer.jsx`
- `backend/server.js`

## Questions?

Refer to the inline code comments in each file for additional implementation details.
