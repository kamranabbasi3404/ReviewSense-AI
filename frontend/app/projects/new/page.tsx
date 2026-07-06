"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiService } from "src/services/api";
import { ArrowLeft, Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const precreatedId = searchParams.get("id");

  const [projectName, setProjectName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);

  useEffect(() => {
    const isLoggedIn = typeof window !== "undefined" ? localStorage.getItem("reviewsense_logged_in") === "true" : false;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (precreatedId) {
      setProjectId(parseInt(precreatedId));
      // Fetch details to prepopulate name if needed
      apiService.getProject(parseInt(precreatedId))
        .then(p => setProjectName(p.project_name))
        .catch(err => console.error("Precreated project error", err));
    }
  }, [precreatedId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith(".csv")) {
        setError("Invalid file format. Please upload a CSV file.");
        setFile(null);
        return;
      }
      if (selected.size > 20 * 1024 * 1024) {
        setError("File size exceeds 20MB limit.");
        setFile(null);
        return;
      }
      setFile(selected);
      setError("");
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError("Please specify a project name.");
      return;
    }
    if (!file && !projectId) {
      setError("Please select a reviews CSV file to upload.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      let activeProjectId = projectId;
      
      // Step 1: Create project entry if not already precreated
      if (!activeProjectId) {
        const createdProject = await apiService.createProject(projectName);
        activeProjectId = createdProject.id;
      }

      // Step 2: Upload CSV
      if (file) {
        await apiService.uploadCSV(activeProjectId, file);
      }
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 flex-1 flex flex-col justify-center w-full">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" />
          Back to Workspace
        </Link>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-150 dark:bg-slate-900 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {projectId ? "Upload Review CSV" : "Create New Sentiment Project"}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Analyze customer feedback spreadsheets using local BERT models.
        </p>

        {error && (
          <div className="mt-6 flex items-center gap-2.5 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-center gap-2.5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span>Analysis started! Redirecting to dashboard...</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="mt-8 space-y-6">
          {/* Project Name */}
          <div>
            <label htmlFor="project-name" className="block text-sm font-semibold text-slate-700 dark:text-slate-350">
              Project Name
            </label>
            <input
              type="text"
              id="project-name"
              placeholder="e.g. Samsung S25 Ultra Reviews"
              required
              disabled={loading || success || !!projectId}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-350 px-3.5 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>

          {/* CSV File Upload Section */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350">
              Upload Spreadsheet (CSV)
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Spreadsheet MUST contain a column named exactly <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-600 dark:bg-slate-950 dark:text-indigo-400">review</code>.
            </p>

            <div className="mt-2.5 flex justify-center rounded-2xl border-2 border-dashed border-slate-300 px-6 pt-10 pb-10 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                required={!projectId}
                disabled={loading || success}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="text-center">
                {file ? (
                  <div className="flex flex-col items-center">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                    <span className="mt-3 block text-sm font-bold text-slate-900 dark:text-white">
                      {file.name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                ) : (
                  <div>
                    <Upload className="mx-auto h-12 w-12 text-slate-400" />
                    <span className="mt-3 block text-sm font-medium text-slate-600 dark:text-slate-400">
                      Drag and drop your CSV file here, or <span className="text-indigo-600 font-semibold dark:text-indigo-400">browse</span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      Max file size: 20MB
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="flex w-full justify-center items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing Upload & Running BERT...
              </>
            ) : (
              "Start Sentiment Analysis"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
