import { useState, useCallback, useRef } from "react";

let _id = 0;

export default function useToast() {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef({});

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
    }, []);

    const addToast = useCallback(
        (message, type = "info", duration = 4000) => {
            const id = ++_id;
            setToasts((prev) => [...prev, { id, message, type }]);

            if (duration > 0) {
                timersRef.current[id] = setTimeout(() => removeToast(id), duration);
            }

            return id;
        },
        [removeToast]
    );

    return { toasts, addToast, removeToast };
}
