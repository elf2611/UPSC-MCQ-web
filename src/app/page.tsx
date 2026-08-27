"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, Clock, BrainCircuit, Target, BarChart3, Newspaper, RefreshCcw, ShieldCheck, Zap, Trophy, Quote } from "lucide-react";
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

// --- COMPONENTS ---

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

function TestimonialCard({ quote, author, role, delay }: { quote: string, author: string, role: string, delay: number }) {
  const { ref, isVisible } = useScrollReveal(0.1);
  return (
    <div 
      ref={ref}
      className={`bg-card shadow-surface p-8 rounded-2xl border border-white/5 relative group hover:border-primary/30 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
      <p className="text-foreground/90 leading-relaxed mb-6 italic relative z-10">&quot;{quote}&quot;</p>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary font-display">
          {author.charAt(0)}
        </div>
        <div>
          <h4 className="font-bold font-display text-foreground">{author}</h4>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---

export default function HomePage() {
  const { ref: featuresRef, isVisible: featuresVisible } = useScrollReveal(0.1);
  const { ref: valueRef, isVisible: valueVisible } = useScrollReveal(0.1);

  return (
    <div className="min-h-screen bg-[#0B0B0F] overflow-hidden selection:bg-primary/30 selection:text-primary-foreground">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center pt-20 pb-20 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-30 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8 animate-[fadeIn_0.5s_ease-out]">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground font-display tracking-wide">UPSC PRELIMS 2025 READY</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold font-display tracking-tight text-foreground text-balance leading-[1.1] mb-6 animate-[slideUp_0.7s_ease-out]">
                The smartest way to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300">crack UPSC.</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground/90 mb-10 text-balance leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-[slideUp_0.9s_ease-out]">
                Stop guessing your weaknesses. Prepwise brings Silicon Valley-grade analytics, daily AI-generated Current Affairs, and strictly timed Mock Tests to your UPSC preparation.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start animate-[slideUp_1.1s_ease-out]">
                <Link 
                  href="/signup" 
                  className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground font-bold font-display rounded-xl shadow-[0_0_30px_rgba(255,191,0,0.2)] hover:shadow-[0_0_40px_rgba(255,191,0,0.4)] transition-all duration-300 hover:scale-[0.98] active:scale-95 ease-snappy text-lg group flex items-center justify-center"
                >
                  Start Preparing Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="text-sm text-muted-foreground font-medium">₹4,999/year. Cancel anytime.</p>
              </div>
            </div>

            <div className="relative w-full h-[500px] flex items-center justify-center lg:justify-end animate-[fadeIn_1.3s_ease-out]">
              <HeroTestSimulation />
            </div>
          </div>
        </div>
      </section>

      {/* 2. EVERYTHING YOU GET (FEATURE SHOWCASE) */}
      <section className="py-24 bg-card/30 border-y border-white/5 relative">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-20" ref={featuresRef}>
            <h2 className={`text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance mb-6 transition-all duration-700 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Everything you need. <br/><span className="text-primary">Nothing you don&apos;t.</span>
            </h2>
            <p className={`text-lg text-muted-foreground transition-all duration-700 delay-100 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              We stripped away the clutter of traditional test prep sites and built exactly what aspirants actually need to improve their scores.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground mb-3">Mock Tests</h3>
              <p className="text-muted-foreground leading-relaxed">Full-length GS Paper 1 simulations. Strictly timed to 2 hours with authentic UPSC negative marking. Experience the real exam pressure.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground mb-3">Practice Tests</h3>
              <p className="text-muted-foreground leading-relaxed">Subject-wise and topic-wise modular tests. Practice specific areas like Modern History or Indian Polity until you master them completely.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Newspaper className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground mb-3">Daily Current Affairs</h3>
              <p className="text-muted-foreground leading-relaxed">Gemini AI reads the morning news and generates UPSC-standard MCQs daily. Stay ahead of dynamic questions without drowning in newspapers.</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground mb-3">Performance Analytics</h3>
              <p className="text-muted-foreground leading-relaxed">Deep insights into your accuracy, speed, and subject-wise competency. Know exactly which subjects are dragging your score down.</p>
            </div>

            {/* Feature 5 */}
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <RefreshCcw className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground mb-3">Spaced Revision</h3>
              <p className="text-muted-foreground leading-relaxed">Every mistake goes into your intelligent Revision Queue. Review incorrect answers at optimal intervals so you never make the same mistake twice.</p>
            </div>

            {/* Feature 6 */}
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-foreground mb-3">Detailed Solutions</h3>
              <p className="text-muted-foreground leading-relaxed">Every single question comes with a comprehensive explanation. Understand not just the right answer, but exactly why the others are wrong.</p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. HOW IT IMPROVES PERFORMANCE */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full opacity-50 pointer-events-none translate-x-1/2 -translate-y-1/2" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <div className="order-2 lg:order-1">
              <div className="bg-card shadow-surface p-6 rounded-2xl border border-white/5 relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold font-display text-foreground">Subject Competency</h4>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex justify-between items-center">
                    <div>
                      <p className="text-green-400 font-bold font-display">Indian Polity</p>
                      <p className="text-xs text-green-500/70">Strongest Pillar</p>
                    </div>
                    <span className="text-2xl font-bold font-display text-green-400 tabular-nums">78.5%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex justify-between items-center">
                    <div>
                      <p className="text-red-400 font-bold font-display">Modern History</p>
                      <p className="text-xs text-red-500/70">Needs Immediate Focus</p>
                    </div>
                    <span className="text-2xl font-bold font-display text-red-400 tabular-nums">42.1%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center space-x-2 text-primary font-bold font-display tracking-widest uppercase text-sm mb-4">
                <Zap className="w-4 h-4" /> Data-Driven Growth
              </div>
              <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance mb-6">
                Stop guessing. Start improving.
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Most aspirants fail because they spend hundreds of hours studying what they already know. Prepwise&apos;s analytics engine acts as your personal mentor, pointing exactly to where you are bleeding marks.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="mt-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-3 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <p className="text-foreground"><strong className="text-white">Identify weak zones:</strong> See your accuracy broken down by micro-topics, not just broad subjects.</p>
                </li>
                <li className="flex items-start">
                  <div className="mt-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-3 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <p className="text-foreground"><strong className="text-white">Track momentum:</strong> Watch your score trajectory across your last 10 mock tests.</p>
                </li>
                <li className="flex items-start">
                  <div className="mt-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-3 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <p className="text-foreground"><strong className="text-white">Fix mistakes forever:</strong> The revision queue ensures you review failed concepts right before you forget them.</p>
                </li>
              </ul>
            </div>
            
          </div>
        </div>
      </section>

      {/* 4. VALUE / PRICING SECTION */}
      <section className="py-24 bg-primary/5 border-y border-primary/10" ref={valueRef}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Trophy className={`w-16 h-16 mx-auto text-primary mb-6 transition-all duration-700 ${valueVisible ? 'scale-100 rotate-0' : 'scale-0 -rotate-45'}`} />
          <h2 className={`text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance mb-6 transition-all duration-700 delay-100 ${valueVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            An entire coaching institute&apos;s test series, for a fraction of the cost.
          </h2>
          <p className={`text-lg text-muted-foreground mb-12 max-w-2xl mx-auto transition-all duration-700 delay-200 ${valueVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            Offline test series charge upwards of ₹15,000 for PDFs and delayed, generic feedback. We give you instant, personalized AI analytics, daily questions, and unlimited mock tests.
          </p>

          <div className={`bg-card shadow-surface border border-primary/30 p-8 md:p-12 rounded-3xl relative overflow-hidden transition-all duration-700 delay-300 ${valueVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="text-left flex-1">
                <h3 className="text-2xl font-bold font-display text-foreground mb-2">Prepwise Unlimited</h3>
                <p className="text-muted-foreground mb-6">Unrestricted access to the platform for one full year.</p>
                <div className="space-y-3">
                  <div className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3" /> Unlimited Mock & Practice Tests</div>
                  <div className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3" /> Daily AI Current Affairs MCQs</div>
                  <div className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3" /> Deep Analytics & Spaced Revision</div>
                </div>
              </div>
              
              <div className="bg-background shadow-surface border border-white/5 p-8 rounded-2xl w-full md:w-auto text-center">
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2 line-through decoration-red-500/50">₹14,999/yr</div>
                <div className="text-5xl font-bold font-display text-foreground mb-2">₹4,999<span className="text-xl text-muted-foreground font-normal">/yr</span></div>
                <p className="text-xs text-primary font-bold uppercase tracking-wider mb-6">Launch Offer</p>
                <Link 
                  href="/signup" 
                  className="block w-full px-8 py-4 bg-primary text-primary-foreground font-bold font-display rounded-xl hover:bg-primary/90 transition-transform active:scale-95 ease-snappy shadow-[0_0_20px_rgba(255,191,0,0.2)]"
                >
                  Get Access Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIALS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground text-balance mb-4">
              Loved by serious aspirants
            </h2>
            <p className="text-muted-foreground text-lg">Join hundreds of students leveling up their Prelims score.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard 
              delay={0}
              quote="The negative marking simulator is the closest thing to actual UPSC exam pressure I&apos;ve found online. It completely changed how I approach MCQs."
              author="Rohan M."
              role="UPSC Aspirant, 2026"
            />
            <TestimonialCard 
              delay={150}
              quote="Current affairs MCQs ready every morning before I finish my chai — exactly what I needed to stay consistent. The Gemini AI integration is flawless."
              author="Priya S."
              role="Mains Qualifier, 2025"
            />
            <TestimonialCard 
              delay={300}
              quote="The performance dashboard finally told me I was weak in Environment, not History — that insight alone saved weeks of misdirected revision."
              author="Amit K."
              role="UPSC Aspirant, 2026"
            />
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="py-24 bg-card/30 border-t border-white/5">
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
  );
}
