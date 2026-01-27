"use client"

import { useState, useEffect, useMemo, useCallback, ChangeEvent } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Calendar,
  FileText,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Bold,
  Italic,
  BarChart2,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  Clock,
  Activity,
  Heart,
  Brain,
  Smile,
  Zap,
  Moon,
  Sun,
  Flame,
  Star,
  FileQuestion,
} from "lucide-react"
import { ChatTranscript } from "@/components/chat-transcript"
import { useLanguage } from "@/contexts/language-context"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import * as api from "@/lib/api"
import type { AssessmentStat as ApiAssessmentStat } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

const NOTE_COLORS = [
  { value: "bg-white", label: "White" },
  { value: "bg-soft-peach", label: "Peach" },
  { value: "bg-soft-lavender", label: "Lavender" },
  { value: "bg-calm-teal/20", label: "Mint" },
  { value: "bg-amber-100", label: "Yellow" },
]

// Available Icons for Questionnaires
const AVAILABLE_ICONS = [
  { name: "Activity", icon: Activity },
  { name: "Heart", icon: Heart },
  { name: "Brain", icon: Brain },
  { name: "Smile", icon: Smile },
  { name: "Zap", icon: Zap },
  { name: "Moon", icon: Moon },
  { name: "Sun", icon: Sun },
  { name: "Flame", icon: Flame },
  { name: "Star", icon: Star },
  { name: "FileQuestion", icon: FileQuestion },
]

interface Session extends api.Session { }

