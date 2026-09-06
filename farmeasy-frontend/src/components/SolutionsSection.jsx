import { motion, AnimatePresence, useInView } from "framer-motion";
import { useState, useRef } from "react";
import TranslateText from "./TranslateText";

const solutions = [
    {
        id: "crop-education",
        label: "作物教育",
        title: "学习作物知识，种得更聪明",
        description:
            "获得清晰实用的指导：作物选择、土壤准备、季节规划、病虫害防治和产量优化。我们的 AI 平台把复杂的农业知识化繁为简，让您每个季节都能自信地做出决策。",
        image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=800&auto=format&fit=crop",
    },
    {
        id: "irrigation-education",
        label: "灌溉教育",
        title: "智慧灌溉知识",
        description:
            "学习最适合您作物的灌溉技术——从滴灌、喷灌到水资源管理策略。智农 提供基于 AI 的高效用水建议，既节约用水，又提升作物长势。",
        image: "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?q=80&w=800&auto=format&fit=crop",
    },
    {
        id: "smart-farming",
        label: "智慧农业洞察",
        title: "数据驱动的种植决策",
        description:
            "借助 AI 的力量，根据您所在的地区、土壤类型和种植历史获得个性化种植建议。从最佳播种时间到施肥计划——智农 把复杂数据变成简单可行的建议。",
        image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=800&auto=format&fit=crop",
    },
];

export default function SolutionsSection() {
    const [activeIdx, setActiveIdx] = useState(0);
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });
    const active = solutions[activeIdx];

    return (
        <section
            ref={ref}
            className="w-full py-20 md:py-28 px-4"
            style={{ background: "#f0fdf4" }}
        >
            <div className="max-w-[1200px] mx-auto">
                {/* Heading */}
                <motion.div
                    className="text-center mb-14"
                    initial={{ opacity: 0, y: 24 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                        <TranslateText>农业</TranslateText>{" "}
                        <span
                            className="px-3 py-1 rounded-full"
                            style={{ background: "rgba(102,187,106,0.25)", color: "#15803d" }}
                        >
                            <TranslateText>解决方案</TranslateText>
                        </span>
                    </h2>
                    <p className="text-gray-500 max-w-lg mx-auto text-base">
                        <TranslateText>专为农户设计的 AI 学习资源，帮助您一次学懂一个主题，持续学习、成长。</TranslateText>
                    </p>
                </motion.div>

                {/* Two-column layout */}
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch">
                    {/* Left — content */}
                    <motion.div
                        className="flex-1 min-w-0"
                        initial={{ opacity: 0, x: -30 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={active.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.35 }}
                                className="rounded-2xl p-8 h-full flex flex-col"
                                style={{
                                    background: "#fff",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                                }}
                            >
                                <div className="rounded-xl overflow-hidden mb-6 aspect-video">
                                    <img
                                        src={active.image}
                                        alt={active.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">
                                    <TranslateText>{active.title}</TranslateText>
                                </h3>
                                <p className="text-gray-500 leading-relaxed text-sm md:text-base">
                                    <TranslateText>{active.description}</TranslateText>
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>

                    {/* Right — vertical tab cards */}
                    <motion.div
                        className="lg:w-[280px] flex flex-row lg:flex-col gap-3"
                        initial={{ opacity: 0, x: 30 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.5, delay: 0.35 }}
                    >
                        {solutions.map((sol, i) => {
                            const isActive = i === activeIdx;
                            return (
                                <motion.button
                                    key={sol.id}
                                    onClick={() => setActiveIdx(i)}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="flex-1 lg:flex-none text-left rounded-xl px-5 py-4 font-semibold text-sm md:text-base transition-colors duration-300 cursor-pointer border-none outline-none"
                                    style={{
                                        background: isActive ? "#15803d" : "#fff",
                                        color: isActive ? "#fff" : "#1f2933",
                                        boxShadow: isActive
                                            ? "0 4px 16px rgba(21,128,61,0.3)"
                                            : "0 2px 10px rgba(0,0,0,0.05)",
                                    }}
                                >
                                    <TranslateText>{sol.label}</TranslateText>
                                </motion.button>
                            );
                        })}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
