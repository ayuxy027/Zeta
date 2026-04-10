import React from 'react';
import { RiSpeakAiLine } from 'react-icons/ri';
import { GrDocumentVerified } from 'react-icons/gr';
import { LiaRunningSolid } from 'react-icons/lia';
import { TbArrowsRightLeft } from 'react-icons/tb';
import { Highlighter } from '../effects/Highlighter';

const FeaturesSection: React.FC = () => {
    const features = [
        {
            icon: RiSpeakAiLine,
            title: '12 agents',
            desc: 'Every integration is its own agent. Toggle tools on or off—nothing buried in settings.',
            delay: 100
        },
        {
            icon: GrDocumentVerified,
            title: 'Marketplace',
            desc: 'One roster from Gmail to Teams. Enable only what your team actually uses.',
            delay: 200
        },
        {
            icon: LiaRunningSolid,
            title: 'Core stack',
            desc: 'Start with mail, Drive, Slack, and Meet. Add Notion, GitHub, Jira, and the rest when you need them.',
            delay: 300
        },
        {
            icon: TbArrowsRightLeft,
            title: 'A2A',
            desc: 'For trickier asks, one agent pulls from a tool; a partner agent turns that into a clear reply.',
            delay: 400
        },
    ];

    return (
        <section className="overflow-hidden relative py-16 bg-white">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 opacity-50"></div>

            <div className="relative px-6 mx-auto max-w-6xl lg:px-8">
                <div className="mb-20 text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 font-display sm:text-5xl lg:text-6xl">
                        <Highlighter
                            action="highlight"
                            color="#fef3c7"
                            strokeWidth={2}
                            padding={4}
                            animationDuration={1500}
                            delay={200}
                            isView={true}
                        >
                            AI agents
                        </Highlighter>{' '}
                        as plugins
                    </h2>
                    <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">
                        Twelve agents, one roster. Turn on Gmail to Teams. A2A when a query needs two steps.
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

