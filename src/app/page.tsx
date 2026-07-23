import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/landing/Hero";
import TrustedBrands from "@/components/landing/TrustedBrands";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";

import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustedBrands />
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
