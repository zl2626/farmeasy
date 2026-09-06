import { useState, useEffect } from "react";
import { motion } from "framer-motion";
const FINAL_SEQUENCE = [
  { id: 1, text: "智", color: "#2e7d32" },
  { id: 2, text: "农", color: "#4caf50" },
];


export default function LogoShuffle() {
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
          <ul style={container}>
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
    margin: "10px auto",
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
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "3rem",
    fontWeight: 800,
    letterSpacing: "0.04em",
    color: "#fff",
  };