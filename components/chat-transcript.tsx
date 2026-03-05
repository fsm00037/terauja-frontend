"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Search, Send, Sparkles, MessageSquare, Save, FileText, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"
import { getChatRecommendationsStream } from "@/lib/api"

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
  caseNumber?: string
  onSaveAndClose?: (messages: Message[], sessionNotes: string, sessionDescription: string) => void
  isOnline?: boolean
}

export function ChatTranscript({ patientId, caseNumber, onSaveAndClose, isOnline = false }: ChatTranscriptProps) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const [aiOptions, setAiOptions] = useState<(string | null)[]>([]) // null = still loading
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
  const streamControllerRef = useRef<AbortController | null>(null);

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

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
      }
    };
  }, []);

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

        setMessages(prev => {
          if (prev.some(m => m.id === fullMsg.id)) return prev;
          return [...prev, fullMsg];
        });

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

  const handleGetSuggestions = () => {
    // Cancelar stream anterior si existe
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }

    // Resetear estado
    setLoadingSuggestions(true);
    setAiOptions([null, null, null]); // 3 placeholders de carga
    setSelectedOption(null);
    setOriginalAiText(null);
    setIsAiUsed(false);
    setAiSuggestionLogId(null);

    const currentMessages = messages; // captura en closure

    const controller = getChatRecommendationsStream(
      currentMessages,
      Number(patientId),
      // onOption: llamado cuando llega cada respuesta de modelo
      (index, text) => {
        setAiOptions(prev => {
          const next = [...prev];
          // Aseguramos que haya espacio
          while (next.length <= index) next.push(null);
          next[index] = text;
          return next;
        });
      },
      // onDone: llamado cuando los 3 modelos han terminado
      (logId, _options) => {
        setAiSuggestionLogId(logId);
        setLoadingSuggestions(false);
        streamControllerRef.current = null;
      },
      // onError
      (err) => {
        console.error("Stream error:", err);
        setLoadingSuggestions(false);
        streamControllerRef.current = null;
      }
    );

    streamControllerRef.current = controller;
  }

  const handleSelectOption = (index: number) => {
    const opt = aiOptions[index];
    if (!opt) return; // Ignorar clic en placeholder de carga
    setSelectedOption(index);
    setCustomResponse(opt);
    setOriginalAiText(opt);
    setIsAiUsed(true);
  };

  const filteredMessages = messages.filter((msg) => msg.text.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col">
        <Card className="gap-0 py-0 rounded-2xl border-soft-gray shadow-soft flex flex-col h-full overflow-hidden">
          <CardHeader className="border-b bg-white z-10 !pb-4 pt-4 px-6 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-calm-teal/10 p-2.5 rounded-xl shadow-sm border border-calm-teal/20">
                  <MessageSquare className="h-6 w-6 text-calm-teal" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-neutral-charcoal tracking-tight">{t("currentChatSession")}</CardTitle>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`}></span>
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {isOnline ? t("online") : t("offline")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-48 sm:w-64 hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchMessages")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 rounded-full bg-gray-50 border-soft-gray focus:bg-white focus:border-calm-teal focus:ring-1 focus:ring-calm-teal transition-all text-sm shadow-inner"
                  />
                </div>
                <Button
                  onClick={handleSaveAndClose}
                  className="h-10 rounded-full bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md hover:shadow-lg transition-all px-5 font-medium"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t("saveAndCloseChat")}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 bg-white relative">
            <div className="h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto z-0 scroll-smooth custom-scrollbar">
              <div className="flex flex-col gap-6 px-4 pt-4 pb-0 sm:px-6 sm:pt-6 sm:pb-0 min-h-full">
                {filteredMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 flex-1 mt-12">
                    <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center border border-soft-gray">
                      <MessageSquare className="h-10 w-10 text-calm-teal/30" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No hay mensajes en esta sesión.</p>
                  </div>
                )}
                {filteredMessages.map((message) => {
                  const isPatient = message.sender === "patient";
                  return (
                    <div
                      key={message.id}
                      className={`flex w-full ${isPatient ? "justify-start" : "justify-end"}`}
                    >
                      <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${isPatient ? "flex-row" : "flex-row-reverse"}`}>
                        <Avatar className={`h-9 w-9 shrink-0 shadow-sm mt-1 ${isPatient ? "border-2 border-white" : "border-2 border-calm-teal/20"}`}>
                          <AvatarFallback className={`text-sm font-semibold ${isPatient ? "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600" : "bg-gradient-to-br from-calm-teal to-teal-600 text-white"}`}>
                            {isPatient ? "👤" : "👨‍⚕️"}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col min-w-0 ${isPatient ? "items-start" : "items-end"}`}>
                          <div className="flex items-center gap-2 mb-1.5 px-1 opacity-80">
                            <span className="text-xs font-semibold text-neutral-charcoal">
                              {isPatient ? `Paciente #${caseNumber || patientId}` : t("therapist")}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {new Date(message.timestamp + "Z").toLocaleTimeString("es-ES", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div
                            className={`px-4 py-3 rounded-2xl shadow-sm text-[15px] max-w-full overflow-hidden ${isPatient
                              ? "bg-white border border-soft-gray text-neutral-charcoal rounded-tl-sm ring-1 ring-gray-900/5"
                              : "bg-calm-teal text-white rounded-tr-sm ring-1 ring-calm-teal/5"
                              }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>
            </div>

            {/* AI Suggestions Panel */}
            <div className="bg-white/95 backdrop-blur-md border-t border-soft-lavender/30 px-4 py-3 shrink-0 transition-all z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-calm-teal uppercase tracking-wider bg-calm-teal/10 px-3 py-1.5 rounded-full border border-calm-teal/20 whitespace-nowrap">
                  <Sparkles className="h-3.5 w-3.5 text-calm-teal shrink-0" />
                  <span className="hidden sm:inline">{t("AIGeneratedResponseSuggestions") || "Sugerencias IA"}</span>
                  <span className="sm:hidden">IA</span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGetSuggestions}
                  disabled={loadingSuggestions}
                  className="h-8 text-xs font-semibold text-calm-teal hover:text-calm-teal/80 hover:bg-calm-teal/10 rounded-full px-4 border border-transparent hover:border-calm-teal/20 transition-all ml-auto whitespace-nowrap"
                >
                  {loadingSuggestions ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-calm-teal border-t-transparent rounded-full animate-spin"></span>
                      Generando...
                    </span>
                  ) : aiOptions.length > 0 ? "Regenerar" : "Generar"}
                </Button>
              </div>

              {aiOptions.length > 0 && (
                <div className="mt-4 flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {aiOptions.map((option, index) => (
                    option === null ? (
                      // Skeleton de carga para modelos pendientes
                      <div
                        key={index}
                        className="p-3 rounded-xl border border-soft-gray bg-gray-50 animate-pulse flex flex-col gap-2 shrink-0"
                      >
                        <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                        <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-calm-teal/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-calm-teal/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-calm-teal/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    ) : (
                      <div
                        key={index}
                        onClick={() => handleSelectOption(index)}
                        style={{
                          animation: "fadeSlideIn 0.7s ease-out both",
                        }}
                        className={`p-3 rounded-xl border text-sm cursor-pointer transition-all flex flex-col justify-between gap-2 shrink-0 ${selectedOption === index
                          ? "bg-calm-teal/10 border-calm-teal text-neutral-charcoal shadow-sm"
                          : "bg-white border-soft-gray hover:border-calm-teal/30 hover:bg-gray-50 text-gray-700 font-medium"
                          }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{option}</p>
                        {selectedOption === index && (
                          <span className="text-xs font-semibold text-calm-teal uppercase tracking-wider self-end mt-1">Seleccionada</span>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="px-4 py-3 bg-white border-t border-soft-gray shrink-0 z-10">
              <div className="relative flex items-end gap-2 bg-muted/20 border border-soft-gray focus-within:border-calm-teal focus-within:ring-2 focus-within:ring-calm-teal/20 transition-all rounded-xl p-1.5 px-2">
                <Textarea
                  placeholder={t("typeMessage")}
                  value={customResponse}
                  onChange={(e) => setCustomResponse(e.target.value)}
                  className="min-h-[48px] max-h-[140px] w-full resize-none border-0 bg-transparent focus-visible:ring-0 px-4 py-3.5 text-sm font-medium text-neutral-charcoal placeholder:text-muted-foreground"
                  disabled={isSending || loadingSuggestions}
                />
                <Button
                  onClick={() => sendMessage(customResponse)}
                  disabled={!customResponse.trim() || isSending || loadingSuggestions}
                  size="icon"
                  className={`h-10 w-10 shrink-0 rounded-lg transition-all duration-200 mb-0.5 ${customResponse.trim() && !isSending && !loadingSuggestions
                    ? "bg-calm-teal hover:bg-calm-teal/90 text-white shadow-sm hover:shadow-calm-teal/20"
                    : "bg-gray-200 text-gray-400 scale-100"
                    }`}
                >
                  {isSending ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4.5 w-4.5 translate-x-0.5" />
                  )}
                </Button>
              </div>
              <div className="flex justify-end items-center mt-1 px-2 text-[10px] h-3">
                {isSending && <span className="text-calm-teal animate-pulse font-semibold">Enviando mensaje...</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 hidden lg:flex lg:flex-col h-[calc(100vh-120px)] min-h-[600px] self-start sticky top-6">
        <Card className="gap-0 py-0 rounded-2xl border-soft-gray shadow-soft overflow-hidden group shrink-0 bg-white">
          <CardHeader className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 transition-colors group-hover:bg-calm-teal/5 !pb-4 pt-5 px-5">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2.5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200">
                <FileText className="h-5 w-5 text-calm-teal" />
              </div>
              <div>
                <CardTitle className="text-[17px] font-semibold text-neutral-charcoal">{t("sessionDescription")}</CardTitle>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest text-calm-teal/80">Título de la sesión</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <Input
              placeholder={t("enterSummaryDescription")}
              value={sessionDescription}
              onChange={(e) => setSessionDescription(e.target.value)}
              className="rounded-xl border-gray-200 hover:border-gray-300 focus:border-calm-teal focus:ring-2 focus:ring-calm-teal/20 bg-gray-50 transition-all font-medium text-neutral-charcoal h-12 shadow-sm focus:bg-white px-4 placeholder:text-gray-400 placeholder:font-normal"
            />
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 rounded-2xl border-soft-gray shadow-soft overflow-hidden group flex-1 flex flex-col min-h-0 bg-white">
          <CardHeader className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100 transition-colors group-hover:bg-calm-teal/5 !pb-4 pt-5 px-5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2.5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200">
                <MessageSquare className="h-5 w-5 text-calm-teal" />
              </div>
              <div>
                <CardTitle className="text-[17px] font-semibold text-neutral-charcoal">{t("sessionNotes")}</CardTitle>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest text-calm-teal/80">Apuntes Privados</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex flex-col flex-1 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 bg-calm-teal h-full rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Textarea
              placeholder={t("enterNotes")}
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="flex-1 w-full h-full rounded-none border-0 focus-visible:ring-0 resize-none p-5 text-[14px] leading-relaxed bg-gray-50/50 hover:bg-gray-50 focus:bg-white transition-colors custom-scrollbar font-medium text-neutral-charcoal placeholder:text-gray-400 placeholder:font-normal"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
