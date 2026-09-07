import { motion, AnimatePresence, useInView } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import TranslateText from "./TranslateText";

const testimonials = [
    {
        name: "张明华",
        role: "山东省 · 小麦农户",
        quote:
            "智农 告诉我返青期该怎么追肥，还每天更新附近粮点的收购价格。今年卖粮时机把握得好，一亩地多赚了两百多块。",
    },
    {
        name: "李秀兰",
        role: "湖南省 · 水稻种植户",
        quote:
            "以前总是弄不懂各类补贴政策，智农 的 AI 助手用大白话给我讲清了申请条件，还一步步教我在手机上申报，补贴很快就到账了。",
    },
    {
        name: "王建国",
        role: "河南省 · 蔬菜种植户",
        quote:
            "大棚番茄叶片发黄，拍照上传后 AI 马上给出了诊断和用药建议。按方案处理后病情很快控制住，这季少损失了不少钱。",
    },
];

export default function TestimonialsSection() {
    const [current, setCurrent] = useState(0);
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });

    const next = useCallback(() => {
        setCurrent((prev) => (prev + 1) % testimonials.length);
    }, []);

    useEffect(() => {
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, [next]);

    const t = testimonials[current];

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
                        <TranslateText>听听</TranslateText>{" "}
                        <span
                            className="px-3 py-1 rounded-full"
                            style={{ background: "rgba(102,187,106,0.25)", color: "#15803d" }}
                        >
                            <TranslateText>农户们</TranslateText>
                        </span>{" "}
                        <TranslateText>怎么说</TranslateText>
                    </h2>
                </motion.div>

                {/* Testimonial card */}
                <motion.div
                    className="rounded-2xl overflow-hidden"
                    style={{
                        background: "#fff",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                    }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.15 }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.4 }}
                            className="flex flex-col"
                        >
                            {/* Text */}
                            <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
                                <svg
                                    className="w-10 h-10 mb-4"
                                    style={{ color: "rgba(76,175,80,0.3)" }}
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
                                </svg>
                                <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-6 italic">
                                    &ldquo;<TranslateText>{t.quote}</TranslateText>&rdquo;
                                </p>
                                <div>
                                    <p className="font-bold text-gray-800">{t.name}</p>
                                    <p className="text-sm text-gray-500">
                                        <TranslateText>{t.role}</TranslateText>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </motion.div>

                {/* Dots */}
                <div className="flex justify-center gap-2 mt-6">
                    {testimonials.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            className="w-3 h-3 rounded-full transition-all duration-300 border-none cursor-pointer"
                            style={{
                                background: i === current ? "#15803d" : "rgba(76,175,80,0.25)",
                                transform: i === current ? "scale(1.3)" : "scale(1)",
                            }}
                            aria-label={`Go to testimonial ${i + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
