import {
  Activity, ArrowRight, BrainCircuit, HeartPulse, Shield, UserRound, Users
} from 'lucide-react';

const FEATURES = [
  {
    icon: Activity,
    title: 'Predictive Analytics',
    description: 'Identify health and burnout risks with data-driven assessments.',
    color: 'text-indigo-400',
  },
  {
    icon: Shield,
    title: 'Sentiment Tracker',
    description: 'Understand employee wellbeing through anonymized feedback.',
    color: 'text-emerald-400',
  },
  {
    icon: BrainCircuit,
    title: 'Personalized Wellness',
    description: 'Offer practical fitness, diet, and mental wellness guidance.',
    color: 'text-purple-400',
  },
  {
    icon: HeartPulse,
    title: 'Health Data Management',
    description: 'Keep employee health records organized in one place.',
    color: 'text-rose-400',
  },
];

export default function WelcomePage({ onNavigate }) {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="min-h-screen bg-gradient-to-br from-white via-white to-slate-50">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 sm:px-10 lg:px-12">
          <header className="flex items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-tight sm:text-base">
                  AI-Based Employee Wellness
                </p>
                <p className="text-xs text-slate-500">Management Platform</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
              <Users className="h-4 w-4 text-emerald-600" />
              Healthier teams start here
            </div>
          </header>

          <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:py-16">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm">
                <BrainCircuit className="h-4 w-4 text-indigo-600" />
                Empowering healthy and engaged workforces
              </div>
              <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Transform your workplace{' '}
                <span className="font-serif italic text-indigo-700">with health</span>{' '}
                intelligence.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Manage employee health records, monitor burnout risks, understand
                workplace sentiment, and support people with personalized wellness
                recommendations.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/15 transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <UserRound className="h-4 w-4" />
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('signup')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  Create an Account
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, description, color }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60"
                >
                  <Icon className={`mb-4 h-5 w-5 ${color}`} />
                  <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </section>

        </div>
      </div>

      <footer className="border-t border-slate-200 bg-slate-50">
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:px-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16 lg:px-12 lg:py-20">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
              A healthier workplace, together
            </p>
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Join thousands of teams{' '}
              <span className="font-serif italic text-indigo-700">prioritizing employee health.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Establishing a wellness program can reduce absenteeism by 25% and increase overall workspace productivity. Get started with custom employee health indexing today.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-2">
            {[
              'Compliant and anonymized analytics standard',
              'Integrated mental distress notification system',
              'Direct AI-assisted personalized action plans',
              'Granular real-time team feedback widgets',
            ].map((benefit) => (
              <li
                key={benefit}
                className="flex min-h-24 items-start gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700 shadow-sm"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">
                  <Shield className="h-3.5 w-3.5" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </section>
        <div className="border-t border-slate-200">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12">
            <span>© 2026 Employee Wellness Inc.</span>
            <span className="flex items-center gap-2 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Supporting healthier workplaces
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
