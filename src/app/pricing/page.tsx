"use client";

import Link from "next/link";
import { CheckCircle2, ShieldCheck, ArrowRight, HelpCircle } from "lucide-react";
import { useState } from "react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0F] overflow-hidden pt-24 selection:bg-primary/30 selection:text-primary-foreground">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-primary/10 blur-[120px] rounded-full opacity-30 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pb-24">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold font-display tracking-tight text-foreground text-balance mb-6 animate-[slideUp_0.5s_ease-out]">
            Invest in your outcome.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-balance animate-[slideUp_0.7s_ease-out]">
            Get access to the most advanced UPSC test series and analytics platform. 
            All plans include a <strong className="text-foreground">7-day free trial</strong>. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 items-end max-w-5xl mx-auto animate-[slideUp_0.9s_ease-out]">
            
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
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold font-display px-4 py-1.5 rounded-full uppercase tracking-wider flex items-center shadow-[0_0_15px_rgba(255,191,0,0.4)] whitespace-nowrap">
              ⭐ MOST POPULAR
            </div>
            <h3 className="font-bold font-display text-foreground mb-1 text-xl pt-2">1 Year</h3>
            <p className="text-primary text-sm mb-6 font-medium">Best value for serious aspirants</p>
            <div className="mb-2 flex items-baseline">
              <span className="text-5xl font-bold font-display text-foreground">₹4,999</span>
              <span className="text-muted-foreground ml-1">/year</span>
            </div>
            <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-8">Save ₹989/yr vs monthly</p>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Unlimited Mock & Practice Tests</li>
              <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Advanced Score Analytics</li>
              <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Spaced Revision Queue</li>
              <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Daily AI Current Affairs MCQs</li>
              <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Detailed &quot;Why Wrong&quot; Explanations</li>
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
        
        {/* Trust Badges */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest animate-[fadeIn_1.3s_ease-out]">
          <div className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2" /> XSS Protection</div>
          <div className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2" /> Secure Firebase Auth</div>
          <div className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2" /> Encrypted Checkout</div>
        </div>

      </div>

      {/* FAQ Section */}
      <section className="py-24 border-t border-white/5 bg-card/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <HelpCircle className="w-12 h-12 text-primary mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-bold font-display text-foreground mb-4">Questions about pricing?</h2>
            <p className="text-muted-foreground text-lg">We&apos;ve got answers. If you need anything else, just reach out.</p>
          </div>
          
          <div className="space-y-4">
            <PricingFAQ 
              question="How does the 7-day free trial work?"
              answer="When you sign up, you'll get full access to Prepwise Pro for 7 days. Your card won't be charged until the trial ends. You can cancel instantly from your dashboard before the 7 days are up, and you won't pay a single rupee."
            />
            <PricingFAQ 
              question="What happens if I want to cancel later?"
              answer="You can cancel your subscription at any time with one click from your account settings. You'll continue to have access to all premium features until the end of your current billing cycle."
            />
            <PricingFAQ 
              question="Can I upgrade from Monthly to Yearly?"
              answer="Yes! You can upgrade your plan at any time. We will automatically prorate the cost based on the time remaining in your current billing cycle."
            />
            <PricingFAQ 
              question="Are the mock tests aligned with the real UPSC exam?"
              answer="Absolutely. We strictly enforce the authentic UPSC negative marking system (+2 for correct, -0.66 for incorrect). The 2-hour timer and distraction-free UI are built to exactly mimic the real exam environment."
            />
          </div>
        </div>
      </section>
      
      {/* Footer Banner */}
      <section className="py-16 border-t border-white/5 bg-primary/10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold font-display text-foreground mb-6">Stop guessing what to study next.</h3>
          <Link 
            href="/signup" 
            className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-bold font-display rounded-xl hover:shadow-[0_0_40px_rgba(255,191,0,0.4)] transition-all duration-300 hover:scale-[0.98] active:scale-95 ease-snappy group"
          >
            Start your free trial today
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function PricingFAQ({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-card shadow-surface rounded-xl overflow-hidden hover:border-white/10 transition-all duration-300 border border-white/5">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-6 text-left focus:outline-none group"
      >
        <span className="font-bold font-display text-foreground text-lg group-hover:text-primary transition-colors pr-4">{question}</span>
        <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-primary/10 transition-colors">
          <svg className={`w-5 h-5 text-muted-foreground group-hover:text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
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
