import Hero from './HomePageHero';
import HowItWorks from './HomePageHowItWorks';
import GetStarted from './HomePageGetStarted';
import Footer from './Footer';
import type { JobStatus } from '../types';

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
