import api from './api'
import type { Message, Ticket } from '../types/ticket'

export async function getTickets(): Promise<Ticket[]> {
  const response = await api.get<Ticket[]>('/tickets')
  return response.data
}

export async function getTicket(id: string): Promise<Ticket> {
  const response = await api.get<Ticket>(`/tickets/${id}`)
  return response.data
}

export interface TranslatedMessage extends Message {
  displayText: string
}

export interface TranslatedTicket extends Omit<Ticket, 'messages'> {
  messages: TranslatedMessage[]
}

export async function getTranslatedTicket(id: string, lang: string): Promise<TranslatedTicket> {
  const response = await api.get<TranslatedTicket>(`/tickets/${id}/translated`, {
    params: { lang },
  })
  return response.data
}

export async function replyToTicket(id: string, message: string, sourceLanguage?: string): Promise<Message> {
  const response = await api.post<Message>(`/tickets/${id}/reply`, { message, sourceLanguage })
  return response.data
}

export interface AgentProfile {
  id: string
  name: string
  email: string
  role: string
  preferredLanguage: string
  createdAt: string
}

export async function getMe(): Promise<AgentProfile> {
  const response = await api.get<AgentProfile>('/auth/me')
  return response.data
}

export async function updateMyLanguage(preferredLanguage: string): Promise<AgentProfile> {
  const response = await api.patch<AgentProfile>('/auth/me', { preferredLanguage })
  return response.data
}

export interface AiLog {
  id: string
  task: string
  model: string
  success: boolean
  latencyMs: number
  error: string | null
  createdAt: string
}

export interface AiLogsResponse {
  stats: {
    totalCalls: number
    successRate: number
    avgLatencyMs: number
    byTask: Record<string, number>
    byModel: Record<string, number>
  }
  totalCalls: number
  successRate: number
  avgLatencyMs: number
  byTask: Record<string, number>
  byModel: Record<string, number>
  logs: AiLog[]
}

export async function getAiLogs(): Promise<AiLogsResponse> {
  const response = await api.get<AiLogsResponse>('/admin/ai-logs')
  return response.data
}

