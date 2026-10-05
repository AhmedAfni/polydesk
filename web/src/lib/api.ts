import axios from 'axios'
import { clearToken, getToken } from './auth'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Request interceptor: attach Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: on 401, clear token and redirect to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
