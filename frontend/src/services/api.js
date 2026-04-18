import axios from 'axios';

const api = axios.create({
  // Uses the .env file instead of hardcoding
  baseURL: import.meta.env.VITE_API_URL,
  // [ADDITION: Added Axios timeout to prevent hanging demos]
  timeout: 8000
});

// Request Interceptor: Attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle Expired Tokens Gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login'; // Force logout if token is invalid
    }
    return Promise.reject(error);
  }
);

export default api;