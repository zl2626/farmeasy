import React from "react";
import { motion } from "framer-motion";
import TranslateText from "../components/TranslateText";

export default function AboutUs() {
  return (
    <div style={pageWrapperStyle}>
      <div style={contentContainerStyle}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p style={eyebrowStyle}>
            <TranslateText>关于我们</TranslateText>
          </p>
          <h1 style={titleStyle}>
            <TranslateText>一起，种得更聪明。</TranslateText>
          </h1>
          <p style={leadStyle}>
            <TranslateText>
              智农 是一个在线农业教育与答疑平台，汇聚可靠的知识、专家支持和实时洞察，
              让农场里的日常决策更简单、更从容。
            </TranslateText>
          </p>

          <div style={gridStyle}>
            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                <TranslateText>我们的使命</TranslateText>
              </h2>
              <p style={bodyStyle}>
                <TranslateText>
                  我们致力于弥合技术与田间地头之间的鸿沟——以清晰、贴近本地语言的
                  方式解读作物、市场和政策知识，让每一位农户都能提前规划、降低风险、可持续地发展。
                </TranslateText>
              </p>
            </div>

            <div style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                <TranslateText>智农 提供什么</TranslateText>
              </h2>
              <ul style={listStyle}>
                <li>
                  <TranslateText>
                    作物百科，附带因地制宜的最佳实践
                  </TranslateText>
                </li>
                <li>
                  <TranslateText>每日市场价格行情</TranslateText>
                </li>
                <li>
                  <TranslateText>
                    惠农政策与补贴的简明解读
                  </TranslateText>
                </li>
                <li>
                  <TranslateText>
                    用熟悉的语言轻松提问并获得解答
                  </TranslateText>
                </li>
              </ul>
            </div>
          </div>

          <div style={footerStripStyle}>
            <p style={footerTextStyle}>
              <TranslateText>
                智农 作为数字伙伴与农户同行——无论何时需要解惑、指导或一份安心，它都在您身边。
              </TranslateText>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const pageWrapperStyle = {
  width: "100%",
  minHeight: "calc(100vh - 90px)",
  padding: "2.5rem 1.5rem 3.5rem",
  background:
    "linear-gradient(180deg, rgba(240,253,244,0.9), rgba(236,252,203,0.85))",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", sans-serif',
  display: "flex",
  justifyContent: "center",
};

const contentContainerStyle = {
  width: "100%",
  maxWidth: "1040px",
};

const eyebrowStyle = {
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: "0.78rem",
  color: "#15803d",
  marginBottom: "0.35rem",
  fontWeight: 600,
};

const titleStyle = {
  fontSize: "2.1rem",
  fontWeight: 700,
  marginBottom: "0.85rem",
  color: "#022c22",
};

const leadStyle = {
  fontSize: "1rem",
  lineHeight: 1.8,
  marginBottom: "2.1rem",
  color: "#14532d",
  maxWidth: "720px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
  gap: "2.4rem",
  marginBottom: "2rem",
};

const sectionStyle = {};

const sectionTitleStyle = {
  fontSize: "1.1rem",
  fontWeight: 600,
  marginBottom: "0.7rem",
  color: "#065f46",
};

const bodyStyle = {
  fontSize: "0.98rem",
  lineHeight: 1.8,
  color: "#064e3b",
};

const listStyle = {
  listStyle: "disc",
  paddingLeft: "1.25rem",
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "0.45rem",
  fontSize: "0.98rem",
  color: "#064e3b",
};

const footerStripStyle = {
  marginTop: "0.8rem",
  paddingTop: "1.1rem",
  borderTop: "1px solid rgba(22,163,74,0.25)",
};

const footerTextStyle = {
  fontSize: "0.9rem",
  color: "#166534",
};
