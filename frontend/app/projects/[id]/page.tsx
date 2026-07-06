"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiService } from "src/services/api";
import { 
  BarChart3, Loader2, ArrowLeft, Download, FileText, FileSpreadsheet, Search, Filter, 
  ChevronLeft, ChevronRight, MessageSquare, Sparkles, Smile, Frown, Compass, ArrowUpDown, Send
} from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface Review {
  id: number;
  project_id: number;
  review_text: string;
  prediction: string;
  confidence: number;
}

interface Analytics {
  summary: {
    total_reviews: number;
    positive_count: number;
    negative_count: number;
    average_confidence: number;
  };
  distribution: Array<{
    range_name: string;
    count: number;
  }>;
}

interface AIInsights {
  summary: string;
  top_complaints: string[];
  appreciated_features: string[];
  recommendations: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AnalysisPage() {
  const router = useRouter();
  const { id } = useParams();
  const projectId = parseInt(id as string);

  // States
  const [project, setProject] = useState<any>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  
  // Review explorer filtering states
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviewsCount, setTotalReviewsCount] = useState(0);

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // General tab and UI states
  const [activeTab, setActiveTab] = useState<"dashboard" | "explorer" | "insights" | "chat">("dashboard");
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Lifecycle
  useEffect(() => {
    setMounted(true);
    const isLoggedIn = typeof window !== "undefined" ? localStorage.getItem("reviewsense_logged_in") === "true" : false;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    fetchInitialData();
  }, [projectId]);

  useEffect(() => {
    if (activeTab === "explorer") {
      fetchReviews();
    }
  }, [page, sentiment, sortBy, sortOrder, activeTab]);

  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const proj = await apiService.getProject(projectId);
      setProject(proj);

