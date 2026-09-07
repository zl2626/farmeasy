import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import TranslateText from "./TranslateText";
import imgWheatCombine from "../assets/gallery/wheat-combine.jpg";
import imgTerracedRice from "../assets/gallery/terraced-rice.jpg";
import imgTractorSeeding from "../assets/gallery/tractor-seeding.jpg";

const blogs = [
    {
        image: imgWheatCombine,
        tag: "作物教育",
        title: "如何用智慧技术提高小麦产量",
        description:
            "学习实用的、有 AI 支持的策略：土壤准备、选种和病虫害防治，助力本季小麦增产。",
    },
    {
        image: imgTerracedRice,
        tag: "惠农政策",
        title: "读懂耕地地力保护补贴等惠农政策",
        description:
            "一份简明指南：耕地地力保护补贴、农机购置补贴等主要惠农政策的申请条件、补贴内容和申请流程。",
    },
    {
        image: imgTractorSeeding,
        tag: "灌溉",
        title: "节水灌溉的最佳实践",
        description:
            "了解滴灌、喷灌和智能排程技术，在保持作物健康高产的同时节约用水。",
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

export default function BlogSection() {
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
                        <TranslateText>最新动态与</TranslateText>{" "}
                        <span
                            className="px-3 py-1 rounded-full"
                            style={{ background: "rgba(102,187,106,0.25)", color: "#15803d" }}
                        >
                            <TranslateText>实用技巧</TranslateText>
                        </span>
                    </h2>
                    <p className="text-gray-500 max-w-md mx-auto text-base">
                        <TranslateText>实用的农业知识、政策更新和作物技巧——用简单的语言写给每一位农户。</TranslateText>
                    </p>
                </motion.div>

                {/* Blog Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {blogs.map((blog, i) => (
                        <motion.div
                            key={blog.title}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate={inView ? "visible" : "hidden"}
                            whileHover={{ y: -6 }}
                            className="rounded-2xl overflow-hidden cursor-pointer group"
                            style={{
                                background: "#fff",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                            }}
                        >
                            {/* Image */}
                            <div className="h-[200px] overflow-hidden">
                                <img
                                    src={blog.image}
                                    alt={blog.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <span
                                    className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3"
                                    style={{ background: "#f0fdf4", color: "#15803d" }}
                                >
                                    <TranslateText>{blog.tag}</TranslateText>
                                </span>
                                <h3 className="text-base font-bold text-gray-800 mb-2 leading-snug">
                                    <TranslateText>{blog.title}</TranslateText>
                                </h3>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    <TranslateText>{blog.description}</TranslateText>
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

