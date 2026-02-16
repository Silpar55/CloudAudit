import { Button, Input } from "~/components/ui";

export default function LandingPage() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="max-w-2xl">
        <h1 className="text-6xl font-bold font-display text-gray-900 dark:text-white mb-6">
          Stop Overpaying for{" "}
          <span className="text-aws-orange">AWS Resources</span>
        </h1>

        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          AI-powered cost optimization for small businesses
        </p>

        <div className="space-y-4 max-w-md">
          <Input type="email" placeholder="work@company.com" />
          <Button variant="primary" fullWidth>
            Start Free Trial
          </Button>
        </div>
      </div>
    </section>
  );
}
