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
    const previousCountRef = useRef(1);
    const screenWidthHistoryRef = useRef([]);
    const lastDetectionTimeRef = useRef(0);

    const detectDisplays = useCallback(async () => {
        try {
            let detectionMethod = "unknown";
            let detectedCount = 1;

            // Method 1: Use Screen Details API (most reliable for multi-display detection)
            if (window.screenDetails && window.screenDetails.getScreenDetails) {
                try {
                    const details = await window.screenDetails.getScreenDetails();
                    const screens = details.screens;
                    
                    if (screens && screens.length > 0) {
                        detectionMethod = "Screen Details API";
                        detectedCount = screens.length;
                        
                        console.log(`[Display Detection - ${detectionMethod}] Found ${detectedCount} display(s)`);
                        setDisplayCount(detectedCount);
                        
                        const displaysList = screens.map((screen, idx) => ({
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
                        
                        displaysList.forEach((s, i) => {
                            console.log(`  Display ${i}: ${s.width}x${s.height} @ (${s.left},${s.top}) | Primary: ${s.isPrimary}, Internal: ${s.isInternal}`);
                        });
                        
                        setDisplayInfo(displaysList);
                        
                        // Only detect external display if there are 2+ displays
                        const externalDetected = displaysList.length > 1;
                        
                        setHasExternalDisplay(externalDetected);
                        
                        // Trigger callback if changed
                        if (externalDetected !== (previousCountRef.current > 1)) {
                            console.log(`[Display Detection] ⚠️ External display ${externalDetected ? 'DETECTED' : 'disconnected'}`);
                            onExternalDisplayDetected?.(externalDetected, displaysList);
                        }
                        previousCountRef.current = detectedCount;
                        lastDetectionTimeRef.current = Date.now();
                        
                        return;
                    }
                } catch (err) {
                    console.debug("Screen Details API error:", err.message);
                }
            }

            // Method 1b: Try Screen Details without getScreenDetails (permission may not be granted)
            if (window.screenDetails && !window.screenDetails.getScreenDetails) {
                console.log("[Display Detection] Screen Details API available but getScreenDetails not accessible (permission issue?)");
            }

            // Method 2: Try getDisplayMedia to enumerate displays
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoInputs = devices.filter(d => d.kind === 'videoinput');
                    
                    if (videoInputs.length > 0) {
                        console.log(`[Display Detection - enumerateDevices] Found ${videoInputs.length} video input device(s)`);
                    }
                } catch (err) {
                    console.debug("enumerateDevices error:", err.message);
                }
            }

            // Method 3: Fallback - Detect via screen dimension analysis + WebGL
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            const availWidth = window.screen.availWidth;
            const availHeight = window.screen.availHeight;
            const colorDepth = window.screen.colorDepth;
            const pixelDepth = window.screen.pixelDepth;
            const devicePixelRatio = window.devicePixelRatio || 1;

            const screenData = {
                width: screenWidth,
                height: screenHeight,
                availWidth,
                availHeight,
                colorDepth,
                pixelDepth,
                devicePixelRatio,
            };

            setDisplayInfo([screenData]);
            
            detectionMethod = "window.screen API (Fallback)";
            detectedCount = 1;

            console.log(`[Display Detection - ${detectionMethod}]`);
            console.log(`  Primary screen: ${screenWidth}x${screenHeight}`);
            console.log(`  Available: ${availWidth}x${availHeight}`);
            console.log(`  Device Pixel Ratio: ${devicePixelRatio}`);
            console.log(`  Color Depth: ${colorDepth}, Pixel Depth: ${pixelDepth}`);

            // Method 3a: Detect via screen changes over time (extended display detection)
            screenWidthHistoryRef.current.push({ width: screenWidth, time: Date.now() });
            if (screenWidthHistoryRef.current.length > 5) {
                screenWidthHistoryRef.current.shift();
            }

            // Check if screen dimensions have recently changed (indicates display change)
            let dimensionChanged = false;
            if (screenWidthHistoryRef.current.length >= 2) {
                const currWidth = screenWidthHistoryRef.current[screenWidthHistoryRef.current.length - 1].width;
                const prevWidth = screenWidthHistoryRef.current[screenWidthHistoryRef.current.length - 2].width;
                if (currWidth !== prevWidth) {
                    dimensionChanged = true;
                    console.log(`[Display Detection] Screen dimension changed: ${prevWidth}x -> ${currWidth}x`);
                }
            }

            // Method 3b: Detect via aspect ratio changes (often different between laptop and TV)
            const aspectRatio = screenWidth / screenHeight;
            const isUltrawideOrTV = aspectRatio > 1.6; // 21:9 or wider often indicates external display
            
            if (isUltrawideOrTV) {
                console.log(`[Display Detection] Ultra-wide or TV aspect ratio detected: ${aspectRatio.toFixed(2)}`);
            }

            // Method 3c: Detect via physical screen size hints
            const isMobileResolution = screenWidth < 500 || screenHeight < 500;
            const isHighResExternal = screenWidth >= 1920 && screenHeight >= 1080 && !isMobileResolution;
            
            if (isHighResExternal) {
                console.log("[Display Detection] High resolution display detected (potential external)");
            }

            // Combine evidence for external display
            let isExternalDetected = dimensionChanged || (isHighResExternal && isUltrawideOrTV);

            // Additional: Check if availWidth differs significantly from width (indicates panels/taskbars)
            const taskbarHeight = screenHeight - availHeight;
            const taskbarWidth = screenWidth - availWidth;
            
            if (taskbarHeight > 50 || taskbarWidth > 50) {
                console.log(`[Display Detection] Significant taskbar/panel detected: width difference=${taskbarWidth}px, height difference=${taskbarHeight}px`);
            }

            setHasExternalDisplay(isExternalDetected);

            // Trigger callback if changed (with debouncing to avoid too many updates)
            const now = Date.now();
            if ((isExternalDetected !== (previousCountRef.current > 1)) && (now - lastDetectionTimeRef.current > 500)) {
                console.log(`[Display Detection] ⚠️ External display ${isExternalDetected ? 'DETECTED' : 'disconnected'}`);
                onExternalDisplayDetected?.(isExternalDetected, [screenData]);
                lastDetectionTimeRef.current = now;
            }
            previousCountRef.current = isExternalDetected ? 2 : 1;

        } catch (err) {
            console.error("Display detection error:", err);
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
