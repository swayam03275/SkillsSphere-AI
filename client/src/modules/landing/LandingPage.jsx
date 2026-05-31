import Navbar from "../../modules/landing/components/Navbar.jsx";
import CTA from "./components/CTA";
import Features from "./components/Features";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import TargetUsers from "./components/TargetUsers";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const LandingPage = () => {
  useDocumentTitle("Home");
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <Features />
      <TargetUsers />
      <CTA />
      <Footer />
    </div>
  );
};

export default LandingPage;
