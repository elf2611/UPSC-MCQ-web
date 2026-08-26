import { Check } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-background to-background pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground text-balance tracking-tight mb-6">Simple, transparent pricing</h1>
          <p className="text-xl text-muted-foreground text-balance">Unlock your full potential with Prepwise Premium</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
          <PricingCard 
            title="Free Tier" 
            price="₹0" 
            description="Perfect for getting started with your preparation."
            features={[
              "100+ Free Practice MCQs",
              "1 Free Full-Length Mock Test",
              "Basic Performance Tracking",
              "Community Support"
            ]}
          />
          <PricingCard 
            title="Premium" 
            price="₹999" 
            period="/year"
            description="Everything you need to crack the UPSC exam."
            isPopular
            features={[
              "10,000+ Topic-wise MCQs",
              "50+ Full-Length Mock Tests",
              "Advanced Analytics & Rank Prediction",
              "Detailed Explanations for all questions",
              "Priority Support",
              "Current Affairs Monthly Digest"
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function PricingCard({ title, price, period, description, features, isPopular }: { title: string, price: string, period?: string, description: string, features: string[], isPopular?: boolean }) {
  return (
    <div className={`relative bg-card rounded-2xl p-8 md:p-10 transition-all duration-500 ${isPopular ? 'shadow-surface-glow md:scale-105 z-10' : 'shadow-surface hover:shadow-surface-hover z-0'}`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground font-bold px-4 py-1.5 rounded-full text-xs uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(255,191,0,0.5)]">
          POPULAR
        </div>
      )}
      <h3 className="text-2xl font-display font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground mb-8 text-sm">{description}</p>
      <div className="mb-8 flex items-baseline">
        <span className="text-6xl font-display font-bold text-foreground tabular-nums tracking-tight">{price}</span>
        {period && <span className="text-muted-foreground ml-2">{period}</span>}
      </div>
      <ul className="space-y-5 mb-10">
        {features.map((feature: string, i: number) => (
          <li key={i} className="flex items-start">
            <Check className={`h-5 w-5 shrink-0 mr-3 mt-0.5 ${isPopular ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={isPopular ? 'text-foreground' : 'text-muted-foreground'}>{feature}</span>
          </li>
        ))}
      </ul>
      <button className={`w-full py-4 rounded-xl font-bold transition-transform ease-snappy hover:scale-[0.98] active:scale-95 ${
        isPopular 
          ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(255,191,0,0.2)]' 
          : 'bg-background shadow-surface hover:shadow-surface-hover text-foreground'
      }`}>
        {isPopular ? 'Subscribe Now' : 'Get Started'}
      </button>
    </div>
  );
}
