import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import TranslateText from "./TranslateText";

const stats = [
    { value: "10,000+", label: "已解答农户疑问" },
    { value: "500+", label: "每日追踪市场价格" },
    { value: "200+", label: "解读惠农政策" },
    { value: "24/7", label: "全天候 AI 助手" },
];

export default function StatsSection() {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });

    return (
        <section
            ref={ref}
            className="w-full py-16 md:py-24 px-4"
            style={{ background: "#ffffc5" }}
        >
            <div className="max-w-[1200px] mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">
                    {stats.map((st, i) => (
                        <motion.div
                            key={st.label}
                            initial={{ opacity: 0, y: 30 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: i * 0.12, duration: 0.5 }}
                            className="text-center py-6 md:py-0"
                            style={{
                                borderRight:
                                    i < stats.length - 1
                                        ? "1px solid rgba(76,175,80,0.2)"
                                        : "none",
                            }}
                        >
                            <p
                                className="text-3xl md:text-4xl font-extrabold mb-1"
                                style={{ color: "#15803d" }}
                            >
                                {st.value}
                            </p>
                            <p className="text-sm md:text-base text-gray-500">
                                <TranslateText>{st.label}</TranslateText>
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
