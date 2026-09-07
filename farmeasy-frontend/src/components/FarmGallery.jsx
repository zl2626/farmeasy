import { useState, useEffect, useCallback, useRef } from "react";
import { motion, useInView } from "framer-motion";
import TranslateText from "./TranslateText";

import imgTerracedRice from "../assets/gallery/terraced-rice.jpg";
import imgTeaHarvest from "../assets/gallery/tea-harvest.jpg";
import imgRapeseedVillage from "../assets/gallery/rapeseed-village.jpg";
import imgWheatCombine from "../assets/gallery/wheat-combine.jpg";
import imgHarvestDrying from "../assets/gallery/harvest-drying.jpg";
import imgCottonHarvest from "../assets/gallery/cotton-harvest.jpg";
import imgTractorSeeding from "../assets/gallery/tractor-seeding.jpg";
import imgRiceHarvest from "../assets/gallery/rice-harvest.jpg";

const slides = [
    { src: imgTerracedRice, tag: "稻作文化", title: "云南梯田 · 云上稻浪", desc: "层层叠叠的哈尼梯田，延续千年的稻作智慧。" },
    { src: imgTeaHarvest, tag: "特色经济作物", title: "明前采茶 · 指尖春色", desc: "茶农穿梭于梯垄茶园，采摘一年中最鲜嫩的芽叶。" },
    { src: imgRapeseedVillage, tag: "美丽乡村", title: "皖南村落 · 油菜花海", desc: "白墙黛瓦与金黄油菜花相映，绘就乡村振兴画卷。" },
    { src: imgWheatCombine, tag: "智慧农机", title: "夏收进行时 · 颗粒归仓", desc: "大型联合收割机驰骋麦田，机械化率持续攀升。" },
    { src: imgHarvestDrying, tag: "丰收晒秋", title: "篁岭晒秋 · 五谷丰登", desc: "辣椒、玉米、黄豆铺满晒匾，晒出丰收的中国色。" },
    { src: imgCottonHarvest, tag: "机采棉", title: "新疆棉田 · 白色丰收", desc: "采棉机高效作业，新疆棉花机械化采收率超八成。" },
    { src: imgTractorSeeding, tag: "春耕备耕", title: "精量播种 · 不误农时", desc: "北斗导航拖拉机牵引播种机，跑出春耕加速度。" },
    { src: imgRiceHarvest, tag: "粮食安全", title: "金秋稻熟 · 丰收在望", desc: "收割机开镰收割晚稻，稳稳端牢中国饭碗。" },
];

export default function FarmGallery() {
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });

    const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), []);
    const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), []);

    useEffect(() => {
        if (paused) return undefined;
        const t = setInterval(next, 4500);
        return () => clearInterval(t);
    }, [paused, next]);

    return (
        <section
            ref={ref}
            className="w-full py-20 md:py-28 px-4"
            style={{ background: "linear-gradient(180deg, #f4fbf1 0%, #ffffc5 100%)" }}
        >
            <div className="max-w-[1200px] mx-auto">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 24 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                        <TranslateText>大美</TranslateText>{" "}
                        <span
                            className="px-3 py-1 rounded-full"
                            style={{ background: "rgba(102,187,106,0.25)", color: "#15803d" }}
                        >
                            <TranslateText>中国农业</TranslateText>
                        </span>
                    </h2>
                    <p className="text-gray-500 max-w-md mx-auto text-base">
                        <TranslateText>从梯田茶园到万亩粮仓，一览神州大地的丰收图景。</TranslateText>
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                    className="relative w-full overflow-hidden rounded-3xl"
                    style={{
                        boxShadow: "0 20px 60px rgba(21,128,61,0.18)",
                        aspectRatio: "16 / 7",
                        minHeight: "260px",
                        background: "#1a2e1a",
                    }}
                >
                    {slides.map((s, i) => (
                        <div
                            key={s.title}
                            style={{
                                position: "absolute",
                                inset: 0,
                                opacity: i === current ? 1 : 0,
                                transition: "opacity 0.9s ease",
                            }}
                        >
                            <img
                                src={s.src}
                                alt={s.title}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    transform: i === current ? "scale(1.04)" : "scale(1)",
                                    transition: "transform 4.5s ease",
                                }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(10,30,10,0.72) 100%)",
                                }}
                            />
                            <div
                                className="absolute left-0 right-0 bottom-0 px-6 md:px-10 pb-6 md:pb-8"
                                
                            >
                                <span
                                    className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3"
                                    style={{ background: "rgba(76,175,80,0.9)", color: "#fff" }}
                                >
                                    <TranslateText>{s.tag}</TranslateText>
                                </span>
                                <h3 className="text-xl md:text-2xl font-bold text-white mb-1" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                                    <TranslateText>{s.title}</TranslateText>
                                </h3>
                                <p className="text-sm md:text-base max-w-xl" style={{ color: "rgba(255,255,255,0.85)" }}>
                                    <TranslateText>{s.desc}</TranslateText>
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Arrows */}
                    {[
                        { label: "‹", onClick: prev, side: "left" },
                        { label: "›", onClick: next, side: "right" },
                    ].map((btn) => (
                        <button
                            key={btn.side}
                            onClick={btn.onClick}
                            aria-label={btn.side === "left" ? "上一张" : "下一张"}
                            style={{
                                position: "absolute",
                                top: "50%",
                                [btn.side]: "16px",
                                transform: "translateY(-50%)",
                                width: "44px",
                                height: "44px",
                                borderRadius: "50%",
                                border: "none",
                                background: "rgba(255,255,255,0.22)",
                                backdropFilter: "blur(6px)",
                                color: "#fff",
                                fontSize: "26px",
                                lineHeight: 1,
                                cursor: "pointer",
                                transition: "background 0.2s",
                                zIndex: 5,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(76,175,80,0.75)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
                        >
                            {btn.label}
                        </button>
                    ))}

                    {/* Dots */}
                    <div
                        style={{
                            position: "absolute",
                            bottom: "16px",
                            right: "24px",
                            display: "flex",
                            gap: "8px",
                            zIndex: 5,
                        }}
                    >
                        {slides.map((s, i) => (
                            <button
                                key={s.title}
                                aria-label={`跳转到第 ${i + 1} 张`}
                                onClick={() => setCurrent(i)}
                                style={{
                                    width: i === current ? "24px" : "8px",
                                    height: "8px",
                                    borderRadius: "4px",
                                    border: "none",
                                    padding: 0,
                                    cursor: "pointer",
                                    background: i === current ? "#4caf50" : "rgba(255,255,255,0.5)",
                                    transition: "all 0.3s",
                                }}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Thumbnails */}
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3 mt-4">
                    {slides.map((s, i) => (
                        <button
                            key={s.title}
                            onClick={() => setCurrent(i)}
                            aria-label={s.title}
                            style={{
                                padding: 0,
                                border: i === current ? "2px solid #4caf50" : "2px solid transparent",
                                borderRadius: "12px",
                                overflow: "hidden",
                                cursor: "pointer",
                                aspectRatio: "4 / 3",
                                background: "none",
                                opacity: i === current ? 1 : 0.65,
                                transition: "all 0.25s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = i === current ? "1" : "0.65")}
                        >
                            <img src={s.src} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}

