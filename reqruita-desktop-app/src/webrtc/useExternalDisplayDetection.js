import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom hook to detect external displays via Screen Enumeration API
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
    const previousCountRef = useRef(1);

    const detectDisplays = useCallback(async () => {
        try {
            // Method 1: Use Screen Details API (most reliable for multi-display detection)
            if (window.screenDetails && window.screenDetails.getScreenDetails) {
                try {
                    const details = await window.screenDetails.getScreenDetails();
                    const screens = details.screens;
                    
                    if (screens && screens.length > 0) {
                        setDisplayCount(screens.length);
                        
                        const displaysList = screens.map((screen) => ({
                            id: screen.uniqueId || `screen_${screen.left}_${screen.top}`,
                            width: screen.width,
                            height: screen.height,
                            left: screen.left,
                            top: screen.top,
                            isPrimary: screen.isPrimary,
                            isInternal: screen.isInternal,
                            colorDepth: screen.colorDepth,
                            pixelDepth: screen.pixelDepth,
                        }));
                        
                        setDisplayInfo(displaysList);
                        
                        // Detect external displays (non-primary or non-internal)
                        const externalDetected = displaysList.some(
                            (screen) => !screen.isPrimary || !screen.isInternal
                        );
                        
                        setHasExternalDisplay(externalDetected);
                        
                        // Trigger callback if changed
                        if (externalDetected !== previousCountRef.current > 1) {
                            onExternalDisplayDetected?.(externalDetected, displaysList);
                        }
                        previousCountRef.current = screens.length;
                        
                        return;
                    }
                } catch (err) {
                    console.debug("Screen Details API unavailable", err);
                }
            }

            // Method 2: Fallback - Use window.screen and detect via available screen API
            // This method checks the screen object's dimensions and properties
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            const availWidth = window.screen.availWidth;
            const availHeight = window.screen.availHeight;
            const colorDepth = window.screen.colorDepth;
            const pixelDepth = window.screen.pixelDepth;

            const screenData = {
                width: screenWidth,
                height: screenHeight,
                availWidth,
                availHeight,
                colorDepth,
                pixelDepth,
            };

            setDisplayInfo([screenData]);

            // Check for multiple displays via WebGL renderer hint or display metrics
            // Modern approach: check screen.availWidth vs screen.width (mirroring creates difference)
            const isScreenMirrored = availWidth !== screenWidth || availHeight !== screenHeight;
            
            setHasExternalDisplay(isScreenMirrored);
            
            if (isScreenMirrored !== (previousCountRef.current > 1)) {
                onExternalDisplayDetected?.(isScreenMirrored, [screenData]);
            }
            previousCountRef.current = isScreenMirrored ? 2 : 1;

        } catch (err) {
            console.error("Display detection error:", err);
        }
    }, [onExternalDisplayDetected]);

    // Request permission and start monitoring
    useEffect(() => {
        const initDetection = async () => {
            // Request permission if needed (Screen Details API)
            if (
                navigator.permissions &&
                navigator.permissions.query &&
                window.screenDetails
            ) {
                try {
                    const permission = await navigator.permissions.query({
                        name: "screen-details",
                    });
                    console.log("Screen Details permission:", permission.state);
                } catch (err) {
                    console.debug("Permission query unavailable", err);
                }
            }

            // Initial detection
            await detectDisplays();

            // Poll for changes every 1 second
            detectionIntervalRef.current = setInterval(detectDisplays, 1000);
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
