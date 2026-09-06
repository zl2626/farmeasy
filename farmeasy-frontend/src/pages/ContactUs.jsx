import React, { useState } from 'react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import TranslateText from '../components/TranslateText';

const FeedbackForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState({ type: null, message: null }); // 'success' | 'error' | null
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: null, message: null });

        try {
            const data = await api.post('/education/feedback/create/', formData);

            if (data) {
                setStatus({
                    type: 'success',
                    message: '感谢您的反馈！我们会尽快与您联系。'
                });
                setFormData({ name: '', email: '', subject: '', message: '' });
            }
        } catch {
            setStatus({
                type: 'error',
                message: '网络错误，请稍后再试。'
            });
        } finally {
            setIsSubmitting(false);
            // Clear message after 5 seconds
            setTimeout(() => {
                setStatus({ type: null, message: null });
            }, 5000);
        }
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 100 }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-16 pb-20 px-4 sm:px-6 lg:px-8">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-7xl mx-auto text-center mb-16"
            >
                <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl font-poppins">
                    <TranslateText>意见反馈</TranslateText>
                </h1>
                <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
                    <TranslateText>您的意见对我们很重要。请告诉我们如何改进 智农。</TranslateText>
                </p>
            </motion.div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Contact Information (Left side) */}
                <motion.div
                    className="lg:col-span-5 space-y-8"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex items-start space-x-6 hover:shadow-md transition-shadow duration-300">
                        <div className="flex-shrink-0 bg-green-100 p-3 rounded-xl border border-green-200">
                            <Mail className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1"><TranslateText>邮件联系</TranslateText></h3>
                            <p className="text-gray-500 text-sm mb-2"><TranslateText>我们通常会在 24 小时内回复。</TranslateText></p>
                            <a href="mailto:3158646717@qq.com" className="text-green-600 font-medium hover:text-green-700 transition-colors">3158646717@qq.com</a>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Contact Form (Right side) */}
                <motion.div
                    className="lg:col-span-7"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 sm:p-10 relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-gradient-to-br from-green-100 to-green-50 opacity-50 blur-2xl pointer-events-none"></div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-6 font-poppins relative z-10">
                            <TranslateText>发送反馈</TranslateText>
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium text-gray-700 block">
                                        <TranslateText>姓名</TranslateText>
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                                        placeholder="张农户"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-gray-700 block">
                                        <TranslateText>邮箱地址</TranslateText>
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                                        placeholder="zhang@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="subject" className="text-sm font-medium text-gray-700 block">
                                    <TranslateText>主题</TranslateText>
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                                    placeholder="我们需要如何帮助您？"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium text-gray-700 block">
                                    <TranslateText>留言内容</TranslateText>
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows="4"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all resize-none"
                                    placeholder="请详细描述您想咨询的内容…"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-green-500/30 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed group"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center space-x-2">
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <TranslateText>发送中…</TranslateText>
                                    </span>
                                ) : (
                                    <span className="flex items-center space-x-2">
                                        <span><TranslateText>提交反馈</TranslateText></span>
                                        <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {status.type && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={`p-4 rounded-xl flex items-start space-x-3 ${status.type === 'success'
                                            ? 'bg-green-50 border border-green-100 text-green-700'
                                            : 'bg-red-50 border border-red-100 text-red-700'
                                            }`}
                                    >
                                        {status.type === 'success' ? (
                                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        )}
                                        <span className="text-sm font-medium">{status.message}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default FeedbackForm;