      if (proj.status === "COMPLETED") {
        const stats = await apiService.getAnalytics(projectId);
        setAnalytics(stats);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      if (
        err.message && 
        (err.message.includes("validate credentials") || 
         err.message.includes("Not authenticated") ||
         err.message.includes("Unauthorized"))
      ) {
        apiService.logout();
        router.push("/login");
      } else {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const data = await apiService.getProjectReviews(projectId, {
        page,
        limit: 8,
        search,
        sentiment: sentiment || undefined,
        sortBy,
        sortOrder,
      });
      setReviews(data.reviews);
      setTotalPages(data.pages);
      setTotalReviewsCount(data.total_count);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadAIInsights = async () => {
    if (insights) return; // already loaded
    try {
      setInsightsLoading(true);
      const data = await apiService.getSummaryInsight(projectId);
      setInsights(data);
    } catch (err) {
      console.error(err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReviews();
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await apiService.sendChatMessage(projectId, userMsg);
      setChatMessages((prev) => [...prev, { role: "assistant", content: response.response }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev, 
        { role: "assistant", content: err.message || "Failed to generate a response from the AI." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  if (loading || !project || !analytics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <span className="mt-4 text-sm font-medium text-slate-500">Generating Analytics Dashboard...</span>
      </div>
    );
  }

  // Chart configs
  const pieData = [
    { name: "Positive Reviews", value: analytics.summary.positive_count, color: "#10B981" },
    { name: "Negative Reviews", value: analytics.summary.negative_count, color: "#EF4444" },
  ];

  const barData = analytics.distribution.map((d) => ({
    name: d.range_name,
    count: d.count,
  })).reverse(); // show <70% first up to 90-100%

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
      {/* Header breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
            <Link href="/dashboard" className="hover:text-slate-800 dark:hover:text-slate-200">Workspace</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-350">{project.project_name}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            {project.project_name}
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
              Analysis Completed
            </span>
          </h1>
        </div>

        {/* Exports — secure download via httpOnly cookie, no token in URL */}
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <button
            onClick={() => apiService.downloadCSV(projectId)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
          >
            <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={() => apiService.downloadPDF(projectId)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
          >
            <FileText className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 mt-6 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === "dashboard"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200 dark:hover:text-slate-300"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("explorer")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === "explorer"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200 dark:hover:text-slate-300"
          }`}
        >
          <Compass className="h-4 w-4" />
          Review Explorer
        </button>
        <button
          onClick={() => {
            setActiveTab("insights");
            loadAIInsights();
          }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === "insights"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200 dark:hover:text-slate-300"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          AI Insights
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === "chat"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200 dark:hover:text-slate-300"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          AI Chat
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-8 flex-1 flex flex-col">
        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Top overview cards */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total reviews */}
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Reviews</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{analytics.summary.total_reviews}</span>
                  <span className="text-xs text-slate-400">100% data</span>
                </div>
              </div>

              {/* Positive reviews */}
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Positive Reviews</span>
                  <Smile className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-450">
                    {analytics.summary.positive_count}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md dark:bg-emerald-950/20 dark:text-emerald-400">
                    {((analytics.summary.positive_count / (analytics.summary.total_reviews || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Negative reviews */}
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Negative Reviews</span>
                  <Frown className="h-4 w-4 text-rose-500" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-455">
                    {analytics.summary.negative_count}
                  </span>
                  <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md dark:bg-rose-950/20 dark:text-rose-400">
                    {((analytics.summary.negative_count / (analytics.summary.total_reviews || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Average confidence */}
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Average Confidence</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-indigo-650 dark:text-indigo-400">{analytics.summary.average_confidence}%</span>
                  <span className="text-xs text-slate-400">BERT model accuracy</span>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pie Chart Sentiment */}
              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex flex-col h-[380px]">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Sentiment Distribution</h3>
                <div className="flex-1 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} reviews`, 'Count']} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Bar Chart Confidence */}
              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex flex-col h-[380px]">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Confidence Distribution</h3>
                <div className="flex-1 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} formatter={(value) => [`${value} reviews`, 'Reviews Count']} />
                        <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REVIEW EXPLORER TAB */}
        {activeTab === "explorer" && (
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800 flex-1 flex flex-col">
            {/* Explorer filter navbar */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] max-w-md relative">
                <input
                  type="text"
                  placeholder="Search reviews (e.g. battery, price, delivery)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                />
                <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
              </form>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <select
                    value={sentiment}
                    onChange={(e) => {
                      setSentiment(e.target.value);
                      setPage(1);
                    }}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 dark:bg-slate-950 dark:border-slate-800 dark:text-white"
                  >
                    <option value="">All Sentiment</option>
                    <option value="Positive">Positive Only</option>
                    <option value="Negative">Negative Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-x-auto min-h-[300px]">
              {reviewsLoading ? (
                <div className="flex h-full items-center justify-center min-h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px]">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">No reviews match your query</p>
                  <p className="text-xs text-slate-500 mt-1">Try tweaking filters or searching for other items.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Review Text</th>
                      <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-400 w-36">
                        <button onClick={() => toggleSort("prediction")} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
                          Sentiment
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </th>
                      <th className="p-4 text-sm font-semibold text-slate-600 dark:text-slate-400 w-36">
                        <button onClick={() => toggleSort("confidence")} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
                          Confidence
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((rev) => (
                      <tr key={rev.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed pr-6 max-w-xl">
                          {rev.review_text}
                        </td>
                        <td className="p-4 text-sm">
                          {rev.prediction === "Positive" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
                              Positive
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/50">
                              Negative
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-sm font-mono text-slate-600 dark:text-slate-400">
                          {rev.confidence.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <span className="text-xs text-slate-500">
                  Showing page <b>{page}</b> of <b>{totalPages}</b> (Total reviews: {totalReviewsCount})
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI INSIGHTS TAB */}
        {activeTab === "insights" && (
          <div className="space-y-6">
            {insightsLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-650" />
                <span className="mt-4 text-sm text-slate-500">Retrieving intelligence from Groq API...</span>
              </div>
            ) : !insights ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <p className="text-sm text-red-500">Error loading AI Insights. Make sure Groq is configured.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Summary panel (spans 3 cols) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-800 md:col-span-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                    Overall Executive Summary
                  </h3>
                  <p className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed">
                    {insights.summary}
                  </p>
                </div>

                {/* Complaints */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 text-rose-700 dark:text-rose-455">
                      Top Complaints
                    </h3>
                    <ul className="space-y-3">
                      {insights.top_complaints.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-655 dark:text-slate-300 flex items-start gap-2">
                          <span className="mt-1 flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                      {insights.top_complaints.length === 0 && (
                        <li className="text-xs text-slate-400">No major complaints found</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Features appreciated */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 text-emerald-700 dark:text-emerald-450">
                      Appreciated Features
                    </h3>
                    <ul className="space-y-3">
                      {insights.appreciated_features.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-655 dark:text-slate-300 flex items-start gap-2">
                          <span className="mt-1 flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                      {insights.appreciated_features.length === 0 && (
                        <li className="text-xs text-slate-400">No standout features highlighted</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 text-indigo-700 dark:text-indigo-400">
                      Recommendations
                    </h3>
                    <ul className="space-y-3">
                      {insights.recommendations.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-655 dark:text-slate-300 flex items-start gap-2">
                          <span className="mt-1.5 flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                      {insights.recommendations.length === 0 && (
                        <li className="text-xs text-slate-400">No recommendations generated</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI CHAT TAB */}
        {activeTab === "chat" && (
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800 flex-1 flex flex-col max-h-[500px]">
            {/* Chat head */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
              <div className="text-sm font-bold text-slate-900 dark:text-white">Ask ReviewSense AI</div>
              <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-white dark:bg-slate-950 font-semibold border dark:border-slate-800">Review Context Enabled</span>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full text-slate-400">
                  <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Start a conversation with your data</p>
                  <p className="text-xs mt-1">Ask questions like "Why are customers complaining about delivery?" or "Summarize negative comments."</p>
                </div>
              )}

              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-slate-100 text-slate-800 rounded-tl-none dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm dark:bg-slate-800 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analyzing reviews...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Form */}
            <form onSubmit={handleSendChatMessage} className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                disabled={chatLoading}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about product delivery, features, complaints..."
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-950 dark:border-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-white hover:bg-indigo-500 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
