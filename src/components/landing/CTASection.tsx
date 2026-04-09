import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Highlighter } from '../effects/Highlighter';

const CTASection: React.FC = () => {
    const navigate = useNavigate();

    return (
        <section className="py-24 bg-white border-t border-gray-200">
            <div className="px-6 mx-auto max-w-5xl text-center lg:px-8">
                <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 font-display sm:text-5xl">
                    Ready to{' '}
                    <Highlighter
                        action="circle"
                        color="#10b981"
                        strokeWidth={3}
                        padding={10}
                        animationDuration={1500}
                        delay={200}
                        isView={true}
                    >
                        Ship 10x Faster
                    </Highlighter>
                    ?
                </h2>
                <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600">
                    Built for startups. Automate PM work so devrels, team leads, and solo founders can{' '}
                    <span className="font-semibold text-gray-900">focus on building their MVP</span>.
                </p>

                <button
                    onClick={() => navigate('/transcriber')}
                    className="inline-flex gap-2 items-center px-8 py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg transition-colors hover:bg-indigo-700"
                >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </section>
    );
};

export default CTASection;

