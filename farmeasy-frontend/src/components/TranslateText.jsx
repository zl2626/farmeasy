import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../context/useLanguage";
import { translateText } from "../services/translateService";

export default function TranslateText({ children }) {
  const { translationEnabled, fromLang, toLang } = useLanguage();
  const fallback = String(children ?? "");
  const translationKey = `${fromLang}|${toLang}|${fallback}`;
  const [translatedByKey, setTranslatedByKey] = useState({});

  const text = useMemo(() => {
    if (!translationEnabled) return fallback;
    return translatedByKey[translationKey] || fallback;
  }, [translationEnabled, fallback, translatedByKey, translationKey]);

  useEffect(() => {
    if (!translationEnabled) return;
    let active = true;
    translateText(fallback, fromLang, toLang)
      .then((result) => {
        if (active) setTranslatedByKey((prev) => ({ ...prev, [translationKey]: result }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [translationEnabled, fallback, fromLang, toLang, translationKey]);

  return <>{text}</>;
}
