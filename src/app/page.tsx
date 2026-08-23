import { ClosingCta } from "@/components/homepage/ClosingCta";
import { HeroSection } from "@/components/homepage/HeroSection";
import { ProductFeatures } from "@/components/homepage/ProductFeatures";
import { SiteNavbar } from "@/components/homepage/SiteNavbar";

/**
 * หน้าแรก `/` — homepage landing
 * Flow: Home → Register / Login → Dashboard
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <SiteNavbar />
      <main className="flex-1">
        <HeroSection />
        <ProductFeatures />
        <ClosingCta />
      </main>
    </div>
  );
}
