import React from 'react';

/**
 * MultiMonitorWarning Component
 * Shows a warning banner when candidate has multiple monitors connected
 * 
 * Usage:
 * <MultiMonitorWarning 
 *   displayCount={2} 
 *   candidateName="John Doe"
 *   onDismiss={() => {}}
 * />
 */
export default function MultiMonitorWarning({ displayCount, candidateName, onDismiss }) {
    if (!displayCount || displayCount <= 1) {
        return null; // Don't show if single monitor
    }

    return (
        <div style={{
            backgroundColor: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(255, 193, 7, 0.3)',
        }}>
            <div style={{ flex: 1 }}>
                <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#856404',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    ⚠️ Multiple Monitors Detected
                </div>
                <div style={{
                    fontSize: '14px',
                    color: '#856404',
                    marginBottom: '4px',
                }}>
                    Candidate <strong>{candidateName}</strong> has <strong>{displayCount} displays</strong> connected.
                </div>
                <div style={{
                    fontSize: '13px',
                    color: '#856404',
                    opacity: 0.8,
                }}>
                    This may indicate an attempt to access unauthorized resources. Proceed with caution.
                </div>
            </div>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #ffc107',
                        color: '#856404',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        marginLeft: '16px',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#ffc107';
                        e.target.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = '#856404';
                    }}
                >
                    Dismiss
                </button>
            )}
        </div>
    );
}
