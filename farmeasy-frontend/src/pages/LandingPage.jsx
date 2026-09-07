import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import FallingLeaves from "../components/FallingLeaves";
import ZhinongLogo from "../assets/Logo.png";
import { useState, useEffect } from "react";
import TranslateText from "../components/TranslateText";
import { Boxes } from "../components/ui/background-boxes";
const FINAL_SEQUENCE = [
  { id: 1, text: "智", color: "#2e7d32" },
  { id: 2, text: "农", color: "#4caf50" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  const [blocks, setBlocks] = useState(FINAL_SEQUENCE);
  const [isShuffling, setIsShuffling] = useState(true);



  useEffect(() => {
    if (!isShuffling) return;

    const shuffleInterval = setInterval(() => {
      setBlocks((prev) => shuffle([...prev]));
    }, 300);

    const stopShuffle = setTimeout(() => {
      setIsShuffling(false);
      setBlocks(FINAL_SEQUENCE);
    }, 2000);

    return () => {
      clearInterval(shuffleInterval);
      clearTimeout(stopShuffle);
    };
  }, [isShuffling]);

  return (
    <div style={pageWrapper}>
      {/* Background Boxes layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <Boxes />
        {/* Radial mask to fade edges and blend with page background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background:
              "radial-gradient(circle at center, transparent 30%, rgba(255,255,197,0.9) 80%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* All existing content — layered above the boxes */}
      <motion.div style={{ ...logoWrapper, position: "relative", zIndex: 2 }}>
        <img src={ZhinongLogo} alt="智农 logo" style={heroLogoStyle} />
      </motion.div>

      <ul style={{ ...container, position: "relative", zIndex: 2 }}>
        {blocks.map((block) => (
          <motion.li
            key={block.id}
            layout
            transition={spring}
            style={{ ...moveItem, backgroundColor: block.color }}
          >
            {block.text}
          </motion.li>
        ))}
      </ul>

      <div style={{ ...cardStyle, position: "relative", zIndex: 2 }}>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/home")}
          style={ctaButtonStyle}
        >
          <TranslateText>开始使用</TranslateText>
        </motion.button>
        <p style={cardTextStyle}>
          <TranslateText>
            提升您的农业知识，轻松上手我们的应用。
            开启您的智慧农业之旅，从 智农 开始！
          </TranslateText>
        </p>
      </div>

      <p style={{ ...taglineStyle, position: "relative", zIndex: 2 }}>
        <TranslateText>
          智农 —— 在线农业教育与答疑平台
        </TranslateText>
      </p>
    </div>
  );
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

const spring = {
  type: "spring",
  stiffness: 300,
  damping: 20,
};

const container = {
  listStyle: "none",
  padding: 0,
  margin: "20px auto",
  display: "flex",
  gap: 0,
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1,
  position: "relative",
};

const moveItem = {
  width: 100,
  height: 90,
  borderRadius: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "4rem",
  fontWeight: "bold",
  color: "#fff",
};

const pageWrapper = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "3rem 1.5rem 2.5rem",
  position: "relative",
  overflow: "hidden",
  background: "#ffffc5",
};

const logoWrapper = {
  marginBottom: "1.5rem",
};

const heroLogoStyle = {
  height: "96px",
  width: "auto",
  borderRadius: "24px",
  boxShadow: "0 18px 45px rgba(22,101,52,0.35)",
};

const cardStyle = {
  marginTop: "1.75rem",
  padding: "1.75rem 2rem",
  maxWidth: "460px",
  width: "100%",
  borderRadius: "20px",
  background: "#f9fafb",
  boxShadow: "0 16px 40px rgba(15,23,42,0.18)",
  textAlign: "center",
};

const ctaButtonStyle = {
  background:
    "linear-gradient(90deg, rgba(22,163,74,0.98), rgba(34,197,94,0.98))",
  border: "none",
  borderRadius: "999px",
  padding: "0.75rem 2.25rem",
  fontSize: "1rem",
  fontWeight: 600,
  color: "#f9fafb",
  cursor: "pointer",
  boxShadow: "0 10px 30px rgba(22,163,74,0.35)",
};

const cardTextStyle = {
  marginTop: "1rem",
  fontSize: "0.98rem",
  lineHeight: 1.7,
  color: "#1f2933",
};

const taglineStyle = {
  marginTop: "1.75rem",
  fontSize: "0.9rem",
  color: "#4b5563",
  textAlign: "center",
};
