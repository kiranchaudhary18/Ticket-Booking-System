import axios, { InternalAxiosRequestConfig } from "axios";
import { API_URL, ENDPOINTS } from "@/lib/api";
import { tokenStorage } from "@/lib/token";

// Create a reusable Axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Access Token if available
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && token !== "undefined" && token !== "null" && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized (Token Expiration)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401, we haven't retried yet, and it's not the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== ENDPOINTS.AUTH.REFRESH
    ) {
      const currentToken = tokenStorage.getAccessToken();
      const hasValidToken = currentToken && currentToken !== "undefined" && currentToken !== "null";

      if (hasValidToken) {
        originalRequest._retry = true;
        const refreshToken = tokenStorage.getRefreshToken();

        if (refreshToken) {
          try {
            // Attempt to get a new access token
            const refreshResponse = await axios.post<{ access: string }>(
              `${API_URL}${ENDPOINTS.AUTH.REFRESH}`,
              { refresh: refreshToken }
            );

            const { access } = refreshResponse.data;
            
            // Save the new access token
            tokenStorage.setTokens(access, refreshToken);

            // Retry the original request with the new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access}`;
            }
            return apiClient(originalRequest);
          } catch (refreshError) {
            // Refresh token is expired or invalid
            tokenStorage.clearTokens();
            // Optionally trigger a custom event here to log the user out across tabs
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("auth:logout", { detail: { expired: true } }));
            }
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token available, clear any remaining auth state
          tokenStorage.clearTokens();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("auth:logout", { detail: { expired: true } }));
          }
        }
      }
    }

    // Standardize error handling
    let userFriendlyMessage = "An unexpected error occurred. Please try again later.";
    const statusCode = error.response?.status;
    const errorData = error.response?.data;

    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      userFriendlyMessage = "The request timed out. Please try again.";
    } else if (!error.response) {
      userFriendlyMessage = "Network error. Please check your internet connection.";
    } else {
      switch (statusCode) {
        case 400:
        case 422:
          // For 400, preserve the field errors for components to use, but set a fallback detail
          if (errorData && typeof errorData === 'object' && !Array.isArray(errorData)) {
            if (errorData.detail) {
              userFriendlyMessage = errorData.detail;
            } else if (errorData.non_field_errors) {
              userFriendlyMessage = errorData.non_field_errors[0];
            } else {
              // Extract the first field error if available
              const firstKey = Object.keys(errorData)[0];
              if (firstKey && Array.isArray(errorData[firstKey])) {
                userFriendlyMessage = errorData[firstKey][0];
              } else {
                userFriendlyMessage = "Please check the information you entered and try again.";
              }
            }
          } else {
            userFriendlyMessage = "Invalid request provided.";
          }
          break;
        case 401:
          const currentToken = tokenStorage.getAccessToken();
          const hasValidToken = currentToken && currentToken !== "undefined" && currentToken !== "null";
          userFriendlyMessage = hasValidToken ? "Your session has expired. Please log in again." : "Authentication required. Please log in.";
          break;
        case 403:
          userFriendlyMessage = "You do not have permission to perform this action.";
          break;
        case 404:
          userFriendlyMessage = "The requested resource could not be found.";
          break;
        case 409:
          userFriendlyMessage = "A conflict occurred with the current state of the resource.";
          if (errorData?.detail) userFriendlyMessage = errorData.detail;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          userFriendlyMessage = "Our servers are currently experiencing issues. Please try again later.";
          // Crucial: Delete raw Django HTML stack traces from response to prevent UI leakage
          error.response.data = { detail: userFriendlyMessage };
          break;
        default:
          if (errorData?.detail) {
            userFriendlyMessage = errorData.detail;
          }
          break;
      }
    }

    error.message = userFriendlyMessage;
    
    // Ensure .detail exists so existing components that read err.response.data.detail get the safe message
    if (error.response && typeof error.response.data === 'object') {
       if (!error.response.data.detail) {
           error.response.data.detail = userFriendlyMessage;
       }
    } else if (error.response) {
       error.response.data = { detail: userFriendlyMessage };
    }

    return Promise.reject(error);
  }
);
