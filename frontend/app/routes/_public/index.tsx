import { useNavigate } from "react-router";
import { Button } from "~/components/ui";
import { ArrowRight, Shield, Sparkles, Wallet } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  const featureCards = [
    {
      title: "Secure AWS account connection",
      description:
        "Connect through IAM roles so CloudAudit can analyze cost data without exposing long-lived credentials.",
      icon: Shield,
    },
    {
      title: "AI anomaly explanations",
      description:
        "Detect unusual spend changes and understand likely causes by service, not just generic alerts.",
      icon: Sparkles,
    },
    {
      title: "Actionable optimization insights",
      description:
        "Get practical recommendations for EC2, RDS, and other services with clear potential monthly savings.",
      icon: Wallet,
    },
  ];

  return (
    <div>
      <section className="mx-auto w-full max-w-7xl px-6 pb-12 pt-16">
        <div className="rounded-3xl border border-orange-200 bg-linear-to-br from-white via-orange-50/50 to-white p-8 shadow-xl dark:border-orange-900/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 md:p-12">
          <div className="max-w-4xl">
            <p className="mb-4 inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-aws-orange dark:border-orange-900/30 dark:bg-orange-950/30">
              AWS Cost Optimization for SMB Teams
            </p>
            <h1 className="mb-6 text-4xl font-bold text-gray-900 dark:text-white md:text-6xl">
              Understand AWS spend, fix waste, and grow with confidence.
            </h1>
            <p className="max-w-3xl text-lg text-gray-600 dark:text-gray-300 md:text-xl">
              CloudAudit helps teams turn complex AWS billing data into clear
              decisions with cost breakdowns, anomaly insights, and optimization
              recommendations built for real business impact.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button size="lg" onClick={() => navigate("/signup")}>
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/login")}
            >
              Sign In to Dashboard
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8" id="what-it-is">
        <div className="grid gap-5 md:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-aws-orange dark:bg-orange-950/30">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-6" id="about-company">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            About the company
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">
            CloudAudit is focused on making cloud finance practical for teams
            that cannot afford heavyweight enterprise tooling. The product is
            intentionally designed for fast setup, transparent insights, and
            real savings that engineering teams can act on quickly.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-6" id="why-it-exists">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Why it exists
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">
            Most teams know cloud waste exists, but they do not have enough time
            or context to fix it. CloudAudit bridges that gap by showing where
            money goes, why spend changes happen, and what to optimize next.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-6" id="contact">
        <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-8 dark:border-orange-900/30 dark:bg-orange-950/20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Contact
          </h2>
          <p className="mt-3 text-base text-gray-700 dark:text-gray-300">
            Questions about CloudAudit, partnerships, or licensing:
          </p>
          <a
            href="mailto:asilva.tech@gmail.com"
            className="mt-4 inline-block text-lg font-semibold text-aws-orange hover:text-aws-orange-dark"
          >
            asilva.tech@gmail.com
          </a>
        </div>
      </section>
    </div>
  );
}
