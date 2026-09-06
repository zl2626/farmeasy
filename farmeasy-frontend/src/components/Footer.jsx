import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import TranslateText from "./TranslateText";

const footerLinks = {
    导航: ["智能问答助手", "市场价格", "补贴与优惠政策", "作物教育"],
    资源: ["灌溉教育", "管理员支持", "帮助中心", "常见问题"],
};

const socialIcons = [
    {
        label: "Twitter",
        path: "M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0 0 22 5.92a8.19 8.19 0 0 1-2.357.646 4.118 4.118 0 0 0 1.804-2.27 8.224 8.224 0 0 1-2.605.996 4.107 4.107 0 0 0-6.993 3.743 11.65 11.65 0 0 1-8.457-4.287 4.106 4.106 0 0 0 1.27 5.477A4.072 4.072 0 0 1 2.8 9.713v.052a4.105 4.105 0 0 0 3.292 4.022 4.095 4.095 0 0 1-1.853.07 4.108 4.108 0 0 0 3.834 2.85A8.233 8.233 0 0 1 2 18.407a11.616 11.616 0 0 0 6.29 1.84",
    },
    {
        label: "Instagram",
        path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
    },
    {
        label: "LinkedIn",
        path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    },
];

export default function Footer() {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-40px" });

    return (
        <footer
            ref={ref}
            className="w-full px-4 pt-16 pb-8"
            style={{ background: "#14532d" }}
        >
            <div className="max-w-[1200px] mx-auto">
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-12"
                    initial={{ opacity: 0, y: 30 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                >
                    {/* Brand Column */}
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">
                            🌱 智农
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                            <TranslateText>智农 是一个 AI 驱动的农业助手，通过智能问答、实时行情数据和学习资源，帮助农户做出更明智的决策。</TranslateText>
                        </p>
                    </div>

                    {/* Link Columns */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                                <TranslateText>{title}</TranslateText>
                            </h4>
                            <ul className="space-y-2 list-none p-0 m-0">
                                {links.map((link) => (
                                    <li key={link}>
                                        <a
                                            href="#"
                                            className="text-sm transition-colors duration-200 no-underline"
                                            style={{ color: "rgba(255,255,255,0.55)" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = "#66bb6a")}
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.color = "rgba(255,255,255,0.55)")
                                            }
                                        >
                                            <TranslateText>{link}</TranslateText>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </motion.div>

                {/* Divider */}
                <div
                    className="mb-6"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}
                />

                {/* Bottom row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                        <TranslateText>© {new Date().getFullYear()} 智农。保留所有权利。</TranslateText>
                    </p>

                    {/* Social Icons */}
                    <div className="flex gap-3">
                        {socialIcons.map((icon) => (
                            <a
                                key={icon.label}
                                href="#"
                                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200"
                                style={{ background: "rgba(255,255,255,0.08)" }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.background = "rgba(102,187,106,0.3)")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
                                }
                                aria-label={icon.label}
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    style={{ color: "rgba(255,255,255,0.7)" }}
                                >
                                    <path d={icon.path} />
                                </svg>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
