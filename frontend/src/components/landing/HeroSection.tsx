import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Highlighter } from '../effects/Highlighter';

const HeroSection: React.FC = () => {
    const navigate = useNavigate();

    return (
        <section className="overflow-hidden relative px-4 pt-16 pb-20 bg-gradient-to-b from-white via-gray-50/30 to-white sm:px-6 lg:px-8 md:pt-[2.375rem] lg:pt-[2.125rem]">
            {/* Subtle background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-transparent to-purple-50/20 pointer-events-none" />
            
            {/* Animated grid pattern */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px),
                                    linear-gradient(to bottom, #000 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }} />
            </div>
            <div className="mx-auto max-w-7xl">
                <div className="relative min-h-[500px] flex items-center justify-center">
                    {/* Enhanced SVG with improved animations */}
                    <svg
                        className="absolute inset-0 w-full h-full z-[1] pointer-events-none opacity-60"
                        viewBox="0 0 1280 500"
                        preserveAspectRatio="xMidYMid meet"
                        style={{ overflow: 'visible' }}
                    >
                        {/* Top bow - elegant upward curve connecting top avatars */}
                        <path
                            d="M 40 120 C 280 90, 520 55, 640 75 C 760 55, 1000 90, 1240 130"
                            fill="none"
                            stroke="rgba(156, 163, 175, 0.3)"
                            strokeWidth="1.5"
                            strokeDasharray="5,5"
                        />
                        <path
                            className="path-beam"
                            style={{ animationDelay: '0s' }}
                            d="M 40 120 C 280 90, 520 55, 640 75 C 760 55, 1000 90, 1240 130"
                            fill="none"
                            stroke="rgba(99, 102, 241, 0.6)"
                            strokeWidth="2"
                        />

                        {/* Bottom bow - elegant downward curve connecting bottom avatars */}
                        <path
                            d="M 50 380 C 280 410, 520 445, 640 425 C 760 445, 1000 410, 1230 370"
                            fill="none"
                            stroke="rgba(156, 163, 175, 0.3)"
                            strokeWidth="1.5"
                            strokeDasharray="5,5"
                        />
                        <path
                            className="path-beam-reverse"
                            style={{ animationDelay: '2.5s' }}
                            d="M 50 380 C 280 410, 520 445, 640 425 C 760 445, 1000 410, 1230 370"
                            fill="none"
                            stroke="rgba(99, 102, 241, 0.6)"
                            strokeWidth="2"
                        />

                        {/* Heart/knot center pattern - lines crossing in center creating knot */}
                        <path
                            d="M 40 120 C 380 160, 580 220, 640 250 C 700 220, 900 160, 1240 130"
                            fill="none"
                            stroke="rgba(156, 163, 175, 0.3)"
                            strokeWidth="1.5"
                            strokeDasharray="5,5"
                        />
                        <path
                            className="path-beam"
                            style={{ animationDelay: '5s' }}
                            d="M 40 120 C 380 160, 580 220, 640 250 C 700 220, 900 160, 1240 130"
                            fill="none"
                            stroke="rgba(99, 102, 241, 0.6)"
                            strokeWidth="2"
                        />

                        <path
                            d="M 60 250 C 380 210, 580 150, 640 120 C 700 150, 900 210, 1240 130"
                            fill="none"
                            stroke="rgba(156, 163, 175, 0.3)"
                            strokeWidth="1.5"
                            strokeDasharray="5,5"
                        />
                        <path
                            className="path-beam-reverse"
                            style={{ animationDelay: '7.5s' }}
                            d="M 60 250 C 380 210, 580 150, 640 120 C 700 150, 900 210, 1240 130"
                            fill="none"
                            stroke="rgba(99, 102, 241, 0.6)"
                            strokeWidth="2"
                        />

                        <path
                            d="M 60 250 C 380 290, 580 350, 640 380 C 700 350, 900 290, 1230 370"
                            fill="none"
                            stroke="rgba(156, 163, 175, 0.3)"
                            strokeWidth="1.5"
                            strokeDasharray="5,5"
                        />
                        <path
                            className="path-beam"
                            style={{ animationDelay: '10s' }}
                            d="M 60 250 C 380 290, 580 350, 640 380 C 700 350, 900 290, 1230 370"
                            fill="none"
                            stroke="rgba(99, 102, 241, 0.6)"
                            strokeWidth="2"
                        />

                        <path
                            d="M 50 380 C 380 340, 580 280, 640 250 C 700 280, 900 340, 1220 250"
                            fill="none"
                            stroke="rgba(156, 163, 175, 0.3)"
                            strokeWidth="1.5"
                            strokeDasharray="5,5"
                        />
                        <path
                            className="path-beam-reverse"
                            style={{ animationDelay: '12.5s' }}
                            d="M 50 380 C 380 340, 580 280, 640 250 C 700 280, 900 340, 1220 250"
                            fill="none"
                            stroke="rgba(99, 102, 241, 0.6)"
                            strokeWidth="2"
                        />

                        {/* Middle horizontal connection */}
                        <path
                            d="M 60 250 C 340 248, 940 252, 1220 250"
                            fill="none"
                            stroke="rgba(156, 163, 175, 0.3)"
                            strokeWidth="1.5"
                            strokeDasharray="5,5"
                        />
                        <path
                            className="path-beam"
                            style={{ animationDelay: '15s' }}
                            d="M 60 250 C 340 248, 940 252, 1220 250"
                            fill="none"
                            stroke="rgba(99, 102, 241, 0.6)"
                            strokeWidth="2"
                        />
                    </svg>

                    {/* Left avatars */}
                    <div className="flex absolute left-0 top-1/2 z-[2] flex-col gap-8 -translate-y-1/2">
                        <div className="overflow-hidden w-28 h-28 rounded-full ring-4 ring-white shadow-xl -rotate-6 sm:w-32 sm:h-32">
                            <img src="/assets/image_01.png" alt="Team member 1" className="object-cover object-center w-full h-full" />
                        </div>

                        <div className="overflow-hidden ml-8 w-20 h-20 rounded-full ring-4 ring-white shadow-xl rotate-3 sm:w-24 sm:h-24">
                            <img src="/assets/image_02.png" alt="Team member 2" className="object-cover object-center w-full h-full" />
                        </div>

                        <div className="overflow-hidden ml-4 w-24 h-24 rounded-full ring-4 ring-white shadow-xl sm:w-28 sm:h-28 -rotate-4">
                            <img src="/assets/image_03.png" alt="Team member 3" className="object-cover object-center w-full h-full" />
                        </div>
                    </div>

                    {/* Right avatars */}
                    <div className="flex absolute right-0 top-1/2 z-[2] flex-col gap-8 -translate-y-1/2">
                        <div className="overflow-hidden w-28 h-28 rounded-full ring-4 ring-white shadow-xl rotate-6 sm:w-32 sm:h-32">
                            <img src="/assets/image_04.png" alt="Team member 4" className="object-cover object-center w-full h-full" />
                        </div>

                        <div className="overflow-hidden mr-6 w-20 h-20 rounded-full ring-4 ring-white shadow-xl -rotate-3 sm:w-24 sm:h-24">
                            <img src="/assets/image_05.png" alt="Team member 5" className="object-cover object-center w-full h-full" />
                        </div>

                        <div className="overflow-hidden mr-10 w-24 h-24 rounded-full ring-4 ring-white shadow-xl sm:w-28 sm:h-28 rotate-4">
                            <img src="/assets/image_06.png" alt="Team member 6" className="object-cover object-center w-full h-full" />
                        </div>
                    </div>

                    {/* Content section */}
                    <div className="relative z-10 px-4 mx-auto max-w-4xl text-center">
                        <h1 className="mb-8 text-5xl font-bold tracking-tight leading-tight text-gray-900 font-display sm:text-6xl lg:text-7xl">
                            <span className="inline-block whitespace-nowrap">
                                Your{' '}
                                <Highlighter
                                    action="box"
                                    color="#6366f1"
                                    strokeWidth={2.7}
                                    animationDuration={3000}
                                >
                                    Personalised
                                </Highlighter>
                                {' '}PM Agent
                            </span>
                        </h1>

                        <p className="mx-auto mb-12 max-w-4xl text-lg font-medium leading-snug text-center text-gray-600 sm:text-xl">
                            <Highlighter
                                action="underline"
                                color="#6366f1"
                                strokeWidth={2.5}
                                padding={4}
                                animationDuration={800}
                                delay={300}
                                isView={true}
                            >
                                Automate ideation
                            </Highlighter>
                            ,{' '}
                            <Highlighter
                                action="underline"
                                color="#6366f1"
                                strokeWidth={2.5}
                                padding={4}
                                animationDuration={800}
                                delay={600}
                                isView={true}
                            >
                                plan sprints
                            </Highlighter>
                            , and{' '}
                            <Highlighter
                                action="circle"
                                color="#10b981"
                                strokeWidth={3}
                                padding={10}
                                animationDuration={1000}
                                delay={900}
                                isView={true}
                            >
                                build your MVP
                            </Highlighter>
                            {' '}instead of{' '}
                            <Highlighter
                                action="strike-through"
                                color="#ef4444"
                                strokeWidth={2.5}
                                padding={4}
                                animationDuration={600}
                                delay={1200}
                                isView={true}
                            >
                                paperwork
                            </Highlighter>
                            .
                        </p>

                        {/* Enhanced CTA buttons */}
                        <div className="flex flex-col gap-4 justify-center items-center mt-8 sm:flex-row sm:gap-6">
                            <button
                                onClick={() => navigate('/transcriber')}
                                className="group relative flex gap-2 items-center px-8 py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/30 hover:bg-indigo-700"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    Start Free Trial
                                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </span>
                            </button>

                            <button
                                onClick={() => {}}
                                className="group relative flex gap-2 items-center px-6 py-3 text-base font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 hover:bg-indigo-100"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    Watch 30-sec Demo
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
