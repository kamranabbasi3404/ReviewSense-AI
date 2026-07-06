import Link from "next/link";
import { BarChart3, ShieldCheck, Zap, BrainCircuit, ArrowRight, MessageSquareCode, DownloadCloud } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative isolate overflow-hidden bg-slate-50 dark:bg-slate-950 flex-1 flex flex-col justify-center">
      {/* Background Gradient Blurs */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-500 to-violet-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72rem]" />
      </div>

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-wide border border-indigo-100 mb-6 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            Empowering Product Intelligence with AI
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white leading-[1.15]">
            Turn Customer Reviews into{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              Actionable Business Insights
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
            ReviewSense AI analyzes customer feedback using a fine-tuned local BERT sentiment model and produces real-time analytics dashboards & customized Groq LLM recommendations. Skip manual review scanning.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-500 hover:shadow-indigo-150 active:scale-95 dark:shadow-none"
            >
              Get Started for Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="text-base font-semibold leading-6 text-slate-900 transition-colors hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400"
            >
              Sign In <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-32">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600 dark:text-indigo-400">Enterprise Product Intelligence</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Everything you need to master your brand reputation
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="flex flex-col items-start bg-white p-8 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-slate-200/80 dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-slate-700/80">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <dt className="mt-4 font-semibold text-slate-900 dark:text-white text-lg">Local BERT Inference</dt>
              <dd className="mt-2 leading-7 text-slate-600 dark:text-slate-400 text-sm">
                No third-party leaks. Sentiment predictions run locally inside our backend using a highly customized BERT model yielding high confidence and sub-second execution.
              </dd>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-start bg-white p-8 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-slate-200/80 dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-slate-700/80">
              <div className="rounded-xl bg-violet-50 p-3 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                <BarChart3 className="h-6 w-6" />
              </div>
              <dt className="mt-4 font-semibold text-slate-900 dark:text-white text-lg">Interactive Analytics</dt>
              <dd className="mt-2 leading-7 text-slate-600 dark:text-slate-400 text-sm">
                Visualize sentiment splits and confidence distribution buckets. Query, search, and filter through review explorers, separating battery, shipping, or camera complaints.
              </dd>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-start bg-white p-8 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-slate-200/80 dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-slate-700/80">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <MessageSquareCode className="h-6 w-6" />
              </div>
              <dt className="mt-4 font-semibold text-slate-900 dark:text-white text-lg">AI Insights & Chat (Groq)</dt>
              <dd className="mt-2 leading-7 text-slate-600 dark:text-slate-400 text-sm">
                Understand the "why". Ask natural language questions like <i>"Why are customers unhappy with packaging?"</i> and get responses drawn directly from your review context.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
