import { useLanguage } from "../context/LanguageContext";

export default function LanguageToggle() {
  const { toLang, setToLang } = useLanguage();

  return (
    <div style={wrapper}>
      <span style={labelStyle}>语言</span>
      <select
        value={toLang}
        onChange={(e) => setToLang(e.target.value)}
        style={selectStyle}
      >
        <option value="zh">中文</option>
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
        <option value="gu">ગુજરાતી</option>
        <option value="mr">मराठी</option>
        <option value="ta">தமிழ்</option>
        <option value="te">తెలుగు</option>
        <option value="kn">ಕನ್ನಡ</option>
      </select>
    </div>
  );
}

const wrapper = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const labelStyle = {
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 600,
  color: "#ecfdf5",
};

const selectStyle = {
  backgroundColor: "rgba(255,255,255,0.9)",
  borderRadius: 999,
  border: "1px solid rgba(22,163,74,0.65)",
  color: "#064e3b",
  fontSize: "0.82rem",
  padding: "4px 16px",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};
