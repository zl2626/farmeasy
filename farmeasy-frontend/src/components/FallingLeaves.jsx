import * as motion from "motion/react-client";
import leaf from "../assets/leaves.svg";

function random(min, max) {
  return Math.random() * (max - min) + min;
}

export default function FallingLeaves({ mode }) {
  return (
    <div style={container}>
      {Array.from({ length: 22 }).map((_, index) => (
        <motion.img
          key={index}
          src={leaf}
          alt="falling leaf"
          style={{
            ...leafStyle,
            left: `${random(0, 100)}vw`,
            width: `${random(24, 40)}px`,
          }}
          initial={{
            y: -100,
            rotate: random(0, 360),
            opacity: 0,
          }}
          animate={{
            y: "100vh",
            rotate: random(360, 720),
            x: [0, random(-40, 40), 0],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: random(8, 14),
            repeat: Infinity,
            ease: "linear",
            delay: random(0, 5),
          }}
        />
      ))}
    </div>
  );
}

const container = {
  position: "fixed",
  inset: 0,
  overflow: "hidden",
  pointerEvents: "none",
  zIndex: 0,
};

const leafStyle = {
  position: "absolute",
  top: 0,
};
