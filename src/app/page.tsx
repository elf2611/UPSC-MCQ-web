import Link from "next/link";
import { BookOpen, Award, Target, Bookmark, FileText, Clock, CheckCircle2, ChevronRight, PlayCircle, Plus, ChevronDown } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-[#121212] min-h-screen pt-20">
      
      {/* 1. Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight mb-6">
              Master UPSC Prelims with PYQ-Based Mock Tests
            </h1>
            <p className="text-lg text-gray-300 mb-4">
              Your ultimate companion for cracking Prelims with accuracy.
            </p>
            <p className="text-sm text-gray-400 mb-10 italic">
              Curated by UPSC aspirants who've cleared Prelims.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/test-interface" 
                className="px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-colors text-center"
              >
                Start Free Test
              </Link>
              <Link 
                href="/practice-tests" 
                className="px-8 py-3.5 bg-transparent border border-white/20 text-white font-semibold rounded-md hover:bg-white/5 transition-colors text-center"
              >
                Explore Question Bank
              </Link>
            </div>
          </div>

          <div className="relative">
            {/* Mockup UI Window */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 shadow-2xl relative z-10">
              <div className="flex justify-between items-center mb-6">
                <div className="w-1/3 bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary w-[5%] h-full"></div>
                </div>
                <div className="text-primary font-mono text-xl tracking-wider">02:45:00</div>
              </div>
              <div className="text-sm text-gray-400 mb-2 font-medium">Question 5 of 100</div>
              <h3 className="text-white text-lg font-medium mb-6 leading-relaxed">
                Which among the following features of the Indian Constitution is borrowed from the British Constitution?
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="border border-white/10 bg-[#222] p-4 rounded-md text-gray-300 text-sm">A. Rule of Law</div>
                <div className="border border-white/10 bg-[#222] p-4 rounded-md text-gray-300 text-sm">B. Fundamental Rights</div>
                <div className="border border-primary bg-primary/10 p-4 rounded-md text-white text-sm flex justify-between items-center">
                  C. Parliamentary Form of Government
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <div className="border border-white/10 bg-[#222] p-4 rounded-md text-gray-300 text-sm">D. Directive Principles of State Policy</div>
              </div>

              <div className="flex justify-between items-center border-t border-white/10 pt-4">
                <button className="text-gray-400 text-sm">Previous</button>
                <button className="bg-primary/20 text-primary px-8 py-2 rounded-full text-sm font-medium">Next Question</button>
                <button className="text-gray-400 text-sm flex items-center gap-1"><Bookmark className="w-4 h-4"/> Flag</button>
              </div>
            </div>
            {/* Glow effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/20 blur-[100px] -z-10 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* 2. Stats Bar */}
      <section className="bg-[#181818] border-y border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">5,000+</div>
              <div className="text-sm text-gray-400">MCQs</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-sm text-gray-400">Mock Tests</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">1,000+</div>
              <div className="text-sm text-gray-400">Active Students</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">All India</div>
              <div className="text-sm text-gray-400">Topic Coverage</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-white text-center mb-16">
          Everything You Need to Crack Prelims
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<BookOpen className="w-5 h-5 text-gray-400" />}
            title="Topic-wise Practice"
            description="Filter MCQs by subject/topic."
          />
          <FeatureCard 
            icon={<Clock className="w-5 h-5 text-gray-400" />}
            title="Full-Length Mock Tests"
            description="Timed tests with negative marking."
          />
          <FeatureCard 
            icon={<Target className="w-5 h-5 text-gray-400" />}
            title="Performance Analytics"
            description="Track accuracy and weak areas."
          />
          <FeatureCard 
            icon={<Bookmark className="w-5 h-5 text-primary" />}
            title="Bookmark & Revise"
            description="Save questions for later."
          />
          <FeatureCard 
            icon={<FileText className="w-5 h-5 text-primary" />}
            title="Detailed Explanations"
            description="Every answer explained."
          />
          <FeatureCard 
            icon={<Clock className="w-5 h-5 text-gray-400" />}
            title="Year-wise PYQs"
            description="Practice by exam year."
          />
        </div>
      </section>

      {/* 4. How it works (Requested Section) */}
      <section className="bg-[#181818] py-20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white text-center mb-16">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Sign Up & Choose Subject</h3>
              <p className="text-gray-400">Create your free account and select which GS subject or topic you want to tackle today.</p>
            </div>
            <div className="text-center relative">
              <div className="hidden md:block absolute top-8 left-[-50%] w-full h-[1px] bg-white/10 -z-10"></div>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Practice & Learn</h3>
              <p className="text-gray-400">Attempt PYQs and new MCQs. Read detailed explanations for both correct and incorrect options.</p>
            </div>
            <div className="text-center relative">
              <div className="hidden md:block absolute top-8 left-[-50%] w-full h-[1px] bg-white/10 -z-10"></div>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Track & Improve</h3>
              <p className="text-gray-400">Review your performance analytics to identify weak areas and boost your accuracy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Pricing Teaser (Requested Section) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-white text-center mb-16">
          Choose Your Plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
            <p className="text-gray-400 mb-6">Perfect for testing the waters.</p>
            <div className="text-4xl font-bold text-white mb-8">₹0</div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-primary mr-3" /> 100+ Free Practice MCQs</li>
              <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-primary mr-3" /> 1 Full-Length Mock Test</li>
              <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-primary mr-3" /> Basic Analytics</li>
            </ul>
            <Link href="/signup" className="block text-center w-full py-3 rounded-md bg-white/5 text-white font-semibold hover:bg-white/10 transition-colors">
              Get Started
            </Link>
          </div>
          <div className="bg-[#1a1a1a] border border-primary rounded-xl p-8 relative shadow-[0_0_30px_rgba(255,191,0,0.1)]">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">POPULAR</div>
            <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
            <p className="text-gray-400 mb-6">Everything you need to crack Prelims.</p>
            <div className="text-4xl font-bold text-white mb-8">₹999 <span className="text-lg text-gray-500 font-normal">/year</span></div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-primary mr-3" /> 10,000+ Topic-wise MCQs</li>
              <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-primary mr-3" /> 50+ Full-Length Mock Tests</li>
              <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-primary mr-3" /> Advanced Analytics</li>
            </ul>
            <Link href="/pricing" className="block text-center w-full py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              View All Features
            </Link>
          </div>
        </div>
      </section>

      {/* 6. FAQ Accordion (Requested Section) */}
      <section className="bg-[#181818] py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <details className="group bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 text-white">
                <span>Are the mock tests updated for the latest UPSC pattern?</span>
                <span className="transition group-open:rotate-180">
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </span>
              </summary>
              <div className="text-gray-400 px-5 pb-5">
                Yes, our content team regularly updates the question bank to reflect the latest trends, difficulty levels, and syllabus changes of the UPSC Civil Services Examination.
              </div>
            </details>
            <details className="group bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 text-white">
                <span>Do I get detailed explanations for incorrect answers?</span>
                <span className="transition group-open:rotate-180">
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </span>
              </summary>
              <div className="text-gray-400 px-5 pb-5">
                Absolutely. Every single question in our database comes with a comprehensive explanation, covering not just the correct option but also why the other options are incorrect.
              </div>
            </details>
            <details className="group bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 text-white">
                <span>Can I practice on my mobile device?</span>
                <span className="transition group-open:rotate-180">
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </span>
              </summary>
              <div className="text-gray-400 px-5 pb-5">
                Yes, Prepwise is fully responsive and optimized for mobile browsers, allowing you to practice MCQs on the go.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* 7. Bottom CTA */}
      <section className="bg-[#1a1a1a] py-20 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-8">
            Start practicing for free, no signup needed for first 5 questions
          </h2>
          <Link 
            href="/test-interface" 
            className="inline-block px-8 py-3.5 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-[#121212] border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <span className="font-serif font-bold text-xl text-white block mb-4">Prepwise</span>
              <p className="text-sm text-gray-500 max-w-xs">
                © 2024 Prepwise. Engineered for Excellence.
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-primary tracking-widest uppercase mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/practice-tests" className="text-sm text-gray-400 hover:text-white transition-colors">Practice Tests</Link></li>
                <li><Link href="/mock-tests" className="text-sm text-gray-400 hover:text-white transition-colors">Mock Tests</Link></li>
                <li><Link href="/performance" className="text-sm text-gray-400 hover:text-white transition-colors">Performance</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-primary tracking-widest uppercase mb-4">Support</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-primary tracking-widest uppercase mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-[#1a1a1a] p-6 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
      <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">
        {description}
      </p>
    </div>
  );
}
