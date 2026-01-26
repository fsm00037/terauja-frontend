"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Clock, Sparkles, X } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"

interface Message {
  id: string
  text: string
  sender: "patient" | "therapist"
  timestamp: Date
}

export default function PatientChatPage() {
  const params = useParams()
  const patientId = params.patientId as string
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { t } = useLanguage()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadMessages = async () => {
    try {
      const data = await api.getMessages(patientId);
      const mapped: Message[] = data.map(m => ({
        id: m.id.toString(),
        text: m.content,
        sender: m.is_from_patient ? "patient" : "therapist",
        timestamp: new Date(m.created_at)
      }));
      setMessages(mapped);
    } catch (error) {
      console.error("Failed to load messages", error);
    }
  }

  useEffect(() => {
    loadMessages()
    // Optional: Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [patientId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    try {
      // Send as Therapist (isFromPatient = false)
      const newMsg = await api.sendMessage(patientId, inputMessage, false);
      if (newMsg) {
        setInputMessage("")
        setSuggestions([]) // Clear suggestions on send
        loadMessages(); // Refresh to see sent message with server timestamp
      }
    } catch (error) {
      console.error("Failed to send message", error);
    }
  }

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const result = await api.getChatRecommendations(messages)
      setSuggestions(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const applySuggestion = (text: string) => {
    setInputMessage(text)
    setSuggestions([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-blue via-soft-lavender to-soft-pink p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Card className="rounded-2xl border-0 shadow-xl overflow-hidden">
          <CardHeader className="bg-white border-b border-soft-gray p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-calm-teal/10 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-calm-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-neutral-charcoal">TheraBot Support</h1>
                <p className="text-sm text-muted-foreground">Chat con Paciente</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-calm-teal/10">
                <div className="w-2 h-2 rounded-full bg-calm-teal animate-pulse" />
                <span className="text-sm font-medium text-calm-teal">Online</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-muted/20">
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground py-10">No hay mensajes aún.</p>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender === "therapist" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className={`h-10 w-10 ${message.sender === "therapist" ? "bg-calm-teal/10" : "bg-soft-peach/10"}`}>
                    <AvatarFallback className={message.sender === "therapist" ? "text-calm-teal" : "text-soft-peach"}>
                      {message.sender === "therapist" ? "TB" : "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex flex-col ${message.sender === "therapist" ? "items-end" : "items-start"} max-w-[70%]`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 ${message.sender === "therapist"
                        ? "bg-calm-teal text-white"
                        : "bg-white border border-soft-gray text-neutral-charcoal"
                        } shadow-sm`}
                    >
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-white border-t border-soft-gray">
              {loadingSuggestions && (
                <div className="flex items-center gap-2 pb-4 text-calm-teal text-sm animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  <span>Cargando recomendación IA...</span>
                </div>
              )}
              {suggestions.length > 0 && !loadingSuggestions && (
                <div className="flex flex-wrap gap-2 pb-4">
                  {suggestions.map((s, i) => (
                    <div key={i} onClick={() => applySuggestion(s)} className="cursor-pointer bg-calm-teal/10 text-calm-teal px-3 py-1 rounded-full text-sm hover:bg-calm-teal/20 transition-colors border border-calm-teal/20">
                      {s}
                    </div>
                  ))}
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setSuggestions([])}><X className="h-3 w-3" /></Button>
                </div>
              )}
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetSuggestions}
                  disabled={loadingSuggestions}
                  className="text-calm-teal border-calm-teal hover:bg-calm-teal/10 gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loadingSuggestions ? "Analizando..." : "Sugerencias IA"}
                </Button>
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={t("typeYourMessage")}
                  className="flex-1 h-12 rounded-xl border-soft-gray focus:border-calm-teal focus:ring-calm-teal"
                />
                <Button
                  type="submit"
                  className="h-12 px-6 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {t("confidentialSpace")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
