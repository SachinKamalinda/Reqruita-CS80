import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom hook to detect external displays via multiple methods
 * Detects:
 * - Multiple displays (external monitor, TV, connected via HDMI, etc.)
 * - Extended displays via screen mirroring or duplication
 * - Cable plug-in events (HDMI, USB-C, DisplayPort, etc.)
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
    const previousCountRef = useRef({ count: 1, lastResolution: null, lastScreens: null });
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
                        
                        const displaysList = screens.map((screen) => ({
                            width: screen.width,
                            height: screen.height,
                            left: screen.left,
                            top: screen.top,
                            isPrimary: screen.isPrimary,
                            isInternal: screen.isInternal,
                        }));
                        
                        setDisplayInfo(displaysList);
                        setDisplayCount(screens.length);
                        
                        // External display = 2+ screens
                        const externalDetected = screens.length > 1;
                        setHasExternalDisplay(externalDetected);
                        
                        if (externalDetected !== (previousCountRef.current.count > 1)) {
                            console.warn(`%c⚠️  EXTERNAL DISPLAY ${externalDetected ? 'DETECTED' : 'DISCONNECTED'}`, 'color: #dc2626; font-weight: bold; font-size: 14px;');
                            console.log(`%c  Displays: ${screens.map(s => `${s.width}x${s.height}${s.isPrimary ? ' (primary)' : ''}`).join(', ')}`, 'color: #dc2626;');
                            onExternalDisplayDetected?.(externalDetected, displaysList);
                        }
                        previousCountRef.current.count = screens.length;
                        previousCountRef.current.lastScreens = screens;
                        return;
                    }
                } catch (err) {
                    console.debug("Screen Details API error:", err.message);
                }
            }

            // **FALLBACK 1: Monitor for resolution & screen density changes** 
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            const availWidth = window.screen.availWidth;
            const availHeight = window.screen.availHeight;
            const devicePixelRatio = window.devicePixelRatio || 1;

            // Store resolution history to detect when displays are added/removed
            if (!previousCountRef.current.lastResolution) {
                previousCountRef.current.lastResolution = { 
                    width: screenWidth, 
                    height: screenHeight,
                    dpr: devicePixelRatio
                };
            }

            const resolutionChanged = 
                screenWidth !== previousCountRef.current.lastResolution.width || 
                screenHeight !== previousCountRef.current.lastResolution.height ||
                devicePixelRatio !== previousCountRef.current.lastResolution.dpr;

            if (resolutionChanged) {
                console.log(`%c📊 Resolution/DPR change: ${previousCountRef.current.lastResolution.width}x${previousCountRef.current.lastResolution.height}@${previousCountRef.current.lastResolution.dpr} → ${screenWidth}x${screenHeight}@${devicePixelRatio}`, 'color: #f59e0b;');
                previousCountRef.current.lastResolution = { width: screenWidth, height: screenHeight, dpr: devicePixelRatio };
            }

            // **FALLBACK 2: Multiple detection methods**
            // Check if screen is high resolution (external monitor typically >= 1920x1080)
            const isHighRes = screenWidth >= 1920 || screenHeight >= 1080;
            
            // Check available vs screen size difference (taskbar or extended display)
            const taskbarDiff = Math.abs((screenWidth - availWidth) + (screenHeight - availHeight));
            const hasTaskbarDifference = taskbarDiff > 100;

            // Check if using a high device pixel ratio (typical of external displays)
            const isHighDPI = devicePixelRatio >= 1.5;

            // More intelligent detection: Flag external display if:
            // 1. High resolution detected AND resolution recently changed (cable plugged in)
            // 2. OR resolution just changed (display switched/plugged)
            // 3. OR taskbar indicates extended display
            let externalDetected = (isHighRes && resolutionChanged) || resolutionChanged || hasTaskbarDifference;

            const displayCount = externalDetected ? 2 : 1;
            setDisplayCount(displayCount);
            setDisplayInfo([{ width: screenWidth, height: screenHeight, availWidth, availHeight, devicePixelRatio }]);
            setHasExternalDisplay(externalDetected);

            // Trigger callback on state change
            if (externalDetected !== (previousCountRef.current.count > 1)) {
                console.warn(`%c⚠️  EXTERNAL DISPLAY ${externalDetected ? 'DETECTED' : 'DISCONNECTED'}`, 'color: #dc2626; font-weight: bold; font-size: 14px;');
                console.log(`%c  Screen: ${screenWidth}x${screenHeight}, Available: ${availWidth}x${availHeight}, DPR: ${devicePixelRatio}`, 'color: #dc2626;');
                onExternalDisplayDetected?.(externalDetected, [{ width: screenWidth, height: screenHeight, availWidth, availHeight, dpr: devicePixelRatio }]);
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

            // Poll for changes every 300ms (faster detection for cable plug-in events)
            detectionIntervalRef.current = setInterval(detectDisplays, 300);
        };

        initDetection();

        // **Add event listeners for screen changes**
        const handleScreenChange = () => {
            console.log("[Display Detection] Screen change event detected via orientationchange");
            detectDisplays();
        };

        const handleResizeChange = () => {
            console.log("[Display Detection] Screen change event detected via resize");
            detectDisplays();
        };

        window.addEventListener("orientationchange", handleScreenChange);
        window.addEventListener("resize", handleResizeChange);

        // Listen for screen details change if available
        if (window.screenDetails && window.screenDetails.addEventListener) {
            try {
                window.screenDetails.addEventListener("screenschange", () => {
                    console.log("[Display Detection] Screen details screenschange event detected");
                    detectDisplays();
                });
            } catch (err) {
                console.debug("[Display Detection] Could not set up screenschange listener:", err.message);
            }
        }

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
            window.removeEventListener("orientationchange", handleScreenChange);
            window.removeEventListener("resize", handleResizeChange);
        };
        };
    }, [detectDisplays]);

    return {
        displayInfo,
        hasExternalDisplay,
        displayCount,
    };
}
