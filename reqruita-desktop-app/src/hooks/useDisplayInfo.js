import { useState, useEffect } from 'react';

/**
 * useDisplayInfo hook
 * Detects and returns information about all connected monitors
 * 
 * Returns:
 * - count: number of displays detected
 * - primary: info about primary display
 * - all: array of all displays with their properties
 * - isMultiMonitor: boolean (true if count > 1)
 * - loading: boolean
 * - error: string or null
 */
export function useDisplayInfo() {
    const [displayInfo, setDisplayInfo] = useState({
        count: 1,
        primary: null,
        all: [],
        isMultiMonitor: false,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!window.reqruita) {
            setError('Electron API not available');
            setLoading(false);
            return;
        }

        const fetchDisplayInfo = async () => {
            try {
                setLoading(true);
                const info = await window.reqruita.getDisplayInfo();
                setDisplayInfo({
                    ...info,
                    isMultiMonitor: info.count > 1,
                });
                setError(null);
            } catch (err) {
                console.error('Failed to get display info:', err);
                setError(err.message || 'Failed to detect monitors');
            } finally {
                setLoading(false);
            }
        };

        fetchDisplayInfo();
    }, []);

    return {
        ...displayInfo,
        loading,
        error,
    };
}
