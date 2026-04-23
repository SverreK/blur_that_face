// HomePage.tsx
import Header from "./Header";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import GetStarted from "./GetStarted";
import Footer from "./Footer";
import type { JobStatus } from "../types";

interface HomePageProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  status: JobStatus;
}

export default function HomePage({
  onFileSelected,
  isProcessing,
  status,
}: HomePageProps) {
  return (
    <>
      <Header />
      <Hero />
      <HowItWorks />
      <GetStarted
        onFileSelected={onFileSelected}
        isProcessing={isProcessing}
        status={status}
      />
      <Footer />
    </>
  );
}
