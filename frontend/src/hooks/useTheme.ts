import { useCallback, useEffect, useState } from "react";
import { THEME_STORAGE_KEY } from "../constants/storage";

export type Theme = "dark" | "light";

function initialTheme(): Theme {
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === "dark" || saved === "light") return saved;
    } catch { /* storage unavailable */ }
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(initialTheme);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* storage unavailable */ }
    }, [theme]);

    const toggleTheme = useCallback(() => setTheme((current) => (current === "dark" ? "light" : "dark")), []);
    return { theme, toggleTheme };
}
