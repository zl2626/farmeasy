import { useState } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import TranslateText from "./TranslateText";

import imgWheatCombine from "../assets/gallery/wheat-combine.jpg";
import imgTractorSeeding from "../assets/gallery/tractor-seeding.jpg";
import imgCottonHarvest from "../assets/gallery/cotton-harvest.jpg";
import imgTerracedRice from "../assets/gallery/terraced-rice.jpg";

const categories = ["全部", "粮食生产", "乡村振兴", "农业科技", "政策解读"];

const news = [
    {
        category: "粮食生产",
        date: "2026-08-28",
        title: "全国秋粮长势总体正常 丰收有基础",
        summary: "农业农村部调度显示，今年秋粮面积稳中有增，主产区墒情适宜，病虫害防控到位，秋粮长势总体正常，夺取全年粮食丰收有较好基础。",
        image: imgWheatCombine,
        hot: true,
    },
    {
        category: "农业科技",
        date: "2026-08-15",
        title: "北斗导航农机保有量突破百万台套",
        summary: "随着智慧农业加速推进，加装北斗终端的拖拉机、收割机和植保无人机保有量持续增长，精量播种、变量施肥等作业质量明显提升。",
        image: imgTractorSeeding,
    },
    {
        category: "乡村振兴",
        date: "2026-07-30",
        title: "新疆棉花机采率超八成 全产业链提质增效",
        summary: "新疆持续推进棉花生产全程机械化，机采率已超过80%，并同步发展纺织加工、棉籽综合利用等下游产业，带动棉农稳定增收。",
        image: imgCottonHarvest,
    },
    {
        category: "政策解读",
        date: "2026-07-12",
        title: "新一轮高标准农田建设实施方案印发",
        summary: "方案提出到2030年累计建成高标准农田13.5亿亩，统筹推进田、土、水、路、林、电、技、管综合治理，稳步提升粮食综合产能。",
        image: imgTerracedRice,
    },
    {
        category: "粮食生产",
        date: "2026-06-20",
        title: "夏粮收购进展顺利 价格运行平稳",
        summary: "主产区小麦集中上市，各类收购主体入市积极，最低收购价政策托底作用明显，农民售粮渠道畅通。",
        image: imgWheatCombine,
    },
    {
        category: "农业科技",
        date: "2026-05-18",
        title: "农业无人机作业面积再创新高",
        summary: "植保无人机在水稻、小麦、玉米等作物的统防统治中广泛应用，年作业面积持续增长，农药利用率稳步提高。",
        image: imgTractorSeeding,
    },
];

const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" },
    }),
};

export default function AgriNewsSection() {
    const [active, setActive] = useState("全部");
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });

    const filtered = active === "全部" ? news : news.filter((n) => n.category === active);
    const [headline, ...rest] = filtered;

    return (
        <section
            ref={ref}
            className="w-full py-20 md:py-28 px-4"
            style={{ background: "#f7faf7" }}
        >
            <div className="max-w-[1200px] mx-auto">
                {/* Heading */}
                <motion.div
                    className="text-center mb-10"
                    initial={{ opacity: 0, y: 24 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                        <TranslateText>中国农业</TranslateText>{" "}
                        <span
                            className="px-3 py-1 rounded-full"
                            style={{ background: "rgba(102,187,106,0.25)", color: "#15803d" }}
                        >
                            <TranslateText>新闻资讯</TranslateText>
                        </span>
                    </h2>
                    <p className="text-gray-500 max-w-md mx-auto text-base">
                        <TranslateText>聚焦粮食生产、农业科技与惠农政策，把握三农发展脉搏。</TranslateText>
                    </p>
                </motion.div>

                {/* Category Tabs */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-10">
                    {categories.map((c) => (
                        <button
                            key={c}
                            onClick={() => setActive(c)}
                            style={{
                                padding: "8px 20px",
                                borderRadius: "999px",
                                border: active === c ? "none" : "1.5px solid #c8e6c9",
                                background: active === c ? "linear-gradient(135deg, #4caf50, #2e7d32)" : "#fff",
                                color: active === c ? "#fff" : "#2e7d32",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.25s",
                                boxShadow: active === c ? "0 4px 14px rgba(76,175,80,0.35)" : "none",
                            }}
                        >
                            <TranslateText>{c}</TranslateText>
                        </button>
                    ))}
                </div>

                {/* News Layout: headline + list */}
                {headline && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Headline card */}
                        <motion.article
                            key={headline.title}
                            variants={cardVariants}
                            initial="hidden"
                            animate={inView ? "visible" : "hidden"}
                            custom={0}
                            className="lg:col-span-3 rounded-2xl overflow-hidden cursor-pointer group"
                            style={{ background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
                            whileHover={{ y: -6 }}
                        >
                            <div style={{ height: "280px", overflow: "hidden", position: "relative" }}>
                                <img
                                    src={headline.image}
                                    alt={headline.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <span
                                    className="absolute top-4 left-4 text-xs font-semibold px-3 py-1 rounded-full"
                                    style={{ background: "rgba(76,175,80,0.92)", color: "#fff" }}
                                >
                                    <TranslateText>{headline.category}</TranslateText>
                                </span>
                                {headline.hot && (
                                    <span
                                        className="absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full"
                                        style={{ background: "#ef4444", color: "#fff" }}
                                    >
                                        🔥 <TranslateText>头条</TranslateText>
                                    </span>
                                )}
                            </div>
                            <div className="p-6">
                                <p className="text-xs mb-2" style={{ color: "#9ca3af" }}>{headline.date}</p>
                                <h3 className="text-lg font-bold text-gray-800 mb-2 leading-snug">
                                    <TranslateText>{headline.title}</TranslateText>
                                </h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    <TranslateText>{headline.summary}</TranslateText>
                                </p>
                            </div>
                        </motion.article>

                        {/* Side list */}
                        <div className="lg:col-span-2 flex flex-col gap-4">
                            {rest.slice(0, 4).map((n, i) => (
                                <motion.article
                                    key={n.title}
                                    custom={i + 1}
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate={inView ? "visible" : "hidden"}
                                    whileHover={{ x: 4 }}
                                    className="rounded-2xl p-5 cursor-pointer"
                                    style={{
                                        background: "#fff",
                                        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                                        borderLeft: "3px solid #4caf50",
                                    }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span
                                            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                                            style={{ background: "#f0fdf4", color: "#15803d" }}
                                        >
                                            <TranslateText>{n.category}</TranslateText>
                                        </span>
                                        <span className="text-xs" style={{ color: "#9ca3af" }}>{n.date}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800 mb-1 leading-snug">
                                        <TranslateText>{n.title}</TranslateText>
                                    </h4>
                                    <p
                                        className="text-xs text-gray-500 leading-relaxed"
                                        style={{
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <TranslateText>{n.summary}</TranslateText>
                                    </p>
                                </motion.article>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

