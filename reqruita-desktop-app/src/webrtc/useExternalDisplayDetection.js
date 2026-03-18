import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom hook to detect external displays via multiple methods
 * Detects:
 * - Multiple displays (external monitor, TV, etc.)
 * - Extended displays via screen mirroring or duplication
 * 
 * Returns:
 * - displayInfo: Details about detected displays
 * - hasExternalDisplay: Boolean indicating external display detected
 * - displayCount: Total number of displays
 */
export function useExternalDisplayDetection(onExternalDisplayDetected) {
    const [displayInfo, setDisplayInfo] = useState(null);
    const [hasExternalDisplay, setHasExternalDisplay] = useState(false);
    const [displayCount, setDisplayCount] = useState(1);
    const detectionIntervalRef = useRef(null);
    const previousCountRef = useRef({ count: 1, lastResolution: null });
    const lastDetectionTimeRef = useRef(0);

    const detectDisplays = useCallback(async () => {
        try {
            // **PRIMARY: Screen Details API** (Best support for multi-display)
            if (window.screenDetails && typeof window.screenDetails.getScreenDetails === 'function') {
                try {
                    const details = await window.screenDetails.getScreenDetails();
                    const screens = details.screens || [];
                    
                    if (screens.length > 0) {
                        console.log(`%c✅ Screen Details API: ${screens.length} display(s) found`, 'color: #16a34a; font-weight: bold;');
                        
                        setDisplayCount(screens.length);
                        
                        const displaysList = screens.map((screen) => ({
                            width: screen.width,
                            height: screen.height,
                            left: screen.left,
                            top: screen.top,
                            isPrimary: screen.isPrimary,
                            isInternal: screen.isInternal,
                        }));
                        
                        setDisplayInfo(displaysList);
                        
                        // External display = 2+ screens
                        const externalDetected = screens.length > 1;
                        setHasExternalDisplay(externalDetected);
                        
                        if (externalDetected !== (previousCountRef.current.count > 1)) {
                            console.warn(`%c⚠️  EXTERNAL DISPLAY ${externalDetected ? 'DETECTED' : 'DISCONNECTED'}`, 'color: #dc2626; font-weight: bold; font-size: 14px;');
                            onExternalDisplayDetected?.(externalDetected, displaysList);
                        }
                        previousCountRef.current.count = screens.length;
                        return;
                    }
                } catch (err) {
                    console.debug("Screen Details API error:", err.message);
                }
            }

            // **FALLBACK 1: Monitor for resolution changes** (Extended display mode often changes available width)
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            const availWidth = window.screen.availWidth;
            const availHeight = window.screen.availHeight;
            const devicePixelRatio = window.devicePixelRatio || 1;

            // Store resolution history to detect when displays are added/removed
            if (!previousCountRef.current.lastResolution) {
                previousCountRef.current.lastResolution = { width: screenWidth, height: screenHeight };
            }

            const resolutionChanged = 
                screenWidth !== previousCountRef.current.lastResolution.width || 
                screenHeight !== previousCountRef.current.lastResolution.height;

            if (resolutionChanged) {
                console.log(`%c📊 Resolution change detected: ${previousCountRef.current.lastResolution.width}x${previousCountRef.current.lastResolution.height} → ${screenWidth}x${screenHeight}`, 'color: #f59e0b;');
                previousCountRef.current.lastResolution = { width: screenWidth, height: screenHeight };
            }

            // **FALLBACK 2: High-res display check** (TV/Monitor typically 1920x1080+)
            const isHighRes = screenWidth >= 1920 || screenHeight >= 1080;
            
            // **FALLBACK 3: Check availWidth/availHeight difference** (Indicates extended display with different taskbar positions)
            const taskbarDiff = Math.abs((screenWidth - availWidth) + (screenHeight - availHeight));
            const hasTaskbarDifference = taskbarDiff > 100;

            // More lenient detection: Flag if high-res OR resolution changed
            let externalDetected = isHighRes || resolutionChanged || hasTaskbarDifference;

            setDisplayCount(externalDetected ? 2 : 1);
            setDisplayInfo([{ width: screenWidth, height: screenHeight, availWidth, availHeight, devicePixelRatio }]);
            setHasExternalDisplay(externalDetected);

            // Trigger callback on state change
            if (externalDetected !== (previousCountRef.current.count > 1)) {
                console.warn(`%c⚠️  EXTERNAL DISPLAY ${externalDetected ? 'DETECTED' : 'DISCONNECTED'}`, 'color: #dc2626; font-weight: bold; font-size: 14px;');
                console.log(`%c  Screen: ${screenWidth}x${screenHeight}, Available: ${availWidth}x${availHeight}`, 'color: #dc2626;');
                onExternalDisplayDetected?.(externalDetected, [{ width: screenWidth, height: screenHeight, availWidth, availHeight }]);
            }
            previousCountRef.current.count = externalDetected ? 2 : 1;

        } catch (err) {
            console.error("[Display Detection] Error:", err);
        }
    }, [onExternalDisplayDetected]);

    // Request permission and start monitoring
    useEffect(() => {
        const initDetection = async () => {
            console.log("[Display Detection] Initializing display detection...");
            
            // Request permission for Screen Details API if available
            if (
                navigator.permissions &&
                navigator.permissions.query &&
                window.screenDetails
            ) {
                try {
                    const permission = await navigator.permissions.query({
                        name: "screen-details",
                    });
                    console.log("[Display Detection] Screen Details permission:", permission.state);
                    
                    // If denied, we'll fall back to other methods
                    if (permission.state === "denied") {
                        console.warn("[Display Detection] Screen Details permission denied, using fallback methods");
                    }
                } catch (err) {
                    console.debug("[Display Detection] Permission query unavailable:", err.message);
                }
            } else {
                console.log("[Display Detection] Screen Details API not available, using fallback methods");
            }

            // Initial detection
            await detectDisplays();

            // Poll for changes every 500ms (more frequent detection)
            detectionIntervalRef.current = setInterval(detectDisplays, 500);
        };

        initDetection();

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, [detectDisplays]);

    return {
        displayInfo,
        hasExternalDisplay,
        displayCount,
    };
}
