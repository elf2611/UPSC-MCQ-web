'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { 
  ChevronDown, 
  BookOpen, 
  Brain, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Target, 
  CheckCircle2, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';

// --- CUSTOM HOOKS ---

function useScrollReveal(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => {
      if (ref.current) observer.unobserve(ref.current); // eslint-disable-line react-hooks/exhaustive-deps
    };
  }, [threshold]);

  return { ref, isVisible };
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const start = rect.top - (viewportHeight / 1.5);
      const height = rect.height;
      
      let p = (0 - start) / height;
      p = Math.max(0, Math.min(1, p));
      setProgress(p);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { ref, progress };
}

// --- COMPONENTS ---

function CountUp({ end, suffix = "", duration = 2000 }: { end: number, suffix?: string, duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useScrollReveal(0.5);

  useEffect(() => {
    if (!isVisible) return;
    
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      const easeProgress = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      setCount(Math.floor(end * easeProgress));

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isVisible]);

  return <span ref={ref}>{count}{suffix}</span>;
}

function FAQItem({ question, answer, delay }: { question: string, answer: string, delay: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <div 
      ref={ref}
      className={`bg-card shadow-surface shadow-surface rounded-xl overflow-hidden hover:border-white/10 transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-6 text-left focus:outline-none group"
      >
        <span className="font-bold font-display text-foreground text-lg group-hover:text-primary transition-colors">{question}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-primary/10 transition-colors`}>
          <ChevronDown className={`w-5 h-5 text-muted-foreground group-hover:text-primary transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <div 
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="p-6 pt-0 text-muted-foreground leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

function HeroTestSimulation() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const sequence = [
      { step: 1, delay: 600 },
      { step: 2, delay: 1200 },
      { step: 3, delay: 1500 },
      { step: 4, delay: 1800 },
      { step: 5, delay: 2100 },
      { step: 6, delay: 3500 }, 
      { step: 0, delay: 6000 }  
    ];

    let timeouts: NodeJS.Timeout[] = [];
    
    const runSequence = () => {
      setStep(0);
      timeouts.forEach(clearTimeout);
      timeouts = sequence.map(s => 
        setTimeout(() => setStep(s.step), s.delay)
      );
    };

    runSequence();
    const interval = setInterval(runSequence, 6500);

    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const options = [
    "Article 14",
    "Article 19",
    "Article 21",
    "Article 32"
  ];

  return (
    <div className="relative w-full max-w-md mx-auto p-6 bg-card shadow-surface/80 backdrop-blur-xl shadow-surface rounded-2xl shadow-2xl overflow-hidden group hover:border-white/10 transition-colors duration-500">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-red-500/80 animate-pulse" />
          <span className="text-xs font-bold font-display text-muted-foreground uppercase tracking-wider">Live Preview</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground/70 flex items-center"><Clock className="w-3 h-3 mr-1" /> 00:45</span>
      </div>

      <div className={`min-h-[60px] transition-all duration-500 ease-out ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <p className="font-bold font-display text-foreground leading-relaxed text-lg tracking-tight">
          Which of the following Fundamental Rights protects a citizen&apos;s right to life and personal liberty?
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {options.map((opt, idx) => (
          <div 
            key={idx}
            className={`
              p-4 rounded-xl border flex items-center transition-all duration-300 ease-out
              ${step >= idx + 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
              ${step === 6 && idx === 2 ? 'bg-primary/10 border-primary/40 text-primary scale-[1.02]' : 'bg-background border-white/5 text-muted-foreground'}
            `}
          >
            <div className={`w-7 h-7 rounded-full border flex items-center justify-center mr-4 text-xs font-bold font-display transition-colors
              ${step === 6 && idx === 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-white/20 text-muted-foreground/70 bg-white/5'}
            `}>
              {String.fromCharCode(65 + idx)}
            </div>
            <span className="font-medium">{opt}</span>
            
            {step === 6 && idx === 2 && (
              <CheckCircle2 className="w-5 h-5 ml-auto text-primary animate-[scaleIn_0.3s_ease-out]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, amberStyle = false, delay = 0, isVisible = false }: { icon: React.ReactNode, title: string, description: string, amberStyle?: boolean, delay?: number, isVisible?: boolean }) {
  return (
    <div 
      className={`
        p-8 rounded-2xl transition-all duration-700 ease-out group relative overflow-hidden
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}
        ${amberStyle 
          ? 'bg-card shadow-surface border border-primary/20 hover:border-primary/50 shadow-[0_0_20px_rgba(255,191,0,0.03)] hover:shadow-[0_0_30px_rgba(255,191,0,0.1)] hover:-translate-y-1 z-10' 
          : 'bg-card shadow-surface shadow-surface hover:border-white/10 hover:bg-white/[0.02] hover:-translate-y-1'}
      `}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {amberStyle && (
        <span className="absolute top-5 right-5 bg-primary/10 text-primary text-[10px] font-bold font-display px-3 py-1 rounded-full uppercase tracking-wider">
          Only on Prepwise
        </span>
      )}
      
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-700
        ${isVisible ? 'scale-100 rotate-0' : 'scale-0 -rotate-45'}
        ${amberStyle ? 'bg-primary/10 text-primary group-hover:shadow-[0_0_15px_rgba(255,191,0,0.4)]' : 'bg-[#222] text-muted-foreground group-hover:text-foreground'}
      `} style={{ transitionDelay: `${delay + 200}ms` }}>
        {icon}
      </div>
      
      <h3 className="text-xl font-bold font-display text-foreground mb-3 tracking-tight">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// --- MAIN PAGE ---

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  
  const { ref: featuresRef, isVisible: featuresVisible } = useScrollReveal(0.1);
  const { ref: stepsRef, progress: stepsProgress } = useScrollProgress();
  const { ref: pricingRef, isVisible: pricingVisible } = useScrollReveal(0.2);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-foreground overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10">
        
        {/* 1. HERO SECTION */}
        <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center min-h-[90vh]">
          <div className="flex-1 text-center lg:text-left z-10">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-display tracking-tight text-foreground text-balance mb-6 leading-[1.1]">
               <div className={`transition-all duration-700 ease-out delay-100 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>Master UPSC Prelims</div>
               <div className={`transition-all duration-700 ease-out delay-200 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>with <span className="text-primary">PYQ-Based</span></div>
               <div className={`transition-all duration-700 ease-out delay-300 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>Mock Tests</div>
            </h1>
            <p className={`text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto lg:mx-0 transition-all duration-700 ease-out delay-400 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Stop wasting time on irrelevant questions. Practice what matters with our curated database of UPSC Previous Year Questions and high-probability mocks.
            </p>
            
            <div className={`flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 transition-all duration-700 ease-out delay-500 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Link 
                href="/signup" 
                className="group relative px-8 py-4 bg-primary text-primary-foreground font-bold font-display rounded-xl shadow-[0_0_20px_rgba(255,191,0,0.2)] hover:shadow-[0_0_30px_rgba(255,191,0,0.4)] transition-all duration-300 hover:scale-[0.98] active:scale-95 ease-snappy ease-snappy flex items-center w-full sm:w-auto justify-center"
              >
                Start Free Test
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="#how-it-works" 
                className="px-8 py-4 bg-transparent text-foreground shadow-surface font-medium rounded-xl hover:shadow-surface-hover transition-all duration-300 w-full sm:w-auto text-center"
              >
                How it works
              </Link>
            </div>

            {/* Stats */}
            <div className={`mt-16 grid grid-cols-3 gap-6 pt-10 border-t border-white/5 transition-all duration-700 ease-out delay-700 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div>
                <div className="text-3xl font-bold font-display text-foreground mb-1"><CountUp end={885} suffix="+" /></div>
                <div className="text-xs font-bold font-display text-muted-foreground/70 uppercase tracking-widest">PYQ MCQs</div>
              </div>
              <div>
                <div className="text-3xl font-bold font-display text-foreground mb-1"><CountUp end={50} suffix="+" /></div>
                <div className="text-xs font-bold font-display text-muted-foreground/70 uppercase tracking-widest">Mock Tests</div>
              </div>
              <div>
                <div className="text-3xl font-bold font-display text-foreground mb-1"><CountUp end={5000} suffix="+" /></div>
                <div className="text-xs font-bold font-display text-muted-foreground/70 uppercase tracking-widest">Active Students</div>
              </div>
            </div>
          </div>
          
          <div className={`flex-1 w-full mt-16 lg:mt-0 lg:ml-12 transition-all duration-1000 ease-out delay-500 ${isMounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            <HeroTestSimulation />
          </div>
        </section>

        {/* 2. FEATURES SECTION */}
        <section className="py-32 bg-card/50 shadow-surface border-y border-white/5" ref={featuresRef}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`text-center max-w-3xl mx-auto mb-20 transition-all duration-700 ease-out ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance mb-6">Everything You Need to Crack Prelims</h2>
              <p className="text-lg text-muted-foreground">Our platform is designed specifically for UPSC aspirants, focusing on active recall and pattern recognition.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                isVisible={featuresVisible} delay={100} amberStyle
                icon={<BookOpen className="w-6 h-6" />}
                title="Strictly PYQ-Based"
                description="We don't waste your time with random trivia. Every question is mapped to previous year UPSC trends and difficulty levels."
              />
              <FeatureCard 
                isVisible={featuresVisible} delay={200} amberStyle
                icon={<Brain className="w-6 h-6" />}
                title="AI Analytics Engine"
                description="Our system identifies your weak subjects and specific topics, generating custom tests to target those exact vulnerabilities."
              />
              <FeatureCard 
                isVisible={featuresVisible} delay={300} amberStyle
                icon={<Target className="w-6 h-6" />}
                title="Strict Syllabus Adherence"
                description="Questions strictly bounded by the UPSC syllabus. If it's out of syllabus, it's out of our question bank."
              />
              <FeatureCard 
                isVisible={featuresVisible} delay={400}
                icon={<Clock className="w-6 h-6" />}
                title="Real Exam Interface"
                description="Practice in an environment that simulates the actual UPSC online test interface to build muscle memory."
              />
              <FeatureCard 
                isVisible={featuresVisible} delay={500}
                icon={<ShieldCheck className="w-6 h-6" />}
                title="Error-Free Explanations"
                description="Detailed, verified explanations for every option, backed by standard UPSC reference books."
              />
              <FeatureCard 
                isVisible={featuresVisible} delay={600}
                icon={<Zap className="w-6 h-6" />}
                title="Spaced Repetition"
                description="Algorithmically scheduled revisions ensure you never forget what you've learned."
              />
            </div>
          </div>
        </section>

        {/* 3. HOW IT WORKS */}
        <section id="how-it-works" className="py-32" ref={stepsRef}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance">How It Works</h2>
            </div>

            {/* Scroll Line Indicator */}
            <div className="absolute left-8 md:left-1/2 top-[200px] bottom-10 w-px bg-white/5 md:-translate-x-1/2" />
            <div 
              className="absolute left-8 md:left-1/2 top-[200px] w-[2px] bg-primary md:-translate-x-1/2 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(255,191,0,0.5)] z-0 rounded-full"
              style={{ height: `${stepsProgress * 100}%` }}
            />

            <div className="space-y-24 relative z-10">
              {/* Step 1 */}
              <div className={`flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-16 transition-all duration-700 ease-out ${stepsProgress > 0.05 ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-8'}`}>
                <div className="md:w-1/2 flex justify-start md:justify-end order-2 md:order-1 pl-16 md:pl-0">
                  <div className="bg-card shadow-surface p-8 rounded-2xl shadow-surface max-w-sm w-full shadow-xl">
                    <h3 className="text-xl font-bold font-display text-foreground mb-2">1. Take a Diagnostic</h3>
                    <p className="text-muted-foreground">Start with a full-length PYQ test. Our engine maps your baseline across 40+ micro-topics.</p>
                  </div>
                </div>
                <div className="absolute left-4 md:left-1/2 w-8 h-8 md:-translate-x-1/2 bg-background border-4 border-[#1a1a1a] rounded-full flex items-center justify-center z-10 transition-colors duration-500 overflow-hidden">
                  <div className={`w-full h-full bg-primary transition-all duration-500 ${stepsProgress > 0.05 ? 'scale-100' : 'scale-0'}`} />
                </div>
                <div className="md:w-1/2 order-3 pl-16 md:pl-0" />
              </div>

              {/* Step 2 */}
              <div className={`flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-16 transition-all duration-700 ease-out ${stepsProgress > 0.4 ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-8'}`}>
                <div className="md:w-1/2 order-2 md:order-1 pl-16 md:pl-0" />
                <div className="absolute left-4 md:left-1/2 w-8 h-8 md:-translate-x-1/2 bg-background border-4 border-[#1a1a1a] rounded-full flex items-center justify-center z-10 transition-colors duration-500 overflow-hidden">
                  <div className={`w-full h-full bg-primary transition-all duration-500 ${stepsProgress > 0.4 ? 'scale-100' : 'scale-0'}`} />
                </div>
                <div className="md:w-1/2 flex justify-start order-3 pl-16 md:pl-0">
                  <div className="bg-card shadow-surface p-8 rounded-2xl shadow-surface max-w-sm w-full shadow-xl">
                    <h3 className="text-xl font-bold font-display text-foreground mb-2">2. Review Analytics</h3>
                    <p className="text-muted-foreground">See exactly where you lose marks. History? Geography? We show you the data.</p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-16 transition-all duration-700 ease-out ${stepsProgress > 0.75 ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-8'}`}>
                <div className="md:w-1/2 flex justify-start md:justify-end order-2 md:order-1 pl-16 md:pl-0">
                  <div className="bg-card shadow-surface p-8 rounded-2xl shadow-surface max-w-sm w-full shadow-xl">
                    <h3 className="text-xl font-bold font-display text-foreground mb-2">3. Targeted Practice</h3>
                    <p className="text-muted-foreground">Practice custom test sets generated specifically to fix your weak areas before the real exam.</p>
                  </div>
                </div>
                <div className="absolute left-4 md:left-1/2 w-8 h-8 md:-translate-x-1/2 bg-background border-4 border-[#1a1a1a] rounded-full flex items-center justify-center z-10 transition-colors duration-500 overflow-hidden">
                  <div className={`w-full h-full bg-primary transition-all duration-500 ${stepsProgress > 0.75 ? 'scale-100' : 'scale-0'}`} />
                </div>
                <div className="md:w-1/2 order-3 pl-16 md:pl-0" />
              </div>
            </div>

          </div>
        </section>

        {/* 4. PRICING SECTION */}
        <section className="py-32 bg-card/50 shadow-surface border-y border-white/5" ref={pricingRef}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`text-center mb-20 transition-all duration-700 ease-out ${pricingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance mb-6">Simple, Transparent Pricing</h2>
              <p className="text-lg text-muted-foreground">Start for free, upgrade when you need full access.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
              {/* Free Tier */}
              <div className={`bg-background shadow-surface rounded-2xl p-8 md:p-10 transition-all duration-700 ease-out delay-100 ${pricingVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                <h3 className="text-2xl font-bold font-display text-foreground mb-2">Free</h3>
                <p className="text-muted-foreground mb-8 h-12">Perfect for getting a feel of our platform.</p>
                <div className="text-5xl font-bold font-display text-foreground mb-8">₹0 <span className="text-lg text-muted-foreground/70 font-normal">/forever</span></div>
                <ul className="space-y-5 mb-10">
                  <li className="flex items-center text-muted-foreground"><CheckCircle2 className="w-5 h-5 text-muted-foreground/70 mr-3 flex-shrink-0" /> 1 Full-Length Mock Test</li>
                  <li className="flex items-center text-muted-foreground"><CheckCircle2 className="w-5 h-5 text-muted-foreground/70 mr-3 flex-shrink-0" /> 100 PYQ MCQs</li>
                  <li className="flex items-center text-muted-foreground"><CheckCircle2 className="w-5 h-5 text-muted-foreground/70 mr-3 flex-shrink-0" /> Basic Analytics</li>
                </ul>
                <Link href="/signup" className="block text-center w-full py-4 rounded-xl shadow-surface text-foreground font-bold font-display hover:shadow-surface-hover transition-colors">
                  Get Started
                </Link>
              </div>

              {/* Premium Tier */}
              <div className={`bg-card shadow-surface shadow-surface-glow rounded-2xl p-8 md:p-12 relative shadow-[0_0_40px_rgba(255,191,0,0.05)] md:scale-105 z-10 transition-all duration-700 ease-out delay-300 ${pricingVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold font-display px-4 py-1.5 rounded-full uppercase tracking-wider animate-pulse shadow-[0_0_15px_rgba(255,191,0,0.5)]">
                  POPULAR
                </div>
                <h3 className="text-2xl font-bold font-display text-foreground mb-2">Premium</h3>
                <p className="text-muted-foreground mb-8 h-12">Everything you need to crack Prelims.</p>
                <div className="text-5xl font-bold font-display text-foreground mb-8">₹999 <span className="text-lg text-muted-foreground/70 font-normal">/year</span></div>
                <ul className="space-y-5 mb-10">
                  <li className="flex items-center text-foreground"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> 10,000+ Topic-wise MCQs</li>
                  <li className="flex items-center text-foreground"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> 50+ Full-Length Mock Tests</li>
                  <li className="flex items-center text-foreground"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Advanced AI Analytics Engine</li>
                </ul>
                <Link href="/pricing" className="block text-center w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold font-display hover:bg-primary/90 transition-transform active:scale-95 ease-snappy shadow-[0_0_20px_rgba(255,191,0,0.2)]">
                  View All Features
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 5. FAQ SECTION */}
        <section className="py-32">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance mb-6">Frequently Asked Questions</h2>
            </div>
            
            <div className="space-y-4">
              <FAQItem 
                delay={100}
                question="Are the mock tests updated for the latest UPSC pattern?"
                answer="Yes, our content team regularly updates the question bank to reflect the latest trends, difficulty levels, and syllabus changes of the UPSC Civil Services Examination."
              />
              <FAQItem 
                delay={200}
                question="Do I get detailed explanations for incorrect answers?"
                answer="Absolutely. Every single question in our database comes with a comprehensive explanation, covering not just the correct option but also why the other options are incorrect."
              />
              <FAQItem 
                delay={300}
                question="Can I practice on my mobile device?"
                answer="Yes, Prepwise is fully responsive and optimized for mobile browsers, allowing you to practice MCQs on the go without downloading a separate app."
              />
            </div>
          </div>
        </section>

        {/* 6. BOTTOM CTA */}
        <section className="py-24 border-t border-white/5 bg-card/50 shadow-surface">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance mb-8 leading-tight">
              Ready to elevate your <br/> Prelims preparation?
            </h2>
            <Link 
              href="/signup" 
              className="inline-flex items-center justify-center px-10 py-5 bg-primary text-primary-foreground font-bold font-display rounded-xl shadow-[0_0_30px_rgba(255,191,0,0.2)] hover:shadow-[0_0_40px_rgba(255,191,0,0.4)] transition-all duration-300 hover:scale-[0.98] active:scale-95 ease-snappy ease-snappy text-lg group"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="mt-6 text-sm font-medium text-muted-foreground/70 uppercase tracking-widest">No credit card required</p>
          </div>
        </section>

        {/* 7. FOOTER */}
        <footer className="bg-background border-t border-white/5 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="col-span-2 md:col-span-1">
                <span className="font-bold font-display text-2xl tracking-tight text-foreground text-balance block mb-4">Prepwise</span>
                <p className="text-sm text-muted-foreground/70 max-w-xs">
                  © 2024 Prepwise. Engineered for Excellence.
                </p>
              </div>
              
              <div>
                <h4 className="text-xs font-bold font-display text-primary tracking-widest uppercase mb-4">Product</h4>
                <ul className="space-y-3">
                  <li><Link href="/practice-tests" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Practice Tests</Link></li>
                  <li><Link href="/mock-tests" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Mock Tests</Link></li>
                  <li><Link href="/performance" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Performance</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold font-display text-primary tracking-widest uppercase mb-4">Support</h4>
                <ul className="space-y-3">
                  <li><Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact Us</Link></li>
                  <li><Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Help Center</Link></li>
                  <li><Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold font-display text-primary tracking-widest uppercase mb-4">Legal</h4>
                <ul className="space-y-3">
                  <li><Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
                  <li><Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
                  <li><Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cookie Policy</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
