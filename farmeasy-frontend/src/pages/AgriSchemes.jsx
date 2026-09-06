import { useState } from "react";
import TranslateText from "../components/TranslateText";
import Navbar from "../components/Navbar";
import { AGRI_SCHEMES } from "../data/agriSchemes";

/* ─── tiny inline styles ─────────────────────────────────────── */
const pageStyle = {
  padding: "30px",
  paddingTop: "90px",
  maxWidth: "900px",
  margin: "0 auto",
  backgroundColor: "#f4faf4",
  minHeight: "100vh",
  color: "#333",
};

const card = {
  marginBottom: "20px",
  padding: "20px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  backgroundColor: "#f9f9f9",
  color: "#333",
};

const detailBox = {
  marginTop: "15px",
  padding: "15px",
  border: "2px solid #4caf50",
  borderRadius: "8px",
  backgroundColor: "#f1fff1",
  color: "#333",
};

const btn = {
  padding: "8px 15px",
  backgroundColor: "#4caf50",
  color: "white",
  border: "none",
  cursor: "pointer",
  marginTop: "10px",
  borderRadius: "4px",
};

const noteStyle = {
  textAlign: "center",
  color: "#888",
  fontSize: "0.9rem",
  marginBottom: "24px",
};

const tagPill = {
  fontSize: "0.72rem",
  padding: "2px 10px",
  borderRadius: "20px",
  backgroundColor: "#e8f5e9",
  color: "#2e7d32",
  marginLeft: "8px",
  verticalAlign: "middle",
  fontWeight: "normal",
  whiteSpace: "nowrap",
};

/* ─── main component ─────────────────────────────────────────── */
function AgriSchemes() {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <>
      <Navbar />
      <div style={pageStyle}>
        <h2 style={{ textAlign: "center", marginBottom: "12px" }}>
          <TranslateText>惠农政策</TranslateText>
        </h2>
        <p style={noteStyle}>
          <TranslateText>以下为我国现行主要惠农政策，具体补贴标准以当地当年发布为准。</TranslateText>
        </p>

        {AGRI_SCHEMES.map((scheme) => {
          const isExpanded = expandedId === scheme.id;

          return (
            <div key={scheme.id} style={card}>
              <h3>
                <TranslateText>{scheme.name}</TranslateText>
                {scheme.tag && (
                  <span style={tagPill}><TranslateText>{scheme.tag}</TranslateText></span>
                )}
              </h3>
              <p>
                <strong><TranslateText>简介：</TranslateText></strong> <TranslateText>{scheme.description}</TranslateText>
              </p>

              {/* ── 政策详情 ── */}
              {isExpanded && (
                <div style={detailBox}>
                  <h4><TranslateText>政策详情</TranslateText></h4>

                  <p>
                    <strong><TranslateText>申请条件：</TranslateText></strong>
                    <br />
                    <TranslateText>{scheme.eligibility}</TranslateText>
                  </p>

                  <p>
                    <strong><TranslateText>补贴内容：</TranslateText></strong>
                    <br />
                    <TranslateText>{scheme.benefits}</TranslateText>
                  </p>

                  <p style={{ marginBottom: "8px" }}>
                    📅 <strong><TranslateText>截止时间：</TranslateText></strong>{" "}
                    <TranslateText>{scheme.deadline}</TranslateText>
                  </p>

                  {scheme.documents && scheme.documents.length > 0 && (
                    <>
                      <p style={{ marginBottom: "4px" }}>
                        📄 <strong><TranslateText>所需材料：</TranslateText></strong>
                      </p>
                      <ul style={{ marginLeft: "20px", marginBottom: "10px" }}>
                        {scheme.documents.map((doc, i) => (
                          <li key={i}><TranslateText>{doc}</TranslateText></li>
                        ))}
                      </ul>
                    </>
                  )}

                  {scheme.how_to_apply && scheme.how_to_apply.length > 0 && (
                    <>
                      <p style={{ marginBottom: "4px" }}>
                        📝 <strong><TranslateText>申请流程：</TranslateText></strong>
                      </p>
                      <ol style={{ marginLeft: "20px", marginBottom: "10px" }}>
                        {scheme.how_to_apply.map((step, i) => (
                          <li key={i}><TranslateText>{step}</TranslateText></li>
                        ))}
                      </ol>
                    </>
                  )}

                  {scheme.official_link && (
                    <p style={{ marginTop: "8px", fontSize: "0.8rem", color: "#555" }}>
                      <TranslateText>来源：</TranslateText>{" "}
                      <a href={scheme.official_link} target="_blank" rel="noreferrer">
                        {scheme.official_link}
                      </a>
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => setExpandedId(isExpanded ? null : scheme.id)}
                style={btn}
              >
                <TranslateText>{isExpanded ? "收起" : "查看更多"}</TranslateText>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default AgriSchemes;
