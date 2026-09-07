import { useState } from "react";
import { LanguageContext } from "./languageContext";

export function LanguageProvider({ children }) {
    const [toLang, setToLang] = useState("zh");
    const fromLang = "zh";
    const translationEnabled = toLang !== "zh";
    return (
        <LanguageContext.Provider value={{
            translationEnabled,
            fromLang,
            toLang,
            setToLang,
        }}>
            {children}
        </LanguageContext.Provider>
    );
}
