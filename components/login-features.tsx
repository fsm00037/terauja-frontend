"use client"

import { useState, useEffect } from "react"

const features = [
    {
        id: 1,
        title: "Seguimiento de Pacientes",
        description: "Monitoriza el progreso de tus pacientes de manera continua y visual a través de gráficos interactivos.",
        Graphic: () => (
            <div className="relative w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-[80%] h-[80%] drop-shadow-lg">
                    <defs>
                        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#14B8A6" />
                            <stop offset="100%" stopColor="#3B82F6" />
                        </linearGradient>
                        <filter id="glow1" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    <path d="M 20 180 L 180 180 M 20 180 L 20 20" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />

                    {/* Animated Graph Line */}
                    <path
                        d="M 20 160 L 70 110 L 120 130 L 180 50"
                        stroke="url(#gradient1)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        filter="url(#glow1)"
                        strokeDasharray="100"
                        strokeDashoffset="100"
                        pathLength="100"
                        style={{ animation: "drawPath 2s linear forwards" }}
                    />

                    {/* Dots */}
                    {[
                        { cx: 20, cy: 160, delay: "0s" },
                        { cx: 70, cy: 110, delay: "0.5s" },
                        { cx: 120, cy: 130, delay: "1.0s" },
                        { cx: 180, cy: 50, delay: "1.9s" }
                    ].map((dot, index) => (
                        <circle
                            key={index}
                            cx={dot.cx}
                            cy={dot.cy}
                            r="6"
                            fill="#FFFFFF"
                            stroke="#14B8A6"
                            strokeWidth="3"
                            style={{
                                opacity: 0,
                                animation: `fadeIn 0.3s ease-out ${dot.delay} forwards`
                            }}
                        />
                    ))}
                </svg>
            </div>
        )
    },
    {
        id: 2,
        title: "EMAs Programables",
        description: "Crea y programa evaluaciones momentáneas ecológicas personalizadas según las necesidades del paciente.",
        Graphic: () => (
            <div className="relative w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-[80%] h-[80%] drop-shadow-lg">
                    {/* Phone Body */}
                    <rect x="65" y="10" width="70" height="140" rx="12" fill="#FFFFFF" stroke="#64748B" strokeWidth="3" />
                    <rect x="70" y="15" width="60" height="130" rx="8" fill="#F8FAFC" />
                    <line x1="90" y1="20" x2="110" y2="20" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />

                    {/* Incoming Notification */}
                    <rect
                        x="75" y="40" width="50" height="25" rx="6" fill="#818CF8"
                        style={{ animation: "slideDown 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
                        opacity="0"
                    />
                    <rect x="80" y="48" width="40" height="4" rx="2" fill="#FFFFFF" opacity="0.8" style={{ animation: "fadeIn 0.3s ease-out 0.8s forwards", opacity: 0 }} />
                    <rect x="80" y="55" width="20" height="4" rx="2" fill="#FFFFFF" opacity="0.5" style={{ animation: "fadeIn 0.3s ease-out 0.9s forwards", opacity: 0 }} />

                    {/* Clock overlapping */}
                    <g style={{ animation: "popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s forwards", transformOrigin: "140px 140px", opacity: 0, transform: "scale(0)" }}>
                        <circle cx="140" cy="140" r="35" fill="white" stroke="#6366F1" strokeWidth="4" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))" />
                        <circle cx="140" cy="140" r="4" fill="#6366F1" />
                        <path d="M 140 140 L 140 115" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" style={{ transformOrigin: "140px 140px", animation: "spin 3s linear infinite" }} />
                        <path d="M 140 140 L 155 140" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" style={{ transformOrigin: "140px 140px", animation: "spin 12s linear infinite" }} />
                    </g>
                </svg>
            </div>
        )
    },
    {
        id: 3,
        title: "Recomendaciones de IA",
        description: "Obtén sugerencias inteligentes y análisis de sentimiento automáticos en el chat con tus pacientes.",
        Graphic: () => (
            <div className="relative w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-[80%] h-[80%] drop-shadow-lg">
                    <defs>
                        <linearGradient id="magic" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FDE047" />
                            <stop offset="100%" stopColor="#F59E0B" />
                        </linearGradient>
                        <filter id="glow2" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Chat Bubbles */}
                    <path d="M 30 70 C 30 60, 40 50, 50 50 L 110 50 C 120 50, 130 60, 130 70 L 130 90 C 130 100, 120 110, 110 110 L 50 110 C 40 110, 30 100, 30 90 Z M 30 110 L 20 130 L 50 110" fill="#E2E8F0"
                        style={{ animation: "bubbleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards", transformOrigin: "30px 110px" }} />
                    <rect x="45" y="65" width="70" height="6" rx="3" fill="#94A3B8" style={{ animation: "fadeIn 0.3s ease-out 0.4s forwards", opacity: 0 }} />
                    <rect x="45" y="80" width="40" height="6" rx="3" fill="#94A3B8" style={{ animation: "fadeIn 0.3s ease-out 0.5s forwards", opacity: 0 }} />

                    <path d="M 70 140 C 70 130, 80 120, 90 120 L 150 120 C 160 120, 170 130, 170 140 L 170 160 C 170 170, 160 180, 150 180 L 90 180 C 80 180, 70 170, 70 160 Z M 170 180 L 180 200 L 150 180" fill="#14B8A6"
                        style={{ animation: "bubbleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s forwards", transformOrigin: "170px 180px", opacity: 0 }} />
                    <rect x="85" y="135" width="70" height="6" rx="3" fill="#FFFFFF" opacity="0.9" style={{ animation: "fadeIn 0.3s ease-out 1.2s forwards", opacity: 0 }} />
                    <rect x="85" y="150" width="50" height="6" rx="3" fill="#FFFFFF" opacity="0.9" style={{ animation: "fadeIn 0.3s ease-out 1.3s forwards", opacity: 0 }} />

                    {/* AI Sparkles */}
                    <g style={{ animation: "sparkleTwinkle 2s ease-in-out infinite 1.5s forwards", opacity: 0 }} filter="url(#glow2)">
                        <path d="M 160 55 L 165 40 L 180 35 L 165 30 L 160 15 L 155 30 L 140 35 L 155 40 Z" fill="url(#magic)" />
                        <path d="M 185 65 L 188 55 L 198 52 L 188 49 L 185 39 L 182 49 L 172 52 L 182 55 Z" fill="url(#magic)" transform="scale(0.7) translate(70, 20)" style={{ animationDelay: '0.5s' }} />
                    </g>
                </svg>
            </div>
        )
    }
]

