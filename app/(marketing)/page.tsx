import { BackgroundAtmosphere } from '@/components/marketing/BackgroundAtmosphere';
import { MarketingNavbar } from '@/components/marketing/MarketingNavbar';
import { HeroSection } from '@/components/marketing/HeroSection';
import { FeatureSection } from '@/components/marketing/FeatureSection';
import { HowItWorksSection } from '@/components/marketing/HowItWorksSection';
import { PricingSection } from '@/components/marketing/PricingSection';
import { FAQAccordion } from '@/components/marketing/FAQAccordion';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export default function LandingPage() {
  return (
    <div
      className="marketing-page"
      style={{
        background: '#05070d',
        color: '#f1f5f9',
        fontFamily: 'var(--font-body)',
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      <BackgroundAtmosphere />
      <MarketingNavbar />
      <HeroSection />
      <FeatureSection />
      <HowItWorksSection />
      <PricingSection />
      <FAQAccordion />
      <MarketingFooter />
    </div>
  );
}
