import React from 'react';
import { RiSpeakAiLine } from 'react-icons/ri';
import { GrDocumentVerified } from 'react-icons/gr';
import { LiaRunningSolid } from 'react-icons/lia';
import { TbRobot } from 'react-icons/tb';
import { Highlighter } from '../effects/Highlighter';

const FeaturesSection: React.FC = () => {
    const features = [
        {
            icon: RiSpeakAiLine,
            title: 'Live Transcription',
            desc: 'Real-time speech-to-text with speaker identification',
            delay: 100
        },
        {
            icon: GrDocumentVerified,
            title: 'Instant PRDs',
            desc: 'Meeting → structured Product Requirement Documents',
            delay: 200
        },
        {
            icon: LiaRunningSolid,
            title: 'Sprint Planning',
            desc: 'AI creates outcome-aligned sprint plans from backlog',
            delay: 300
        },
        {
            icon: TbRobot,
            title: 'MCP Support',
            desc: 'Coming soon',
            delay: 400
        }
    ];

    return (
        <section className="overflow-hidden relative py-16 bg-white">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 opacity-50"></div>

            <div className="relative px-6 mx-auto max-w-6xl lg:px-8">
                <div className="mb-20 text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 font-display sm:text-5xl lg:text-6xl">
                        Leverage{' '}
                        <Highlighter
                            action="highlight"
                            color="#fef3c7"
                            strokeWidth={2}
                            padding={4}
                            animationDuration={1500}
                            delay={200}
                            isView={true}
                        >
                            Agentic AI
                        </Highlighter>{' '}
                        Like Never Before
                    </h2>
                    <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600">
                        Not another AI wrapper.{' '}
                        <span className="font-semibold text-gray-900">Built for startups, devrels, team leads, and solo founders.</span>
                    </p>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
                        Automate ideation, planning, and analysis—so you can focus on{' '}
                        <span className="font-semibold text-gray-700">building your MVP.</span>
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="relative p-8 bg-white rounded-2xl border backdrop-blur-sm border-gray-200/60"
                        >
                            <div className="flex relative justify-center items-center mb-6 w-14 h-14 bg-gray-100 rounded-xl">
                                <feature.icon className="w-7 h-7 text-gray-700" />
                            </div>

                            <h3 className="relative mb-3 text-lg font-bold text-gray-900">
                                {feature.title}
                            </h3>
                            <p className="relative text-sm leading-relaxed text-gray-600">
                                {feature.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;

