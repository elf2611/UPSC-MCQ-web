import os

page_content = """
"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, Clock, BrainCircuit, Target, BarChart3, Newspaper, RefreshCcw, ShieldCheck, Zap, Trophy, Quote, PlayCircle, TrendingUp, Search, History } from "lucide-react";
import { useState, useEffect, useRef } from "react";

// --- HOOKS ---

function useScrollReveal(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
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

// --- COMPONENTS ---

function FAQItem({ question, answer, delay }: { question: string, answer: string, delay: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <div 
      ref={ref}
      className={`bg-card shadow-surface rounded-xl overflow-hidden hover:border-white/10 transition-all duration-500 ease-out border border-white/5 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-6 text-left focus:outline-none group"
      >
        <span className="font-bold font-display text-foreground text-lg group-hover:text-primary transition-colors pr-4">{question}</span>
        <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-primary/10 transition-colors`}>
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

function TestimonialCard({ quote, author, delay }: { quote: string, author: string, delay: number }) {
  const { ref, isVisible } = useScrollReveal(0.1);
  return (
    <div 
      ref={ref}
      className={`bg-card shadow-surface p-8 rounded-2xl border border-white/5 relative group hover:border-primary/30 transition-all duration-500 flex flex-col justify-between ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
      <p className="text-foreground/90 leading-relaxed mb-8 italic relative z-10">&quot;{quote}&quot;</p>
      <div className="flex items-center gap-4 mt-auto">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary font-display flex-shrink-0">
          {author.charAt(0)}
        </div>
        <div>
          <h4 className="font-bold font-display text-foreground text-sm">{author}</h4>
          <div className="flex text-primary">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---

export default function HomePage() {
  const { ref: outcomesRef, isVisible: outcomesVisible } = useScrollReveal(0.1);
  const { ref: valueRef, isVisible: valueVisible } = useScrollReveal(0.1);

  return (
    <div className="min-h-screen bg-[#0B0B0F] overflow-hidden selection:bg-primary/30 selection:text-primary-foreground">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-16 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-30 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full text-center">
          
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8 animate-[fadeIn_0.5s_ease-out]">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground font-display tracking-wide">ALIGNED TO UPSC NEGATIVE MARKING (+2/−0.66)</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold font-display tracking-tight text-foreground text-balance leading-[1.1] mb-6 max-w-4xl mx-auto animate-[slideUp_0.7s_ease-out]">
            Turn daily practice into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300">higher UPSC score.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground/90 mb-10 text-balance leading-relaxed max-w-2xl mx-auto animate-[slideUp_0.9s_ease-out]">
            Prepwise is a premium UPSC prep platform with AI‑generated MCQs, full‑length mocks, and deep analytics that show exactly what to fix next.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-[slideUp_1.1s_ease-out] mb-12">
            <Link 
              href="/signup" 
              className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground font-bold font-display rounded-xl shadow-[0_0_30px_rgba(255,191,0,0.2)] hover:shadow-[0_0_40px_rgba(255,191,0,0.4)] transition-all duration-300 hover:scale-[0.98] active:scale-95 ease-snappy text-lg group flex items-center justify-center"
            >
              Start 7-day free trial
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-white/5 text-foreground font-bold font-display rounded-xl border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center group">
              <PlayCircle className="mr-2 w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              Watch 2-min demo
            </button>
          </div>

          {/* Value Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto border-t border-white/10 pt-8 animate-[fadeIn_1.4s_ease-out]">
            <div className="flex items-center justify-center text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">Daily AI MCQs from current affairs</span>
            </div>
            <div className="flex items-center justify-center text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">Full GS Paper-1 mocks with timer</span>
            </div>
            <div className="flex items-center justify-center text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">Score trajectory & weak-subject alerts</span>
            </div>
          </div>
          <div className="mt-6 flex justify-center items-center gap-4 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest animate-[fadeIn_1.6s_ease-out]">
            <span>Secure Checkout</span>
            <span>&bull;</span>
            <span>Built for serious aspirants</span>
            <span>&bull;</span>
            <span>Cancel anytime</span>
          </div>

        </div>
      </section>

      {/* 2. SOCIAL PROOF */}
      <section className="py-16 bg-card/30 border-y border-white/5 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard 
              delay={0}
              quote="+18 marks in 6 weeks. The weak-subject alerts saved me time."
              author="Aspirant, 2025"
            />
            <TestimonialCard 
              delay={150}
              quote="Mocks feel like the real exam. Explanations are crisp and trap-aware."
              author="Aspirant, 2025"
            />
            <TestimonialCard 
              delay={300}
              quote="Daily current-affairs MCQs kept me consistent."
              author="Aspirant, 2025"
            />
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS (Timeline) */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance">
              The path to a higher score
            </h2>
          </div>

          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-[27px] top-[10px] bottom-[10px] w-0.5 bg-white/10 hidden md:block">
              <div className="w-full bg-gradient-to-b from-primary via-primary to-transparent h-full origin-top animate-[scaleY_3s_ease-out]" />
            </div>

            <div className="space-y-12">
              {/* Step 1 */}
              <div className="relative flex flex-col md:flex-row gap-8 items-start group">
                <div className="w-14 h-14 rounded-full bg-card border-2 border-white/10 group-hover:border-primary flex items-center justify-center font-bold font-display text-xl text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 relative z-10 shadow-surface">
                  1
                </div>
                <div className="bg-card shadow-surface border border-white/5 p-8 rounded-2xl flex-1 group-hover:border-white/10 transition-colors">
                  <h3 className="text-xl font-bold font-display text-foreground mb-3">Practice Smart</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Subject-wise practice with progress bars and filters. Choose Learn mode for instant feedback or Exam mode for timed pressure.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col md:flex-row gap-8 items-start group">
                <div className="w-14 h-14 rounded-full bg-card border-2 border-white/10 group-hover:border-primary flex items-center justify-center font-bold font-display text-xl text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 relative z-10 shadow-surface">
                  2
                </div>
                <div className="bg-card shadow-surface border border-white/5 p-8 rounded-2xl flex-1 group-hover:border-white/10 transition-colors">
                  <h3 className="text-xl font-bold font-display text-foreground mb-3">Test like the real exam</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    100-question GS Paper-1 mocks, strict 2-hour timer, and authentic UPSC negative marking (+2/−0.66). Build the stamina you need for D-Day.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col md:flex-row gap-8 items-start group">
                <div className="w-14 h-14 rounded-full bg-card border-2 border-primary flex items-center justify-center font-bold font-display text-xl text-primary shadow-[0_0_15px_rgba(255,191,0,0.3)] flex-shrink-0 relative z-10">
                  3
                </div>
                <div className="bg-card shadow-surface border border-primary/20 p-8 rounded-2xl flex-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none" />
                  <h3 className="text-xl font-bold font-display text-foreground mb-3">Analyze & Improve</h3>
                  <p className="text-muted-foreground leading-relaxed relative z-10">
                    Deep result breakdowns, elimination tips, and performance charts that highlight weak subjects. Stop guessing what to study next.
                  </p>
                  
                  {/* Mini-case */}
                  <div className="mt-6 bg-background/50 border border-white/5 rounded-xl p-4 flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Before & After</p>
                      <p className="font-bold font-display text-foreground text-lg">Accuracy: 58% <ArrowRight className="inline w-4 h-4 text-primary mx-1" /> 73%</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center text-green-400 font-bold bg-green-400/10 px-2 py-1 rounded text-sm">
                        <TrendingUp className="w-4 h-4 mr-1" /> +15%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">in just 4 weeks</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. OUTCOMES SECTION (Why this works) */}
      <section className="py-24 bg-card/30 border-y border-white/5 relative" ref={outcomesRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className={`text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance mb-6 transition-all duration-700 ${outcomesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Built to raise your score,<br/>not just your screen time.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <Newspaper className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Retain what matters</h3>
              <p className="text-muted-foreground">Daily AI MCQs from current affairs so you stay updated without drowning in newspapers.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <Clock className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Build stamina</h3>
              <p className="text-muted-foreground">Full-length mocks that strictly train your speed, accuracy, and mental stamina for the 2-hour window.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <Target className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Stop guessing</h3>
              <p className="text-muted-foreground">Weak-subject insights so you stop guessing what to study next and focus on exactly where you bleed marks.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <ShieldCheck className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Avoid common traps</h3>
              <p className="text-muted-foreground">Elimination tips and explicit "why wrong" breakdowns immediately after every question.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <BarChart3 className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Track real progress</h3>
              <p className="text-muted-foreground">Score trajectory charts to visually see your accuracy and progress week over week.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <History className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Fix mistakes forever</h3>
              <p className="text-muted-foreground">Revision queue acts as a smart inbox for marked/wrong questions using spaced-repetition.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION */}
      <section className="py-24 relative" ref={valueRef}>
        <div className="absolute top-0 right-1/2 w-full max-w-[800px] h-[400px] bg-primary/10 blur-[100px] rounded-full opacity-40 pointer-events-none translate-x-1/2" />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance mb-4">
            Invest in your outcome.
          </h2>
          <p className="text-lg text-muted-foreground mb-16">
            7-day free trial on all plans. Cancel anytime.
          </p>

          <div className="grid md:grid-cols-3 gap-6 items-end max-w-5xl mx-auto">
            
            {/* 1 Month */}
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 relative text-left hover:border-white/10 transition-colors">
              <h3 className="font-bold font-display text-foreground mb-1 text-xl">1 Month</h3>
              <p className="text-muted-foreground text-sm mb-6">Flexible</p>
              <div className="mb-6">
                <span className="text-4xl font-bold font-display text-foreground">₹499</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-muted-foreground text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 flex-shrink-0" /> Full Mocks & Practice</li>
                <li className="flex items-center text-muted-foreground text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 flex-shrink-0" /> Basic Analytics</li>
                <li className="flex items-center text-muted-foreground text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 flex-shrink-0" /> Daily AI MCQs</li>
              </ul>
              <Link href="/signup" className="block text-center w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-foreground font-bold font-display transition-colors">
                Start Trial
              </Link>
            </div>

            {/* 1 Year (Highlighted) */}
            <div className="bg-card shadow-surface shadow-[0_0_40px_rgba(255,191,0,0.1)] p-8 rounded-3xl border border-primary/40 relative text-left md:-translate-y-4 z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold font-display px-4 py-1.5 rounded-full uppercase tracking-wider flex items-center shadow-[0_0_15px_rgba(255,191,0,0.4)]">
                ⭐ MOST POPULAR
              </div>
              <h3 className="font-bold font-display text-foreground mb-1 text-xl pt-2">1 Year</h3>
              <p className="text-primary text-sm mb-6 font-medium">Best value for serious aspirants</p>
              <div className="mb-2">
                <span className="text-5xl font-bold font-display text-foreground">₹4,999</span>
                <span className="text-muted-foreground">/year</span>
              </div>
              <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-8">Save ₹989/yr vs monthly</p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Unlimited Mock & Practice Tests</li>
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Advanced Score Analytics</li>
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Spaced Revision Queue</li>
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Daily AI Current Affairs MCQs</li>
              </ul>
              <Link href="/signup" className="block text-center w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold font-display hover:bg-primary/90 transition-transform active:scale-95 ease-snappy shadow-[0_0_20px_rgba(255,191,0,0.2)]">
                Start 7-Day Free Trial
              </Link>
            </div>

            {/* 6 Months */}
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 relative text-left hover:border-white/10 transition-colors">
              <h3 className="font-bold font-display text-foreground mb-1 text-xl">6 Months</h3>
              <p className="text-muted-foreground text-sm mb-6">Save more</p>
              <div className="mb-6">
                <span className="text-4xl font-bold font-display text-foreground">₹2,499</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-muted-foreground text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 flex-shrink-0" /> Full Mocks & Practice</li>
                <li className="flex items-center text-muted-foreground text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 flex-shrink-0" /> Deep Analytics</li>
                <li className="flex items-center text-muted-foreground text-sm"><CheckCircle2 className="w-4 h-4 text-primary mr-3 flex-shrink-0" /> Daily AI MCQs</li>
              </ul>
              <Link href="/signup" className="block text-center w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-foreground font-bold font-display transition-colors">
                Start Trial
              </Link>
            </div>

          </div>
          
          {/* Trust badges below pricing */}
          <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
            <div className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2" /> XSS Protection</div>
            <div className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2" /> Secure Firebase Auth</div>
            <div className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2" /> Encrypted Checkout</div>
          </div>
        </div>
      </section>

      {/* 6. FEATURE HIGHLIGHTS (Show, Don't Tell) */}
      <section className="py-24 border-t border-white/5 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold font-display text-foreground mb-8">Engineering excellence in every pixel.</h2>
              
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-card border border-white/5 shadow-surface">
                  <h4 className="font-bold font-display text-foreground mb-2 flex items-center"><Search className="w-4 h-4 mr-2 text-primary" /> Test Interface</h4>
                  <p className="text-muted-foreground text-sm">Distraction-free UI, intuitive question palette, confidence tags, and strict countdown timer.</p>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-white/5 shadow-surface">
                  <h4 className="font-bold font-display text-foreground mb-2 flex items-center"><Trophy className="w-4 h-4 mr-2 text-primary" /> Results Engine</h4>
                  <p className="text-muted-foreground text-sm">Animated score counters, deep review with 'why wrong', and precise elimination tips.</p>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-white/5 shadow-surface">
                  <h4 className="font-bold font-display text-foreground mb-2 flex items-center"><BarChart3 className="w-4 h-4 mr-2 text-primary" /> Dashboard</h4>
                  <p className="text-muted-foreground text-sm">Recharts line graphs, weak vs strong subject maps, and trend tracking over your last 10 attempts.</p>
                </div>
              </div>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl aspect-video bg-card group">
              {/* Fake video player placeholder */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity" />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                <button className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_30px_rgba(255,191,0,0.5)]">
                  <PlayCircle className="w-10 h-10 ml-1" />
                </button>
                <p className="mt-6 font-bold font-display text-foreground">See it in action</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance mb-6">Remove the doubt.</h2>
          </div>
          
          <div className="space-y-4">
            <FAQItem 
              delay={100}
              question="Is this aligned with UPSC negative marking?"
              answer="Yes. Scoring uses +2 for correct, −0.66 for incorrect, exactly like UPSC. No simplified scoring here."
            />
            <FAQItem 
              delay={150}
              question="How many questions/tests are included?"
              answer="Hundreds of subject questions, full 100-question mocks, PYQs by year, and daily AI MCQs from current affairs."
            />
            <FAQItem 
              delay={200}
              question="Can I cancel or get a refund?"
              answer="Yes. We offer a 7-day free trial and simple cancellation. Our refund policy is clearly stated at checkout."
            />
            <FAQItem 
              delay={250}
              question="Will this work on my phone?"
              answer="Yes. The UI is mobile-first with a frosted navbar, smooth hamburger menu, and absolutely no horizontal scroll."
            />
            <FAQItem 
              delay={300}
              question="What if I'm a beginner?"
              answer="Starter plans build basics with practice mode; Pro adds full mocks and deep analytics to accelerate your improvement as you grow."
            />
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-24 border-t border-white/5 bg-gradient-to-b from-background to-primary/5 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-[300px] bg-primary/20 blur-[100px] rounded-full opacity-50 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold font-display tracking-tight text-foreground text-balance mb-8 leading-tight">
            Ready to turn practice into a higher score?
          </h2>
          <Link 
            href="/signup" 
            className="inline-flex items-center justify-center px-10 py-5 bg-primary text-primary-foreground font-bold font-display rounded-xl shadow-[0_0_30px_rgba(255,191,0,0.3)] hover:shadow-[0_0_50px_rgba(255,191,0,0.5)] transition-all duration-300 hover:scale-[0.98] active:scale-95 ease-snappy text-lg group"
          >
            Start 7-day free trial
            <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
          <div className="mt-8 flex justify-center items-center gap-4 text-xs font-medium text-muted-foreground/70 uppercase tracking-widest">
            <span>No hidden fees</span>
            <span>&bull;</span>
            <span>Secure checkout</span>
            <span>&bull;</span>
            <span>Built for serious aspirants</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-background border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <span className="font-bold font-display text-2xl tracking-tight text-foreground text-balance block mb-4">Prepwise</span>
              <p className="text-sm text-muted-foreground/70 max-w-xs">
                © 2026 Prepwise. Built to raise your score.
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-bold font-display text-primary tracking-widest uppercase mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/practice-tests" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Practice Tests</Link></li>
                <li><Link href="/mock-tests" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Mock Tests</Link></li>
                <li><Link href="/performance" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Performance Analytics</Link></li>
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
                <li><Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
"""

with open("src/app/page.tsx", "w") as f:
    f.write(page_content)
