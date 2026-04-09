import React from 'react';
import { ScrollVelocityContainer, ScrollVelocityRow } from '../effects/ScrollMarquee';

const ProductMarquee: React.FC = () => {
    const topRowProducts = [
        'Live Transcription',
        'Instant PRDs',
        'Sprint Planning',
        'AI Insights',
    ];

    const bottomRowProducts = [
        'Meeting Minutes',
        'Action Items',
        'User Stories',
        'Automated Analysis',
    ];

    return (
        <section className="py-16 bg-white border-y border-gray-200">
            <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
                <ScrollVelocityContainer className="text-3xl font-bold tracking-tight text-gray-900 md:text-5xl py-2">
                    <ScrollVelocityRow baseVelocity={5} direction={1}>
                        {topRowProducts.map((product, index) => (
                            <React.Fragment key={index}>
                                <span className="mx-12 text-gray-700">{product}</span>
                                <span className="text-gray-300">•</span>
                            </React.Fragment>
                        ))}
                    </ScrollVelocityRow>
                    <div className="h-[5px]"></div>
                    <ScrollVelocityRow baseVelocity={5} direction={-1}>
                        {bottomRowProducts.map((product, index) => (
                            <React.Fragment key={index}>
                                <span className="mx-12 text-gray-700">{product}</span>
                                <span className="text-gray-300">•</span>
                            </React.Fragment>
                        ))}
                    </ScrollVelocityRow>
                </ScrollVelocityContainer>
                <div className="from-white pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r"></div>
                <div className="from-white pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l"></div>
            </div>
        </section>
    );
};

export default ProductMarquee;

