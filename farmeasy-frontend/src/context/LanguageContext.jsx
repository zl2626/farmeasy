import { createContext,useContext,useState } from "react";

const LanguageContext = createContext();

export function LanguageProvider({ children }){
    const [toLang,setToLang] = useState("zh");
    const fromLang = "zh";
    const translationEnabled = toLang !== "zh";
    return(
        <LanguageContext.Provider value ={{
            translationEnabled,
            fromLang,
            toLang,
            setToLang,
        }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () =>{ 
    const context = useContext(LanguageContext)
    if(!context){
        throw new Error("useLanguage must be used inside LanguageProvider");
    }
    return context;
    };