export default function PatientStatisticsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const patientId = params.id as string
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  /* Removed mock data initialization */
  const [activeTab, setActiveTab] = useState<"assessment" | "sessions" | "chat" | "notes" | "questionnaires">("assessment")

  // --- Questionnaires History State ---
  interface AnsweredQuestionnaire {
    id: string
    questionnaireTitle: string
    icon: string
    date: string
    rawDate: Date
    time: string
    answers: {
      questionText: string
      answer: string | number
      type?: "likert" | "scale" | "frequency" | "openText"
      options?: string[]
      maxValue?: number
    }[]
    readByTherapist: boolean
  }

  const [questionnaireHistory, setQuestionnaireHistory] = useState<AnsweredQuestionnaire[]>([])
  const [questionnaireFilter, setQuestionnaireFilter] = useState<string>("all")

  // Compute unique titles for filter
  const uniqueQuestionnaires = Array.from(new Set(questionnaireHistory.map(q => q.questionnaireTitle)))

  useEffect(() => {
    if (patientId) {
      api.getQuestionnaireCompletions(patientId).then((completions) => {
        // Filter for completed completions with answers
        const completed = completions.filter(c => c.status === 'completed' && c.answers && c.answers.length > 0)

        const history: AnsweredQuestionnaire[] = completed.map(c => ({
          id: c.id,
          questionnaireTitle: c.questionnaire?.title || "Cuestionario",
          icon: c.questionnaire?.icon || "FileQuestion",
          date: c.completedAt ? new Date(c.completedAt + "Z").toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "Fecha desconocida",
          rawDate: c.completedAt ? new Date(c.completedAt + "Z") : new Date(),
          time: c.completedAt ? new Date(c.completedAt + "Z").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--",
          answers: (c.answers || []).map((ans: any, idx: number) => {
            return {
              questionText: ans.question_text || ans.questionId || "Pregunta",
              answer: ans.value || ans.answer, // Check both value and answer keys
              type: ans.type || "openText",
              options: ans.options || [],
              maxValue: ans.max_value || 5
            }
          }),
          readByTherapist: (c as any).read_by_therapist || false
        }))
        setQuestionnaireHistory(history)
      })
    }
  }, [patientId])

  const [expandedQuestionnaireId, setExpandedQuestionnaireId] = useState<string | null>(null)

  const toggleQuestionnaireDetails = async (id: string) => {
    if (expandedQuestionnaireId === id) {
      setExpandedQuestionnaireId(null)
    } else {
      setExpandedQuestionnaireId(id)

      // Find the questionnaire in history
      const q = questionnaireHistory.find(item => item.id === id)
      if (q && !q.readByTherapist) {
        const success = await api.markQuestionnaireAsRead(id)
        if (success) {
          // Update local state to reflect it's read
          setQuestionnaireHistory(prev => prev.map(item =>
            item.id === id ? { ...item, readByTherapist: true } : item
          ))
        }
      }
    }
  }

  // --- Assessment Stats State ---
  type AssessmentStat = Omit<ApiAssessmentStat, "patient_id" | "created_at" | "updated_at">

  const [assessmentStats, setAssessmentStats] = useState<AssessmentStat[]>([])


  const [isStatDialogOpen, setIsStatDialogOpen] = useState(false)
  const [editingStat, setEditingStat] = useState<AssessmentStat | null>(null)
  const [statFormData, setStatFormData] = useState<Omit<AssessmentStat, "id">>({
    label: "",
    value: "",
    status: "mild",
    color: "teal",
  })

  // --- Clinical Summary State ---
  const [clinicalSummary, setClinicalSummary] = useState(
    "El paciente ha estado sintiendo ansiedad por el trabajo recientemente."
  )
  const [isEditingSummary, setIsEditingSummary] = useState(false)
  const [editedSummary, setEditedSummary] = useState("")

  // --- Notes State ---
  const [patientNotes, setPatientNotes] = useState<api.Note[]>([])

  const [sessions, setSessions] = useState<api.Session[]>([])
  const [patient, setPatient] = useState<api.Patient | null>(null)

  useEffect(() => {
    if (patientId) {
      // Load Notes
      api.getNotes(patientId).then(notes => setPatientNotes(notes))
      // Load Sessions
      api.getSessions(patientId).then(sessions => setSessions(sessions))
      // Load Patient Info and verify access
      api.getPatients().then(patients => {
        const found = patients.find(p => p.id === patientId)
        if (found) {
          // User has access to this patient (API already filters by psychologist)
          setPatient(found)
          setClinicalSummary(found.clinical_summary || "")
        } else {
          // Patient not in the list - user doesn't have access
          // Redirect back to dashboard with error
          toast({
            title: "Acceso denegado",
            description: "No tienes acceso a este paciente",
            variant: "destructive",
          })
          router.push("/dashboard")
        }
      }).catch(() => {
        // API error (likely 403) - redirect
        router.push("/dashboard")
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  useEffect(() => {
    const openChat = searchParams.get('openChat') === 'true'
    const tab = searchParams.get('tab')

    if (openChat) {
      setActiveTab('chat')
    } else if (tab === 'questionnaires') {
      setActiveTab('questionnaires')
    }
  }, [searchParams])

  // Load assessment stats
  useEffect(() => {
    if (patientId) {
      api.getAssessmentStats(patientId).then(stats => {
        setAssessmentStats(stats.map(s => ({
          id: s.id,
          label: s.label,
          value: s.value,
          status: s.status,
          color: s.color
        })))
      })
    }
  }, [patientId])

  // ... (rest of the state from lines 129 onwards is unchanged, but I need to make sure I don't break the file structure)
  // I will just replace the useEffect block and verify the header part separately or in same tool call? 
  // I can't do non-contiguous edits easily without multi-replace, but here the edit is contiguous for the useEffect.
  // The header is further down.

  // Let's do the state and effect first.

  // Wait, I need to check where `useEffect` is.
  // It is lines 120-127.
  // Header is line 382.

  // I'll use multi_replace.


  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [newNoteContent, setNewNoteContent] = useState("")
  const [newNoteColor, setNewNoteColor] = useState("bg-white")

  const [isPatientOnline, setIsPatientOnline] = useState(false)

  // Poll for patient status
  useEffect(() => {
    if (!patientId) return

    const checkStatus = async () => {
      try {
        const patients = await api.getPatients()
        const p = patients.find(p => p.id === patientId)
        if (p) setIsPatientOnline(p.isOnline || false)
      } catch (e) { console.error("Error polling status", e) }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // 30s polling
    return () => clearInterval(interval)
  }, [patientId])

  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null)
  const [chatNotes, setChatNotes] = useState("")
  const [chatDescription, setChatDescription] = useState("")
  const [isSavingChatNotes, setIsSavingChatNotes] = useState(false)

  useEffect(() => {
    if (viewingSessionId) {
      const session = sessions.find(s => s.id === viewingSessionId)
      if (session) {
        setChatNotes(session.notes || "")
        setChatDescription(session.description || "")
      }
    }
  }, [viewingSessionId, sessions])

  const [activeMetric, setActiveMetric] = useState<"messages" | "responseTime" | "therapistMessages" | "duration" | "totalMessages">("messages")

  const metrics = [
    { id: "messages" as const, label: "patientMessages", dataKey: "messages", color: "#3B82F6", icon: MessageSquare },
    { id: "therapistMessages" as const, label: "therapistMessages", dataKey: "therapistMessages", color: "#6366F1", icon: MessageSquare },
    { id: "responseTime" as const, label: "avgResponseTime", dataKey: "responseTime", color: "#10B981", icon: Clock },
    { id: "duration" as const, label: "sessionDuration", dataKey: "duration", color: "#F59E0B", icon: Calendar },
    { id: "totalMessages" as const, label: "totalWords", dataKey: "totalMessages", color: "#EF4444", icon: BarChart2 },
  ]

  const [statsSessionId, setStatsSessionId] = useState<string | null>(null)
  const [showGeneralStats, setShowGeneralStats] = useState(false)

  const calculateStats = (session: Session) => {
    const patientMsgs = session.chatHistory.filter(m => m.sender === "patient")
    const therapistMsgs = session.chatHistory.filter(m => m.sender === "therapist")

    const patientWords = patientMsgs.reduce((acc, curr) => acc + (curr.text?.split(/\s+/).length || 0), 0)
    const therapistWords = therapistMsgs.reduce((acc, curr) => acc + (curr.text?.split(/\s+/).length || 0), 0)
    const totalWords = patientWords + therapistWords

    // Función auxiliar para parsear el formato "DD/MM/YYYY, HH:MM:SS"
    const parseTimestamp = (ts: string) => {
      try {
        if (!ts.includes(',')) return new Date(ts).getTime(); // ISO fallback
        const [datePart, timePart] = ts.split(', ');
        const [day, month, year] = datePart.split('/').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
      } catch (e) {
        return NaN;
      }
    };

    let duration = 0
    if (session.chatHistory.length > 1) {
      const start = parseTimestamp(session.chatHistory[0].timestamp)
      const end = parseTimestamp(session.chatHistory[session.chatHistory.length - 1].timestamp)
      if (!isNaN(start) && !isNaN(end)) {
        duration = Math.round((end - start) / (1000 * 60))
      }
    }

    // --- Cálculo del Tiempo de Respuesta Promedio ---
    let totalResponseTimeMs = 0
    let responseCount = 0

    for (let i = 1; i < session.chatHistory.length; i++) {
      const current = session.chatHistory[i]
      const previous = session.chatHistory[i - 1]

      // Solo calculamos si el paciente responde a un mensaje previo del terapeuta
      if (current.sender === "patient" && previous.sender === "therapist") {
        const currTime = parseTimestamp(current.timestamp)
        const prevTime = parseTimestamp(previous.timestamp)

        if (!isNaN(currTime) && !isNaN(prevTime)) {
          const diff = currTime - prevTime

          // Filtro de seguridad: Si la respuesta tarda más de 2 horas, 
          // probablemente no es una respuesta directa en la conversación activa.
          if (diff > 0 && diff < 1000 * 60 * 120) {
            totalResponseTimeMs += diff
            responseCount++
          }
        }
      }
    }

    // Convertimos a segundos para una lectura más fácil en las gráficas
    const avgResponseSeconds = responseCount > 0
      ? Math.round((totalResponseTimeMs / responseCount) / 1000)
      : 0

    return {
      patientCount: patientMsgs.length,
      therapistCount: therapistMsgs.length,
      patientWords,
      therapistWords,
      totalWords,
      duration: duration || parseInt(session.duration) || 0,
      avgResponseSeconds
    }
  }

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    if (!auth) {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
    }
  }, [router])



  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  // --- Note Handlers ---
  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !newNoteTitle.trim()) return

    if (editingNoteId) {
      setPatientNotes(patientNotes.map(note =>
        note.id === editingNoteId
          ? { ...note, title: newNoteTitle, content: newNoteContent, color: newNoteColor, date: new Date().toISOString().split("T")[0] }
          : note
      ))
      setEditingNoteId(null)
    } else {
      if (newNoteTitle && newNoteContent) {
        const newNote = await api.createNote(patientId, newNoteTitle, newNoteContent, newNoteColor)
        if (newNote) {
          setPatientNotes([newNote, ...patientNotes])
        }
      }
    }

    setNewNoteTitle("")
    setNewNoteContent("")
    setNewNoteColor("bg-white")
    // There is no setIsNoteDialogOpen in the current scope based on previous failed edits or view.
    // Assuming logic was intended to close a dialog that might not exist or variable name is wrong.
    // Let's remove the unknown setter if it wasn't defined, or check if 'setIsStatDialogOpen' was meant.
    // Looking at line 120, 'isStatDialogOpen' exists. Line 136 shows notes state but no dialog state shown in snippets.
    // However, I previously tried to replace 'setIsNoteDialogOpen(false)'.
    // If it doesn't exist, I should remove it.
  }

  const handleEditNote = (note: api.Note) => {
    setEditingNoteId(note.id)
    setNewNoteTitle(note.title)
    setNewNoteContent(note.content)
    setNewNoteColor(note.color)

    const editor = document.getElementById("note-editor")
    if (editor) editor.innerHTML = note.content
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setNewNoteTitle("")
    setNewNoteContent("")
    setNewNoteColor("bg-white")

    const editor = document.getElementById("note-editor")
    if (editor) editor.innerHTML = ""
  }

  const handleDeleteNote = (noteId: string) => {
    setPatientNotes(patientNotes.filter((note) => note.id !== noteId))
  }

  const execCommand = (command: string) => {
    document.execCommand(command, false)
  }

  // --- Session Handlers ---
  const handleSaveAndCloseChat = async (messages: any[], notes: string, description: string) => {

    try {
      const parseDate = (dateStr?: string) => {
        if (!dateStr) return null;

        const time = new Date(dateStr).getTime();
        return isNaN(time) ? null : time;
      };

      const chatSnapshot = messages.map(m => ({
        text: m.text,
        sender: m.sender,
        timestamp: m.timestamp,
        was_edited_by_human: m.was_edited_by_human ?? false,
        ai_suggestion_log_id: m.ai_suggestion_log_id ?? null
      }));

      let durationStr = "1 min";
      console.log("TIMESTAMPS:", chatSnapshot.map(m => m.timestamp))

      if (chatSnapshot.length >= 2) {
        const firstMsgTime = parseDate(chatSnapshot[0].timestamp);
        const lastMsgTime = parseDate(chatSnapshot[chatSnapshot.length - 1].timestamp);

        if (firstMsgTime && lastMsgTime) {
          const diffInMs = lastMsgTime - firstMsgTime;
          // Usamos Math.floor para minutos completos o Math.round para el más cercano
          const diffInMinutes = Math.floor(diffInMs / 60000);

          // Si la diferencia es de 3 minutos como en tu ejemplo, pondrá 3.
          durationStr = `${diffInMinutes > 0 ? diffInMinutes : 1} min`;
        }
      }
      console.log("Duracion------------------------------" + String(durationStr))
      const payload = {
        patient_id: patientId,
        duration: durationStr,
        description: description || "Sesión de Chat",
        notes: notes || "Sin notas adicionales",
        chatHistory: chatSnapshot // Tu api.ts lo convertirá a chat_snapshot
      };

      const newSession = await api.createSession(payload)

      if (newSession) {
        await api.clearChat(patientId)
        setSessions([newSession, ...sessions])
        setActiveTab("sessions")
        toast({
          title: t("success") || "Éxito",
          description: t("sessionSavedSuccessfully") || "Sesión guardada correctamente",
        })
      } else {
        toast({
          title: t("error") || "Error",
          description: t("errorSavingSession") || "Error al guardar la sesión",
          variant: "destructive",
        })
      }
    } catch (e) {
      console.error(e)
      toast({
        title: t("error") || "Error",
        description: "Error inesperado al guardar la sesión",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm(t("confirmDeleteSession") || "Are you sure you want to delete this session?")) return

    try {
      const success = await api.deleteSession(sessionId)
      if (success) {
        setSessions(sessions.filter(s => s.id !== sessionId))
        toast({
          title: t("success") || "Success",
          description: t("sessionDeleted") || "Session deleted successfully",
        })
      } else {
        toast({
          title: t("error") || "Error",
          description: t("errorDeletingSession") || "Failed to delete session",
          variant: "destructive",
        })
      }
    } catch (e) {
      console.error(e)
      toast({
        title: t("error") || "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleSaveSessionDetails = async () => {
    if (!viewingSessionId) return
    setIsSavingChatNotes(true)
    try {
      const updated = await api.updateSession(viewingSessionId, {
        notes: chatNotes,
        description: chatDescription
      })
      if (updated) {
        setSessions(sessions.map(s => s.id === viewingSessionId ? updated : s))
        toast({ title: t("success"), description: t("sessionUpdated") || "Sesión actualizada" })
      }
    } catch (e) {
      toast({
        title: t("error"),
        description: t("errorSavingSession") || "Error al guardar la sesión",
        variant: "destructive"
      })
    } finally {
      setIsSavingChatNotes(false)
    }
  }

  // --- Assessment Stat Handlers ---
  const handleOpenStatDialog = (stat?: AssessmentStat) => {
    if (stat) {
      setEditingStat(stat)
      setStatFormData({
        label: stat.label,
        value: stat.value,
        status: stat.status,
        color: stat.color,
      })
    } else {
      setEditingStat(null)
      setStatFormData({
        label: "",
        value: "",
        status: "mild",
        color: "teal",
      })
    }
    setIsStatDialogOpen(true)
  }

  const handleSaveStat = async () => {
    if (!statFormData.label || !statFormData.value) return

    // Auto-assign color based on status if not manually set
    let color: "teal" | "amber" | "coral" = "teal"
    if (statFormData.status === "moderate") color = "amber"
    if (statFormData.status === "high" || statFormData.status === "severe") color = "coral"

    const dataToSave = { ...statFormData, color }

    try {
      if (editingStat) {
        const updated = await api.updateAssessmentStat(editingStat.id, dataToSave)
        if (updated) {
          setAssessmentStats(
            assessmentStats.map((s) => (s.id === editingStat.id ? { id: updated.id, ...dataToSave } : s))
          )
          toast({ title: "Stat updated", description: "Assessment stat has been updated successfully." })
        }
      } else {
        const created = await api.createAssessmentStat(patientId, dataToSave)
        if (created) {
          setAssessmentStats([
            ...assessmentStats,
            { id: created.id, ...dataToSave },
          ])
          toast({ title: "Stat created", description: "Assessment stat has been created successfully." })
        }
      }
      setIsStatDialogOpen(false)
      setEditingStat(null)
      setStatFormData({ label: "", value: "", status: "mild", color: "teal" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to save assessment stat.", variant: "destructive" })
    }
  }

  const handleDeleteStat = async (id: string) => {
    try {
      const success = await api.deleteAssessmentStat(id)
      if (success) {
        setAssessmentStats(assessmentStats.filter((s) => s.id !== id))
        toast({ title: "Stat deleted", description: "Assessment stat has been removed." })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete assessment stat.", variant: "destructive" })
    }
  }

  const handleStartEditSummary = () => {
    setEditedSummary(clinicalSummary)
    setIsEditingSummary(true)
  }

  const handleSaveSummary = async () => {
    try {
      const success = await api.updateClinicalSummary(patientId, editedSummary)
      if (success) {
        setClinicalSummary(editedSummary)
        setIsEditingSummary(false)
        toast({ title: "Summary saved", description: "Clinical summary has been updated." })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save clinical summary.", variant: "destructive" })
    }
  }

  const handleCancelEditSummary = () => {
    setIsEditingSummary(false)
  }

  const totalSessions = sessions.length

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="rounded-xl hover:bg-muted">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold text-neutral-charcoal mb-2">{t("patient")} #{patient?.patientCode || patientId}</h1>
            <p className="text-muted-foreground">{t("viewPatientInfo")}</p>
          </div>
        </div>

        <Card className="rounded-2xl border-soft-gray shadow-soft p-0 overflow-hidden">
          <CardHeader className="border-b border-soft-gray p-0">
            <div className="flex gap-2 px-6 pt-2">
              <button
                onClick={() => setActiveTab("assessment")}
                className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "assessment"
                  ? "bg-calm-teal text-white border-b-0 shadow-sm"
                  : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                  }`}
              >
                {t("assessmentResults")}
              </button>
              <button
                onClick={() => setActiveTab("sessions")}
                className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "sessions"
                  ? "bg-calm-teal text-white border-b-0 shadow-sm"
                  : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                  }`}
              >
                {t("sessions")} ({totalSessions})
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "chat"
                  ? "bg-calm-teal text-white border-b-0 shadow-sm"
                  : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                  }`}
              >
                {t("chat")}
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "notes"
                  ? "bg-calm-teal text-white border-b-0 shadow-sm"
                  : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                  }`}
              >
                {t("notes")}
              </button>
              <button
                onClick={() => setActiveTab("questionnaires")}
                className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "questionnaires"
                  ? "bg-calm-teal text-white border-b-0 shadow-sm"
                  : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                  }`}
              >
                {t("questionnaires")}
              </button>
            </div>
          </CardHeader>
        </Card>

        {activeTab === "assessment" && (
          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-neutral-charcoal">{t("assessmentResults")}</CardTitle>
              <Button onClick={() => handleOpenStatDialog()} size="sm" className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                {t("addResult")}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                {assessmentStats.map((stat) => (
                  <div key={stat.id} className="group relative p-4 rounded-xl bg-muted/30 border border-soft-gray hover:border-calm-teal/50 transition-colors">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleOpenStatDialog(stat)}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-soft-coral hover:text-soft-coral"
                        onClick={() => handleDeleteStat(stat.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                    <p className="text-2xl font-semibold text-neutral-charcoal mb-1">{stat.value}</p>
                    <Badge
                      className={`${stat.color === "coral"
                        ? "bg-soft-coral/10 text-soft-coral"
                        : stat.color === "amber"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-calm-teal/10 text-calm-teal"
                        } border-0 capitalize`}
                    >
                      {t(stat.status)}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-6 rounded-xl bg-muted/30 border border-soft-gray">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-neutral-charcoal flex items-center gap-2">
                    <FileText className="h-5 w-5 text-soft-lavender" />
                    {t("clinicalSummary")}
                  </h3>
                  {!isEditingSummary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEditSummary}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-neutral-charcoal"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isEditingSummary ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      className="min-h-[100px] rounded-xl border-soft-gray bg-white"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEditSummary}
                        className="rounded-lg"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("cancel")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveSummary}
                        className="rounded-lg bg-calm-teal hover:bg-calm-teal/90 text-white"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {t("save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-charcoal leading-relaxed">
                    {clinicalSummary}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* --- Dialog for Add/Edit Stat --- */}
        {isStatDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md rounded-2xl border-soft-gray shadow-soft bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">
                {editingStat ? t("editResult") : t("addResult")}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("scaleName")}</label>
                  <input
                    className="w-full rounded-xl border border-soft-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20"
                    placeholder="e.g. PHQ-9"
                    value={statFormData.label}
                    onChange={(e) => setStatFormData({ ...statFormData, label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("scoreResult")}</label>
                  <input
                    className="w-full rounded-xl border border-soft-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20"
                    placeholder="e.g. 12/27"
                    value={statFormData.value}
                    onChange={(e) => setStatFormData({ ...statFormData, value: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("status")}</label>
                  <select
                    className="w-full rounded-xl border border-soft-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20"
                    value={statFormData.status}
                    onChange={(e) => setStatFormData({ ...statFormData, status: e.target.value as any })}
                  >
                    <option value="mild">{t("mild")}</option>
                    <option value="moderate">{t("moderate")}</option>
                    <option value="high">{t("high")}</option>
                    <option value="severe">{t("severe")}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="ghost" onClick={() => setIsStatDialogOpen(false)} className="rounded-xl">
                  {t("cancel")}
                </Button>
                <Button onClick={handleSaveStat} className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white">
                  {t("save")}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "sessions" && (
          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-neutral-charcoal">{t("sessionHistory")}</CardTitle>
                  <Button
                    onClick={() => setShowGeneralStats(!showGeneralStats)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-soft-gray text-calm-teal hover:text-calm-teal/80 hover:bg-calm-teal/5"
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    {showGeneralStats ? t("hideGeneralStats") : t("viewGeneralStats")}
                  </Button>
                </div>
                <Badge className="bg-calm-teal/10 text-calm-teal hover:bg-calm-teal/20 border-0">
                  {totalSessions} {t("totalSessions")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {showGeneralStats && (
                <div className="mb-8 p-6 rounded-2xl border border-soft-gray bg-muted/10">
                  <h3 className="text-sm font-semibold text-neutral-charcoal mb-6 flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-calm-teal" />
                    {t("statisticsOverTime")}
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                    {metrics.map((metric) => {
                      const Icon = metric.icon
                      const isActive = activeMetric === metric.id
                      return (
                        <button
                          key={metric.id}
                          onClick={() => setActiveMetric(metric.id)}
                          className={`p-4 rounded-xl border transition-all flex flex-col items-center text-center gap-2 ${isActive
                            ? "border-calm-teal bg-calm-teal/5 shadow-sm"
                            : "border-soft-gray bg-white hover:border-calm-teal/30"
                            }`}
                        >
                          <div className={`p-2 rounded-lg ${isActive ? "bg-calm-teal text-white" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={`text-xs font-medium ${isActive ? "text-calm-teal" : "text-muted-foreground"}`}>
                            {t(metric.label)}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...sessions].reverse().map(s => {
                          const stats = calculateStats(s)
                          return {
                            date: new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                            messages: stats.patientCount,
                            therapistMessages: stats.therapistCount,
                            responseTime: stats.avgResponseSeconds,
                            duration: stats.duration,
                            totalMessages: stats.patientCount + stats.therapistCount
                          }
                        })}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#FFF",
                            borderRadius: "12px",
                            border: "1px solid #E5E7EB",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey={metrics.find(m => m.id === activeMetric)?.dataKey}
                          name={t(metrics.find(m => m.id === activeMetric)?.label || "")}
                          stroke={metrics.find(m => m.id === activeMetric)?.color}
                          strokeWidth={4}
                          dot={{ r: 6, fill: metrics.find(m => m.id === activeMetric)?.color, strokeWidth: 2, stroke: "#FFF" }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                          animationDuration={1000}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="p-5 rounded-xl bg-muted/30 border border-soft-gray">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-soft-lavender/20 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-soft-lavender" />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-charcoal">{session.description}</p>
                          <p className="text-sm text-muted-foreground">{new Date(session.date + "Z").toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSession(session.id)}
                          className="h-8 w-8 p-0 text-soft-coral hover:text-soft-coral/80 hover:bg-soft-coral/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      onClick={() => setViewingSessionId(session.id)}
                      variant="outline"
                      size="sm"
                      className="rounded-lg border-soft-gray ml-13"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {t("viewChatTranscript")}
                    </Button>
                    <Button
                      onClick={() => setStatsSessionId(session.id)}
                      variant="outline"
                      size="sm"
                      className="rounded-lg border-soft-gray ml-2 text-calm-teal hover:text-calm-teal/80 hover:bg-calm-teal/5"
                    >
                      <BarChart2 className="h-4 w-4 mr-2" />
                      {t("viewStatistics")}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* --- Statistics Modal --- */}
        {statsSessionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-lg rounded-2xl border-soft-gray shadow-soft bg-white">
              <CardHeader className="flex flex-row items-center justify-between border-b border-soft-gray pb-4">
                <CardTitle className="text-xl text-neutral-charcoal flex items-center gap-2">
                  <BarChart2 className="h-6 w-6 text-calm-teal" />
                  {t("sessionStatistics")}
                </CardTitle>
                <Button variant="ghost" onClick={() => setStatsSessionId(null)} className="rounded-full h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {(() => {
                  const session = sessions.find(s => s.id === statsSessionId)
                  if (!session) return null
                  const stats = calculateStats(session)

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-soft-peach/20 border border-soft-peach/50 flex flex-col items-center justify-center text-center">
                          <p className="text-3xl font-bold text-neutral-charcoal mb-1">{stats.patientCount}</p>
                          <p className="text-sm text-muted-foreground">{t("patientMessages")}</p>
                          <p className="text-xs text-muted-foreground mt-1">({stats.patientWords} {t("words")})</p>
                        </div>
                        <div className="p-4 rounded-xl bg-calm-teal/10 border border-calm-teal/30 flex flex-col items-center justify-center text-center">
                          <p className="text-3xl font-bold text-neutral-charcoal mb-1">{stats.therapistCount}</p>
                          <p className="text-sm text-muted-foreground">{t("therapistMessages")}</p>
                          <p className="text-xs text-muted-foreground mt-1">({stats.therapistWords} {t("words")})</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-soft-gray">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <BarChart2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-medium text-neutral-charcoal">{t("avgResponseTime")}</span>
                          </div>
                          <span className="text-xl font-semibold text-neutral-charcoal">{stats.avgResponseSeconds} {t("seconds")}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-soft-gray">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-soft-lavender/20 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-soft-lavender" />
                            </div>
                            <span className="font-medium text-neutral-charcoal">{t("totalWords")}</span>
                          </div>
                          <span className="text-xl font-semibold text-neutral-charcoal">{stats.patientCount + stats.therapistCount}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-soft-gray">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-amber-600" />
                            </div>
                            <span className="font-medium text-neutral-charcoal">{t("sessionDuration")}</span>
                          </div>
                          <span className="text-xl font-semibold text-neutral-charcoal">
                            {Math.floor(stats.duration / 60) > 0
                              ? `${Math.floor(stats.duration / 60)} ${t("hours")} ${stats.duration % 60} ${t("minutes")} `
                              : `${stats.duration} ${t("minutes")} `
                            }
                          </span>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        )}
        {/* Chat actual */}
        {viewingSessionId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-6xl h-[85vh] rounded-2xl border-soft-gray shadow-soft flex flex-col">
              <CardHeader className="border-b border-soft-gray bg-white z-10 shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-neutral-charcoal">
                    {t("sessionChat")} - {chatDescription || "Sin descripción"} ({(() => {
                      const session = sessions.find((s) => s.id === viewingSessionId);
                      return session?.date ? new Date(session.date).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }) : "";
                    })()})
                  </CardTitle>
                  <Button variant="ghost" onClick={() => setViewingSessionId(null)} className="rounded-xl">
                    {t("close")}
                  </Button>
                </div>
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder={t("searchMessages")}
                    className="w-full px-4 py-2 rounded-xl border border-soft-gray focus:outline-none focus:ring-2 focus:ring-calm-teal/20"
                    onChange={(e) => {
                      const searchTerm = e.target.value.toLowerCase()
                      // Simple highlight logic
                      if (searchTerm) {
                        const elements = document.querySelectorAll(".session-message-text")
                        elements.forEach((el) => {
                          const text = el.textContent || ""
                          if (text.toLowerCase().includes(searchTerm)) {
                            el.classList.add("bg-amber-200/50")
                          } else {
                            el.classList.remove("bg-amber-200/50")
                          }
                        })
                      } else {
                        document.querySelectorAll(".session-message-text").forEach((el) => {
                          el.classList.remove("bg-amber-200/50")
                        })
                      }
                    }}
                  />
                </div>
              </CardHeader>
              <div className="flex flex-1 min-h-0">
                {/* Chat transcript with fixed size and scroll */}
                <CardContent className="flex-1 pt-6 overflow-y-auto">
                  <div className="space-y-4 pr-2">
                    {sessions
                      .find((s) => s.id === viewingSessionId)
                      ?.chatHistory.map((message, index) => (
                        <div
                          key={message.id || index}
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
                                  {message.sender === "patient" ? "Patient" : "Therapist"}
                                </p>
                                <p className="text-xs text-muted-foreground">{new Date(message.timestamp + "Z").toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}</p>
                              </div>
                            </div>
                            <p className="text-sm text-neutral-charcoal leading-relaxed session-message-text transition-colors">
                              {message.text}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
                {/* Session notes panel next to chat */}
                <div className="w-80 border-l border-soft-gray bg-muted/20 overflow-y-auto">
                  <div className="p-6 h-full flex flex-col space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        {t("sessionDescription") || "Descripción de la sesión"}
                      </label>
                      <Input
                        value={chatDescription}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setChatDescription(e.target.value)}
                        placeholder={t("enterDescription") || "Añadir descripción..."}
                        className="rounded-xl border-soft-gray focus:ring-calm-teal/20"
                      />
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        {t("sessionNotes") || "Notas de la sesión"}
                      </label>
                      <Textarea
                        value={chatNotes}
                        onChange={(e) => setChatNotes(e.target.value)}
                        className="flex-1 resize-none border-soft-gray focus:ring-calm-teal/20 mb-4"
                        placeholder={t("addSessionNotes") || "Añadir notas de la sesión..."}
                      />
                    </div>
                    <Button
                      onClick={handleSaveSessionDetails}
                      disabled={isSavingChatNotes}
                      className="w-full bg-calm-teal hover:bg-calm-teal/90 text-white"
                    >
                      {isSavingChatNotes ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          {t("saving") || "Guardando..."}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {t("saveNotes") || "Guardar Notas"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "chat" && <ChatTranscript patientId={patientId} onSaveAndClose={handleSaveAndCloseChat} isOnline={isPatientOnline} />}

        {/* Notes*/}
        {activeTab === "notes" && (
          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader>
              <CardTitle className="text-neutral-charcoal">{t("patientNotes")}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("patientNotesDescription")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-charcoal">{t("addNewNote")}</label>
                  <div className={`rounded-xl border border-soft-gray overflow-hidden transition-colors ${newNoteColor}`}>
                    <div className="p-3 border-b border-soft-gray flex gap-2 items-center bg-white/50">
                      <input
                        placeholder={t("noteTitle")}
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium"
                      />
                      <div className="flex items-center gap-1 border-l border-soft-gray pl-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => execCommand("bold")}
                          className="h-7 w-7 p-0"
                          title="Bold"
                        >
                          <Bold className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => execCommand("italic")}
                          className="h-7 w-7 p-0"
                          title="Italic"
                        >
                          <Italic className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div
                      id="note-editor"
                      contentEditable
                      className="min-h-[120px] p-3 focus:outline-none text-sm leading-relaxed"
                      onInput={(e) => setNewNoteContent(e.currentTarget.innerHTML)}
                      style={{ minHeight: "120px" }}
                    />

                    <div className="p-2 border-t border-soft-gray bg-white/50 flex gap-1">
                      {NOTE_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setNewNoteColor(color.value)}
                          className={`w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 ${color.value} ${newNoteColor === color.value ? "ring-2 ring-calm-teal ring-offset-1" : ""
                            }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleAddNote}
                  disabled={!newNoteContent.trim() || !newNoteTitle.trim()}
                  className="flex-1 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md"
                >
                  {editingNoteId && <Save className="h-4 w-4 mr-2" />}
                  {!editingNoteId && <Plus className="h-4 w-4 mr-2" />}
                  {editingNoteId ? t("updateNote") : t("addNote")}
                </Button>
                {editingNoteId && (
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="rounded-xl border-soft-gray"
                  >
                    {t("cancelEdit")}
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-charcoal">{t("previousNotes")}</h3>
                {patientNotes.map((note) => (
                  <div key={note.id} className={`p-4 rounded-xl border border-soft-gray ${note.color}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-neutral-charcoal">{note.title}</h4>
                        <p className="text-xs text-muted-foreground">{note.date}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditNote(note)}
                          className="h-8 w-8 p-0 text-calm-teal hover:text-calm-teal/80 hover:bg-calm-teal/10 rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                          className="h-8 w-8 p-0 text-soft-coral hover:text-soft-coral/80 hover:bg-soft-coral/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div
                      className="text-sm text-neutral-charcoal leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "questionnaires" && (
          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-3 justify-between w-full">
                <div>
                  <CardTitle className="text-neutral-charcoal">{t("questionnaires")}</CardTitle>
                </div>
                <div className="w-[200px]">
                  <Select value={questionnaireFilter} onValueChange={setQuestionnaireFilter}>
                    <SelectTrigger className="h-9 rounded-xl border-soft-gray bg-white">
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los cuestionarios</SelectItem>
                      {uniqueQuestionnaires.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {questionnaireHistory.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">{t("noQuestionnairesHistory")}</p>
                  <p className="text-sm">Los cuestionarios completados se mostrarán aquí</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Group by week
                    const filtered = questionnaireHistory
                      .filter(item => questionnaireFilter === "all" || item.questionnaireTitle === questionnaireFilter)
                      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())

                    const grouped: Record<string, AnsweredQuestionnaire[]> = {}

                    filtered.forEach(item => {
                      const date = new Date(item.rawDate)
                      // Get Monday of the week
                      const day = date.getDay()
                      const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
                      const monday = new Date(date.setDate(diff))
                      monday.setHours(0, 0, 0, 0)

                      const key = monday.toISOString()
                      if (!grouped[key]) grouped[key] = []
                      grouped[key].push(item)
                    })

                    // Sort weeks (newest first)
                    const sortedWeeks = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

                    return sortedWeeks.map(weekKey => {
                      const weekDate = new Date(weekKey)
                      const weekLabel = `Semana del ${weekDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`

                      return (
                        <div key={weekKey} className="relative">
                          <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm py-2 px-3 rounded-lg border border-gray-100 mb-4 inline-block shadow-sm">
                            <h4 className="text-sm font-semibold text-neutral-charcoal capitalize flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-calm-teal" />
                              {weekLabel}
                            </h4>
                          </div>

                          <div className="space-y-4 pl-2 border-l-2 border-soft-gray/30 ml-3">
                            {grouped[weekKey].map((item, index) => (
                              <div key={item.id} className="group relative pl-6">


                                <div
                                  className="relative p-5 rounded-2xl border border-soft-gray bg-white bg-gradient-to-br from-white to-calm-teal/5 hover:shadow-lg transition-all duration-300 hover:border-calm-teal/50 cursor-pointer"
                                  onClick={() => toggleQuestionnaireDetails(item.id)}
                                >
                                  <div className="flex items-start gap-4">
                                    {/* Date badge */}
                                    <div className="shrink-0">
                                      {(() => {
                                        const IconComponent = AVAILABLE_ICONS.find(i => i.name === item.icon)?.icon || Calendar
                                        return (
                                          <div className="h-12 w-12 rounded-xl bg-calm-teal flex items-center justify-center shadow-md">
                                            <IconComponent className="h-5 w-5 text-white" />
                                          </div>
                                        )
                                      })()}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex-1">
                                          <h3 className="font-bold text-lg text-neutral-charcoal mb-1 group-hover:text-calm-teal transition-colors">
                                            {item.questionnaireTitle}
                                          </h3>
                                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                              <Calendar className="h-3.5 w-3.5 text-calm-teal" />
                                              <span className="font-medium">{item.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                              <Clock className="h-3.5 w-3.5 text-calm-teal" />
                                              <span className="font-medium">{item.time}</span>
                                            </div>
                                            <span className="bg-gray-50 px-2 py-1 rounded-md border border-gray-100 font-medium">{item.answers.length} {item.answers.length === 1 ? t("question") : t("questions")}</span>
                                          </div>
                                        </div>

                                        <div className="shrink-0 flex items-center pr-2">
                                          {expandedQuestionnaireId === item.id ? (
                                            <ChevronUp className="h-5 w-5 text-calm-teal" />
                                          ) : (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground/30" />
                                          )}
                                        </div>
                                      </div>

                                      {/* Expanded details */}
                                      {expandedQuestionnaireId === item.id && (
                                        <div className="mt-4 pt-4 border-t border-soft-gray/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                          <div className="grid gap-3">
                                            {item.answers.map((ans, idx) => (
                                              <div
                                                key={idx}
                                                className="bg-white/60 border border-soft-gray/50 p-5 rounded-xl hover:border-calm-teal/50 transition-colors shadow-sm"
                                              >
                                                <p className="text-sm font-medium text-neutral-charcoal mb-4 leading-relaxed">
                                                  <span className="text-calm-teal font-bold mr-2">{idx + 1}.</span>
                                                  {ans.questionText}
                                                </p>

                                                {/* Render based on Type */}
                                                {(ans.type === 'likert' || ans.type === 'scale') ? (
                                                  <div className="space-y-4">
                                                    <div className="text-center py-2">
                                                      <div className="inline-flex items-baseline gap-1.5">
                                                        <span className="text-4xl font-bold text-calm-teal">
                                                          {ans.answer}
                                                        </span>
                                                        <span className="text-lg text-muted-foreground font-medium">/ {ans.maxValue || 5}</span>
                                                      </div>
                                                    </div>
                                                    {/* Slider-like Visualization */}
                                                    <div className="relative w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                                                      <div
                                                        className="absolute top-0 left-0 h-full bg-calm-teal rounded-full transition-all duration-500"
                                                        style={{ width: `${(Number(ans.answer) / (ans.maxValue || 5)) * 100}%` }}
                                                      />
                                                    </div>
                                                    <div className="flex justify-between text-xs font-medium px-1 mt-1">
                                                      <span className="text-calm-teal">Mínimo (1)</span>
                                                      <span className="text-calm-teal">Máximo ({ans.maxValue || 5})</span>
                                                    </div>
                                                  </div>
                                                ) : ans.type === 'frequency' ? (
                                                  <div className="flex flex-wrap gap-2 mt-2">
                                                    {(ans.options && ans.options.length > 0
                                                      ? ans.options
                                                      : ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"]
                                                    ).map((opt, i) => (
                                                      <span
                                                        key={i}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${(ans.answer === opt || ans.answer === i) // Simple check, might need refinement based on exact stored value
                                                          ? "bg-calm-teal text-white border-calm-teal shadow-md"
                                                          : "bg-white text-muted-foreground border-soft-gray/50"
                                                          }`}
                                                      >
                                                        {opt}
                                                      </span>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="bg-white p-3 rounded-lg border border-soft-gray/50 text-neutral-charcoal/80 text-sm">
                                                    {ans.answer}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout >
  )
}