export function LoginFeatures() {
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % features.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="hidden lg:flex flex-col w-1/2 bg-white/10 backdrop-blur-sm rounded-3xl p-12 overflow-hidden relative shadow-2xl border border-white/20 mr-12 h-[600px] justify-center text-white">
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes drawPath {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          to { opacity: 1; }
        }
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0px #14B8A6); }
          50% { transform: scale(1.2); filter: drop-shadow(0 0 8px #14B8A6); }
        }
        @keyframes slideDown {
          0% { transform: translateY(-40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bubbleIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sparkleTwinkle {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}} />

            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-calm-teal/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-soft-lavender/30 rounded-full blur-3xl pointer-events-none" />



            <div className="flex-1 relative w-full flex flex-col items-center justify-center">
                {features.map((feature, index) => {
                    // If framer-motion is not installed, we can fall back to standard transitions,
                    // but I saw framer-motion might not actually be installed! Oh wait, let's check package.json again.
                    // Wait, 'framer-motion' is NOT in package.json.
                    // I need to correct this. I will use a simple CSS toggle instead of framer-motion.
                    return (
                        <div
                            key={feature.id}
                            className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${index === currentIndex ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 z-0"
                                }`}
                            style={{ pointerEvents: index === currentIndex ? 'auto' : 'none' }}
                        >
                            <div className="w-full h-48 sm:h-64 md:h-72 mb-8">
                                {index === currentIndex && <feature.Graphic />}
                            </div>
                            <div className="text-center px-6 mt-auto">
                                <h3 className="text-2xl font-semibold mb-3 text-neutral-charcoal">
                                    {feature.title}
                                </h3>
                                <p className="text-neutral-charcoal/70 text-base max-w-sm mx-auto">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="flex justify-center gap-3 mt-12 z-10">
                {features.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex ? "w-8 bg-calm-teal" : "w-2 bg-calm-teal/30 hover:bg-calm-teal/50"
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div >
    )
}
