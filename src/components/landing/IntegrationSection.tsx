import React from 'react';
import { Clock, Zap, Shield, Mic } from 'lucide-react';
import { SiZoom, SiSlack, SiNotion, SiJira, SiGooglemeet, SiLinear, SiTrello, SiClickup } from 'react-icons/si';
import { Highlighter } from '../effects/Highlighter';
import { OrbitingCircles } from '../effects/Orbit';

const IntegrationSection: React.FC = () => {
    return (
        <section className="py-24 bg-white border-b border-gray-200">
            <div className="px-6 mx-auto max-w-6xl lg:px-8">
                <div className="grid grid-cols-1 gap-16 items-center lg:grid-cols-2">
                    <div>
                        <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 font-display sm:text-5xl">
                            Too Many{' '}
                            <Highlighter
                                action="strike-through"
                                color="#ef4444"
                                strokeWidth={3}
                                padding={6}
                                animationDuration={1000}
                                delay={200}
                                isView={true}
                            >
                                Apps
                            </Highlighter>{' '}
                            Eating Your{' '}
                            <Highlighter
                                action="underline"
                                color="#6366f1"
                                strokeWidth={3}
                                padding={6}
                                animationDuration={1200}
                                delay={400}
                                isView={true}
                            >
                                Time
                            </Highlighter>
                            ?
                        </h2>
                        <p className="mb-8 text-lg leading-relaxed text-gray-600">
                            <Highlighter
                                action="highlight"
                                color="#fef3c7"
                                strokeWidth={2}
                                padding={3}
                                animationDuration={800}
                                delay={600}
                                isView={true}
                            >
                                Stop switching between Zoom, Slack, Notion, Jira, and endless note-taking apps.
                            </Highlighter>
                            Zeta connects them all. One meeting. One platform. Everything you need flows into your tools automatically.
                        </p>

                        <div className="space-y-4">
                            {[
                                { icon: Clock, text: "Stop context-switching between 10+ apps" },
                                { icon: Zap, text: "Automate ideation, planning, and analysis" },
                                { icon: Shield, text: "Focus on building your MVP, not paperwork" }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 items-center">
                                    <div className="flex flex-shrink-0 justify-center items-center w-10 h-10 bg-gray-100 rounded-lg">
                                        <item.icon className="w-5 h-5 text-gray-700" />
                                    </div>
                                    <span className="text-base text-gray-700">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative flex h-[550px] w-full items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50">
                        <div className="relative w-[480px] h-[480px] flex items-center justify-center">
                            {/* Center Zeta Icon - The Sun */}
                            <div className="flex absolute z-30 justify-center items-center w-14 h-14 bg-gray-900 rounded-xl shadow-lg">
                                <Mic className="w-7 h-7 text-white" />
                            </div>

                            {/* Outer Orbit - Video & Communication Tools (4 icons, 90° apart) */}
                            <OrbitingCircles className="absolute inset-0" iconSize={64} radius={190} duration={40} path={true} initialAngle={0}>
                                <div className="flex justify-center items-center w-16 h-16 bg-white rounded-xl border-2 border-gray-200 shadow-lg">
                                    <SiZoom className="w-9 h-9" style={{ color: '#2D8CFF' }} />
                                </div>
                                <div className="flex justify-center items-center w-16 h-16 bg-white rounded-xl border-2 border-gray-200 shadow-lg">
                                    <SiGooglemeet className="w-9 h-9" style={{ color: '#00897B' }} />
                                </div>
                                <div className="flex justify-center items-center w-16 h-16 bg-white rounded-xl border-2 border-gray-200 shadow-lg">
                                    <SiSlack className="w-9 h-9" style={{ color: '#4A154B' }} />
                                </div>
                                <div className="flex justify-center items-center w-16 h-16 bg-white rounded-xl border-2 border-gray-200 shadow-lg">
                                    <SiNotion className="w-9 h-9" style={{ color: '#000000' }} />
                                </div>
                            </OrbitingCircles>

                            {/* Inner Orbit - Project Management Tools (4 icons, 90° apart, offset 45° and reversed) */}
                            <OrbitingCircles className="absolute inset-0" iconSize={52} radius={130} reverse duration={25} path={true} initialAngle={45}>
                                <div className="flex justify-center items-center w-14 h-14 bg-white rounded-xl border-2 border-gray-200 shadow-lg">
                                    <SiJira className="w-8 h-8" style={{ color: '#0052CC' }} />
                                </div>
                                <div className="flex justify-center items-center w-14 h-14 bg-white rounded-xl border-2 border-gray-200 shadow-lg">
                                    <SiLinear className="w-8 h-8" style={{ color: '#5E6AD2' }} />
                                </div>
                                <div className="flex justify-center items-center w-14 h-14 bg-white rounded-xl border-2 border-gray-200 shadow-lg">
                                    <SiTrello className="w-8 h-8" style={{ color: '#0079BF' }} />
                                </div>
                                <div className="flex justify-center items-center w-14 h-14 bg-white rounded-xl border-2 border-gray-200 shadow-lg">
                                    <SiClickup className="w-8 h-8" style={{ color: '#7B68EE' }} />
                                </div>
                            </OrbitingCircles>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default IntegrationSection;

