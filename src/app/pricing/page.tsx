import { Check } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h1>
        <p className="text-xl text-gray-400">Unlock your full potential with Prepwise Premium</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
  );
}

function PricingCard({ title, price, period, description, features, isPopular }: { title: string, price: string, period?: string, description: string, features: string[], isPopular?: boolean }) {
  return (
    <div className={`relative bg-card rounded-2xl p-8 border ${isPopular ? 'border-primary shadow-[0_0_30px_rgba(255,191,0,0.2)]' : 'border-white/10'}`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground font-bold px-4 py-1 rounded-full text-sm">
          Most Popular
        </div>
      )}
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-6">{description}</p>
      <div className="mb-8 flex items-baseline">
        <span className="text-5xl font-extrabold text-white">{price}</span>
        {period && <span className="text-gray-400 ml-2">{period}</span>}
      </div>
      <ul className="space-y-4 mb-8">
        {features.map((feature: string, i: number) => (
          <li key={i} className="flex items-start">
            <Check className="h-5 w-5 text-primary shrink-0 mr-3 mt-0.5" />
            <span className="text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
      <button className={`w-full py-3 rounded-lg font-bold transition-all ${
        isPopular 
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(255,191,0,0.4)]' 
          : 'bg-white/10 text-white hover:bg-white/20'
      }`}>
        {isPopular ? 'Subscribe Now' : 'Get Started'}
      </button>
    </div>
  );
}
