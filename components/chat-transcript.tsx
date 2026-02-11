"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Search, Send, Sparkles, MessageSquare, Save, FileText, X } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"

interface Message {
  id: string
  text: string
  sender: "patient" | "therapist"
  timestamp: string
  was_edited_by_human?: boolean;
  ai_suggestion_log_id?: number | null;
}

interface ChatTranscriptProps {
  patientId: string
  onSaveAndClose?: (messages: Message[], sessionNotes: string, sessionDescription: string) => void
  isOnline?: boolean
}

export function ChatTranscript({ patientId, onSaveAndClose, isOnline = false }: ChatTranscriptProps) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const [aiOptions, setAiOptions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [customResponse, setCustomResponse] = useState("")
  const [selectedOption, setSelectedOption] = useState<number | null>(null)

  const [sessionNotes, setSessionNotes] = useState("")
  const [sessionDescription, setSessionDescription] = useState("")
  const endRef = useRef<HTMLDivElement>(null)

  const [aiSuggestionLogId, setAiSuggestionLogId] = useState<number | null>(null);
  const [originalAiText, setOriginalAiText] = useState<string | null>(null);
  const [isAiUsed, setIsAiUsed] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Optimize: Only update state if messages have actually changed
  const loadMessages = async () => {
    try {
      const data = await api.getMessages(patientId);
      const mapped: Message[] = data.map(m => ({
        id: m.id.toString(),
        text: m.content,
        sender: m.is_from_patient ? "patient" : "therapist",
        timestamp: m.created_at,
        was_edited_by_human: m.was_edited_by_human,
        ai_suggestion_log_id: m.ai_suggestion_log_id
      }));
      setMessages(prev => {
        if (prev.length !== mapped.length) return mapped;
        if (prev.length > 0 && mapped.length > 0 && prev[prev.length - 1].id !== mapped[mapped.length - 1].id) return mapped;

        const isDifferent = JSON.stringify(prev) !== JSON.stringify(mapped);
        return isDifferent ? mapped : prev;
      });
    } catch (error) {
      console.error("Failed to load messages", error);
    }
  }

  useEffect(() => {
    loadMessages();
    // Mark as read immediately when opening
    api.markMessagesAsRead(patientId);

    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [patientId])

  // Only scroll to bottom on initial load or when new messages arrive
  const prevMessagesLength = useRef(0);

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);


  // Track the last processed message ID to prevent duplicate triggers
  const lastProcessedMessageId = useRef<string | null>(null);

  useEffect(() => {
    // Check if we have messages
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // Check if the last message is from the patient and hasn't been processed yet
    if (lastMessage.sender === "patient" && lastMessage.id !== lastProcessedMessageId.current) {
      lastProcessedMessageId.current = lastMessage.id;
      handleGetSuggestions();
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;

    setIsSending(true);
    try {
      // If AI suggestions were available (aiSuggestionLogId is set), we track it.
      // was_edited_by_human is true if we either edited a suggestion OR ignored them for a custom message.
      const wasEdited = isAiUsed
        ? text.trim() !== originalAiText?.trim()
        : (aiSuggestionLogId !== null);

      const payload = {
        patient_id: patientId,
        content: text.trim(),
        is_from_patient: false,
        ai_suggestion_log_id: aiSuggestionLogId,
        selected_option: isAiUsed && selectedOption !== null ? selectedOption + 1 : null,
        was_edited_by_human: wasEdited,
      };

      const newMsg = await api.sendMessage(payload);

      if (newMsg) {
        const fullMsg: Message = {
          id: newMsg.id.toString(),
          text: newMsg.content,
          sender: "therapist",
          timestamp: newMsg.created_at,
          was_edited_by_human: newMsg.was_edited_by_human,
          ai_suggestion_log_id: newMsg.ai_suggestion_log_id
        };

        setMessages(prev => [...prev, fullMsg]);

        // Reset de estados
        setCustomResponse("");
        setSelectedOption(null);
        setAiOptions([]);
        setAiSuggestionLogId(null);
        setOriginalAiText(null);
        setIsAiUsed(false);
      }
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  }

  const handleSaveAndClose = () => {
    if (onSaveAndClose) {
      const sessionSnapshot = messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp,
        was_edited_by_human: msg.was_edited_by_human ?? false,
        ai_suggestion_log_id: msg.ai_suggestion_log_id ?? null
      }));
      console.log("Session snapshot:", sessionSnapshot);
      onSaveAndClose(sessionSnapshot, sessionNotes, sessionDescription);

      // Limpieza de estados
      setMessages([]);
      setSessionNotes("");
      setSessionDescription("");
      setCustomResponse("");
      setSelectedOption(null);
      setAiOptions([]);
    }
  }

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      // Pasamos el patientId (asegúrate de que sea número)
      const result = await api.getChatRecommendations(messages, Number(patientId));

      if (result) {
        setAiOptions(result.recommendations);
        setAiSuggestionLogId(result.ai_suggestion_log_id); // Guardamos el ID para el log posterior
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
    setCustomResponse(aiOptions[index]);
    setOriginalAiText(aiOptions[index]);
    setIsAiUsed(true);
  };

  const filteredMessages = messages.filter((msg) => msg.text.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card className="rounded-2xl border-soft-gray shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-neutral-charcoal">{t("currentChatSession")}</CardTitle>
                <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${isOnline
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                  {isOnline ? t("online") : t("offline")}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchMessages")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl border-soft-gray"
                  />
                </div>
                <Button
                  onClick={handleSaveAndClose}
                  className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t("saveAndCloseChat")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-y-auto mb-6 pr-2">
              <div className="space-y-4">
                {filteredMessages.length === 0 && (
                  <div className="text-center text-muted-foreground py-10">No hay mensajes.</div>
                )}
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 p-4 rounded-xl ${message.sender === "patient" ? "bg-[#fce2e2]" : "bg-[#EBF5FF]"}`}
                  >
                    <Avatar
                      className={`h-14 w-14 ${message.sender === "patient" ? "bg-white" : "bg-white"}`}
                    >
                      <AvatarFallback className={`text-2xl ${message.sender === "patient" ? "text-[#3B82F6]" : "text-[#1D4ED8]"}`}>
                        {message.sender === "patient" ? "👤" : "👨‍⚕️"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-neutral-charcoal">
                            {message.sender === "patient" ? t("patient") : t("therapist")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(message.timestamp + "Z").toLocaleString("es-ES", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-charcoal leading-relaxed">{message.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-charcoal">
                  <Sparkles className="h-4 w-4 text-soft-lavender" />
                  🤖 {t("AIGeneratedResponseSuggestions") || "Sugerencias IA"}
                </div>
                <Button variant="ghost" size="sm" onClick={handleGetSuggestions} disabled={loadingSuggestions} className="text-calm-teal text-xs">
                  {loadingSuggestions ? "Cargando..." : "Generar Nuevas"}
                </Button>
              </div>

              {loadingSuggestions && (
                <div className="flex items-center gap-2 pb-4 text-calm-teal text-sm animate-pulse justify-center">
                  <Sparkles className="w-4 h-4" />
                  <span>Cargando recomendación IA...</span>
                </div>
              )}

              {aiOptions.length > 0 && !loadingSuggestions && (
                <div className="space-y-2 relative">
                  <Button variant="ghost" size="icon" className="absolute -top-8 right-0 h-6 w-6 rounded-full" onClick={() => setAiOptions([])}><X className="h-3 w-3" /></Button>
                  {aiOptions.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)} // <--- CAMBIA ESTO (antes tenías lógica manual aquí)
                      className={`w-full text-left p-4 rounded-xl border transition-all ${selectedOption === idx
                        ? "border-soft-lavender bg-soft-lavender text-neutral-charcoal font-medium shadow-sm"
                        : "border-soft-gray hover:border-soft-lavender/50 hover:bg-muted/30"
                        }`}
                    >
                      <p className="text-sm leading-relaxed text-neutral-charcoal">{option}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 mt-4">
              <label className="text-sm font-medium text-neutral-charcoal">{t("customResponse")}</label>
              <Textarea
                placeholder={t("typeMessage")}
                value={customResponse}
                onChange={(e) => setCustomResponse(e.target.value)}
                className="min-h-[100px] rounded-xl border-soft-gray resize-none"
                disabled={isSending}
              />
            </div>

            <Button
              onClick={() => sendMessage(customResponse)}
              disabled={!customResponse.trim() || isSending}
              className="w-full rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md"
            >
              {isSending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  {t("sending") || "Enviando..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("sendMessage")}
                </>
              )}
            </Button>

          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="rounded-2xl border-soft-gray shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-soft-lavender" />
              <CardTitle className="text-neutral-charcoal">{t("sessionDescription")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Input
              placeholder={t("enterSummaryDescription")}
              value={sessionDescription}
              onChange={(e) => setSessionDescription(e.target.value)}
              className="rounded-xl border-soft-gray"
            />
            <p className="text-xs text-muted-foreground mt-2">{t("enterSummaryNotes")}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-soft-gray shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-soft-lavender" />
              <CardTitle className="text-neutral-charcoal">{t("sessionNotes")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={t("enterNotes")}
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="min-h-[250px] rounded-xl border-soft-gray resize-none"
            />
            <p className="text-xs text-muted-foreground mt-3">
              {t("enterNotesNotes")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div >
  )
}
