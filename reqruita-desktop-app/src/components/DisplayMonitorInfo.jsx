import React from 'react';
import { useDisplayInfo } from '../hooks/useDisplayInfo';

/**
 * DisplayMonitorInfo Component
 * Shows information about all detected monitors
 * 
 * Usage:
 * <DisplayMonitorInfo />
 * 
 * Or access the hook directly:
 * const { count, isMultiMonitor, all, primary, error } = useDisplayInfo();
 */
export default function DisplayMonitorInfo() {
    const { count, isMultiMonitor, all, primary, loading, error } = useDisplayInfo();

    if (loading) {
        return (
            <div style={{ padding: '16px', fontSize: '14px', color: '#666' }}>
                Detecting monitors...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '16px', fontSize: '14px', color: '#d32f2f' }}>
                Error: {error}
            </div>
        );
    }

    return (
        <div style={{ padding: '16px', fontSize: '13px', fontFamily: 'monospace' }}>
            <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>
                📊 Monitor Detection
            </div>
            
            <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <div>Total Displays: <span style={{ fontWeight: 'bold' }}>{count}</span></div>
                <div>Multi-Monitor Setup: <span style={{ color: isMultiMonitor ? '#2e7d32' : '#666' }}>
                    {isMultiMonitor ? '✓ Yes' : '✗ No'}
                </span></div>
            </div>

            {primary && (
                <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Primary Display:</div>
                    <div>Label: {primary.label}</div>
                    <div>Resolution: {primary.bounds.width} × {primary.bounds.height}</div>
                    <div>Scale Factor: {primary.scaleFactor}x</div>
                    <div>Position: ({primary.bounds.x}, {primary.bounds.y})</div>
                    {primary.colorSpace && <div>Color Space: {primary.colorSpace}</div>}
                </div>
            )}

            {all.length > 1 && (
                <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>All Displays:</div>
                    {all.map((display, idx) => (
                        <div 
                            key={display.id}
                            style={{
                                marginBottom: '8px',
                                padding: '8px',
                                backgroundColor: display.isPrimary ? '#fff3e0' : '#f5f5f5',
                                borderRadius: '4px',
                                borderLeft: `3px solid ${display.isPrimary ? '#ff9800' : '#999'}`
                            }}
                        >
                            <div>{display.label} {display.isPrimary ? '(Primary)' : ''}</div>
                            <div>Resolution: {display.bounds.width} × {display.bounds.height}</div>
                            <div>Scale: {display.scaleFactor}x</div>
                            <div>Position: ({display.bounds.x}, {display.bounds.y})</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
