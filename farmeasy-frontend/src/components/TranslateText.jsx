import {useEffect,useState } from "react";
import {useLanguage} from "../context/LanguageContext";
import { translateText } from "../services/translateService";

export default function TranslateText({ children }){
const { translationEnabled,fromLang,toLang } = useLanguage();
const [text,setText] = useState(children);

useEffect(() => {
    if(!translationEnabled){
        setText(children);
        return;

    }

    translateText(children,fromLang,toLang)
    .then(setText)
    .catch(() => setText(children));
},[translationEnabled,fromLang,toLang,children]);

return <>{text}</>;

}