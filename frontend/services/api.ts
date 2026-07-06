const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Secure Token Management ---
// Token stored in module-scoped memory variable (NOT localStorage).
// This prevents XSS attacks from accessing the token via localStorage/sessionStorage.
// The httpOnly cookie provides defense-in-depth as a parallel auth mechanism.
let memoryToken: string | null = null;

// --- Token Refresh Logic ---
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include", // Sends refresh_token httpOnly cookie
    });
    if (response.ok) {
      const data = await response.json();
      memoryToken = data.access_token;
      if (typeof window !== "undefined") {
        localStorage.setItem("reviewsense_logged_in", "true");
      }
      return true;
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("reviewsense_logged_in");
    }
    return false;
  } catch {
    if (typeof window !== "undefined") {
      localStorage.removeItem("reviewsense_logged_in");
    }
    return false;
  }
}

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (memoryToken) {
    headers["Authorization"] = `Bearer ${memoryToken}`;
  }
  return headers;
}

// Parse error response — handles both string and Pydantic validation error formats
function parseErrorDetail(errorData: any): string {
  if (!errorData?.detail) return "An unexpected error occurred.";
  
  // Pydantic validation errors come as an array
  if (Array.isArray(errorData.detail)) {
    return errorData.detail
      .map((e: any) => {
        let msg = e.msg || "";
        // Strip Pydantic "Value error, " prefix for cleaner messages
        msg = msg.replace(/^Value error, /i, "");
        return msg;
      })
      .filter(Boolean)
      .join(". ");
  }
  
  return errorData.detail;
}

// Global fetch wrapper with auto-refresh on 401
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isAuthenticated = true
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const makeRequest = async (headers: HeadersInit) => {
    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...headers,
        ...options.headers,
      },
    });
  };
  
  let response = await makeRequest(
    isAuthenticated ? getAuthHeaders() : { "Content-Type": "application/json" }
  );

  // Auto-refresh: if 401 and authenticated request, try refreshing the token
  if (response.status === 401 && isAuthenticated) {
    // Deduplicate concurrent refresh attempts
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken();
    }
    const refreshed = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshed) {
      // Retry original request with new token
      response = await makeRequest(getAuthHeaders());
    }
  }

  if (!response.ok) {
    let errorMessage = "An unexpected error occurred.";
    try {
      const errorData = await response.json();
      errorMessage = parseErrorDetail(errorData);
    } catch (_) {
      // Keep fallback error message
    }
    throw new Error(errorMessage);
  }

  // Handle No Content (204 deletion, etc.)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const apiService = {
  // --- Auth ---
  async signup(name: string, email: string, password: string) {
    return request<{ id: number; name: string; email: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }, false);
  },

  async login(email: string, password: string) {
    // Login sets httpOnly cookies (access_token + refresh_token) on backend response.
    // Token also stored in memory for cross-origin Authorization header.
    const data = await request<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, false);
    
    memoryToken = data.access_token;
    if (typeof window !== "undefined") {
      localStorage.setItem("reviewsense_logged_in", "true");
    }
    return data;
  },

  async logout() {
    memoryToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("reviewsense_logged_in");
    }
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to clear session:", err);
    }
  },

  hasToken(): boolean {
    return !!memoryToken;
  },

  async getMe() {
    return request<{ id: number; name: string; email: string }>("/auth/me");
  },

  // --- Projects ---
  async getProjects() {
    return request<Array<{
      id: number;
      user_id: number;
      project_name: string;
      upload_date: string;
      total_reviews: number;
      status: string;
    }>>("/projects");
  },

  async getProject(id: number) {
    return request<{
      id: number;
      user_id: number;
      project_name: string;
      upload_date: string;
      total_reviews: number;
      status: string;
    }>(`/projects/${id}`);
  },

  async createProject(projectName: string) {
    return request<{
      id: number;
      user_id: number;
      project_name: string;
      upload_date: string;
      total_reviews: number;
      status: string;
    }>("/projects", {
      method: "POST",
      body: JSON.stringify({ project_name: projectName }),
    });
  },

  async deleteProject(id: number) {
    return request<void>(`/projects/${id}`, {
      method: "DELETE",
    });
  },

  async uploadCSV(projectId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const headers: HeadersInit = {};
    if (memoryToken) {
      headers["Authorization"] = `Bearer ${memoryToken}`;
    }

    const response = await fetch(`${BASE_URL}/projects/${projectId}/upload`, {
      method: "POST",
      credentials: "include",
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = "File upload failed.";
      try {
        const errorData = await response.json();
        errorMessage = parseErrorDetail(errorData);
      } catch (_) {}
      throw new Error(errorMessage);
    }

    return response.json();
  },

  // --- Analytics ---
  async getAnalytics(projectId: number) {
    return request<{
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
    }>(`/analytics/${projectId}`);
  },

  async getProjectReviews(
    projectId: number,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      sentiment?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {}
  ) {
    const queryParts = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params.sentiment) queryParts.push(`sentiment=${params.sentiment}`);
    if (params.sortBy) queryParts.push(`sort_by=${params.sortBy}`);
    if (params.sortOrder) queryParts.push(`sort_order=${params.sortOrder}`);

    const query = queryParts.length ? `?${queryParts.join("&")}` : "";
    return request<{
      reviews: Array<{
        id: number;
        project_id: number;
        review_text: string;
        prediction: string;
        confidence: number;
      }>;
      total_count: number;
      page: number;
      pages: number;
    }>(`/analytics/${projectId}/reviews${query}`);
  },

  // --- AI Insights ---
  async getSummaryInsight(projectId: number) {
    return request<{
      summary: string;
      top_complaints: string[];
      appreciated_features: string[];
      recommendations: string[];
    }>(`/projects/${projectId}/summary`, {
      method: "POST",
    });
  },

  async sendChatMessage(projectId: number, message: string) {
    return request<{ response: string }>(`/projects/${projectId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  // --- Secure Export Downloads (cookie-based, no token in URL) ---
  async downloadCSV(projectId: number) {
    const headers: HeadersInit = {};
    if (memoryToken) {
      headers["Authorization"] = `Bearer ${memoryToken}`;
    }
    const response = await fetch(`${BASE_URL}/reports/${projectId}/csv`, {
      credentials: "include",
      headers,
    });
    if (!response.ok) {
      throw new Error("CSV download failed. Please try again.");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reviewsense_project_${projectId}_export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  async downloadPDF(projectId: number) {
    const headers: HeadersInit = {};
    if (memoryToken) {
      headers["Authorization"] = `Bearer ${memoryToken}`;
    }
    const response = await fetch(`${BASE_URL}/reports/${projectId}/pdf`, {
      credentials: "include",
      headers,
    });
    if (!response.ok) {
      throw new Error("PDF download failed. Please try again.");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reviewsense_report_${projectId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
