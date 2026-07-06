"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiService } from "src/services/api";
import { PlusCircle, FileSpreadsheet, Trash2, Calendar, Loader2, PlayCircle, AlertCircle, CheckCircle2 } from "lucide-react";

interface Project {
  id: number;
  user_id: number;
  project_name: string;
  upload_date: string;
  total_reviews: number;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProjects = async () => {
    try {
      const data = await apiService.getProjects();
      setProjects(data);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load projects.");
      // If token expired or not authenticated, route to login
      if (
        err.message && 
        (err.message.includes("validate credentials") || 
         err.message.includes("Not authenticated") ||
         err.message.includes("Unauthorized"))
      ) {
        apiService.logout();
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isLoggedIn = typeof window !== "undefined" ? localStorage.getItem("reviewsense_logged_in") === "true" : false;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    fetchProjects();
  }, []);

  // Set up polling for PROCESSING projects
  useEffect(() => {
    const activeProcessing = projects.some((p) => p.status === "PROCESSING" || p.status === "PENDING");
    if (!activeProcessing) return;

    const interval = setInterval(async () => {
      try {
        const data = await apiService.getProjects();
        setProjects(data);
      } catch (err) {
        console.error("Polling projects failed", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [projects]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this project? All reviews and analytics will be permanently deleted.")) {
      return;
    }
    try {
      await apiService.deleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete project.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ready
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 border border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Analyzing
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50">
            <AlertCircle className="h-3.5 w-3.5" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 border border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
            <PlayCircle className="h-3.5 w-3.5" />
            Pending Upload
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <span className="mt-4 text-sm font-medium text-slate-500">Loading Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
      {/* Welcome Header */}
      <div className="sm:flex sm:items-center sm:justify-between border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Workspace</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Manage your product review sentiment analysis projects.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/projects/new"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition-all"
          >
            <PlusCircle className="h-4.5 w-4.5" />
            Create Project
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-center gap-2.5 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center dark:border-slate-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">No projects found</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            Create your first project, upload a product review CSV file, and watch our BERT model extract intelligence in real-time.
          </p>
          <div className="mt-6">
            <Link
              href="/projects/new"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              New Project
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm border border-slate-150 transition-all hover:shadow-md hover:border-slate-200 dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-slate-700/80"
            >
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(project.upload_date).toLocaleDateString()}
                  </span>
                  {getStatusBadge(project.status)}
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
                  {project.project_name}
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  {project.status === "COMPLETED" ? (
                    <>
                      Processed <b>{project.total_reviews}</b> unique reviews
                    </>
                  ) : project.status === "PROCESSING" ? (
                    "Running local BERT classification models..."
                  ) : project.status === "FAILED" ? (
                    "Error parsing reviews CSV file."
                  ) : (
                    "Requires review spreadsheet upload"
                  )}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                {project.status === "COMPLETED" ? (
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    View Analytics →
                  </Link>
                ) : project.status === "PENDING" ? (
                  <Link
                    href={`/projects/new?id=${project.id}`}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    Upload CSV →
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-slate-400">Unavailable</span>
                )}

                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 transition-colors"
                  title="Delete Project"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
