import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import TranslateText from "./TranslateText";

const services = [
    {
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
        ),
        title: "AI 答疑机器人",
        description: "智能 AI 聊天机器人，即时解答农户关于作物、病虫害、肥料和种植技术的疑问——语言简单、随问随答。",
    },
    {
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
        ),
        title: "市场价格情报",
        description: "基于历史快照示例数据展示各地批发市场行情参考，帮助农户了解价格区间，做出更明智的销售决策。",
    },
    {
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
            </svg>
        ),
        title: "惠农政策与补贴",
        description: "通俗易懂地解读各项惠农政策、补贴、贷款及申请条件，帮助您充分享受政策红利。",
    },
    {
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
        ),
        title: "专属疑问支持",
        description: "遇到复杂问题时，可联系专家管理员获得更深入的指导和个性化帮助，人工协助解决难题。",
    },
];

const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" },
    }),
};

export default function ServicesSection() {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section
            ref={ref}
            className="w-full py-20 md:py-28 px-4"
            style={{ background: "#ffffc5" }}
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
                        <TranslateText>我们的</TranslateText>{" "}
                        <span
                            className="px-3 py-1 rounded-full"
                            style={{ background: "rgba(102,187,106,0.25)", color: "#15803d" }}
                        >
                            <TranslateText>服务</TranslateText>
                        </span>
                    </h2>
                    <p className="text-gray-500 max-w-md mx-auto text-base">
                        <TranslateText>从 AI 即时答疑到历史行情参考——农户需要的一切，触手可及。</TranslateText>
                    </p>
                </motion.div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                    {services.map((svc, i) => (
                        <motion.div
                            key={svc.title}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate={inView ? "visible" : "hidden"}
                            whileHover={{ y: -6, boxShadow: "0 12px 32px rgba(76,175,80,0.18)" }}
                            className="rounded-2xl p-7 cursor-default transition-all duration-300"
                            style={{
                                background: "#fff",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                                border: "1px solid transparent",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.border = "1px solid rgba(76,175,80,0.3)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.border = "1px solid transparent";
                            }}
                        >
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                                style={{ background: "#f0fdf4", color: "#15803d" }}
                            >
                                {svc.icon}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">
                                <TranslateText>{svc.title}</TranslateText>
                            </h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                <TranslateText>{svc.description}</TranslateText>
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
