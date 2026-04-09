import React from 'react';
import TranscriptionBlock from '../components/landing/TranscriptionBlock';
import TranscriptionBlockMobile from '../components/mobile/TranscriptionBlockMobile';
import HeroSection from '../components/landing/HeroSection';
import ProductMarquee from '../components/landing/ProductMarquee';
import IntegrationSection from '../components/landing/IntegrationSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import CTASection from '../components/landing/CTASection';
import Footer from '../components/landing/Footer';

const LandingPage: React.FC = () => {
    return (
        <>
            <HeroSection />

            <div className="hidden sm:block">
                <TranscriptionBlock />
            </div>
            <div className="sm:hidden">
                <TranscriptionBlockMobile />
            </div>

            <ProductMarquee />

            <IntegrationSection />

            <FeaturesSection />

            <CTASection />

            <Footer />
        </>
    );
};

export default LandingPage;
