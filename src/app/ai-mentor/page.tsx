import MentorChat from "@/components/mentor/MentorChat";

export const metadata = {
  title: "AI Mentor | Prepwise",
  description: "Your personalized AI UPSC Mentor.",
};

export default function AIMentorPage() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground">AI Mentor</h1>
        <p className="text-muted-foreground mt-2">Get personalized study plans, doubt clearance, and performance analysis.</p>
      </div>
      
      <MentorChat />
    </div>
  );
}
