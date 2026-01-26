"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
    ClipboardList,
    Plus,
    Trash2,
    Edit,
    Save,
    ArrowLeft,
    Eye,
    X,
    Calendar,
    Clock,
    Play,
    Pause,
    FileQuestion,
    Users,
    Activity,
    Heart,
    Brain,
    Smile,
    Zap,
    Moon,
    Sun,
    Flame,
    Star
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"

// Types
type QuestionType = "likert" | "frequency" | "openText"

interface Question {
    id: string
    text: string
    type: QuestionType
    options?: string[]
}

interface Questionnaire {
    id: string
    title: string
    icon: string
    questions: Question[]
    createdAt: string
}

interface Assignment {
    id: string
    patientId: string
    questionnaireId: string
    startDate: string
    endDate: string
    frequencyType: "weekly" | "daily"
    frequencyCount: number
    windowStart: string
    windowEnd: string
    deadlineHours: number
    minHoursBetween?: number
    status: "active" | "paused" | "completed"
    assignmentType?: "immediate" | "recurring"
    sentAt?: string
}

interface QuestionnaireCompletion {
    id: string
    assignmentId: string
    patientId: string
    questionnaireId: string
    answers: any[]
    scheduledAt?: string
    completedAt: string
    isDelayed: boolean
    questionnaire?: {
        title: string
        icon: string
    }
}

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

// Mock Patients (In a real app, fetch from API)
const MOCK_PATIENTS = [
    { id: "1", name: "1234" },
    { id: "2", name: "5678" },
    { id: "3", name: "91011" },
]

export default function QuestionnairePage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    // State
    const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [completions, setCompletions] = useState<QuestionnaireCompletion[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [isAssigning, setIsAssigning] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [previewId, setPreviewId] = useState<string | null>(null)
    const [activeAssignmentTab, setActiveAssignmentTab] = useState<"sent" | "recurring" | "completed">("sent")

    // Form State (Questionnaire)
    const [title, setTitle] = useState("")
    const [questions, setQuestions] = useState<Question[]>([])
    const [newQuestionText, setNewQuestionText] = useState("")
    const [newQuestionType, setNewQuestionType] = useState<QuestionType>("likert")
    const [selectedIcon, setSelectedIcon] = useState("FileQuestion")

    // Form State (Assignment)
    const [selectedPatient, setSelectedPatient] = useState("")
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [frequencyType, setFrequencyType] = useState<"weekly" | "daily">("weekly")
    const [frequencyCount, setFrequencyCount] = useState(3)
    const [windowStart, setWindowStart] = useState("09:00")
    const [windowEnd, setWindowEnd] = useState("21:00")
    const [deadlineHours, setDeadlineHours] = useState(2)
    const [minHoursBetween, setMinHoursBetween] = useState(8)
    const [isImmediate, setIsImmediate] = useState(false)

    useEffect(() => {
        const auth = localStorage.getItem("isAuthenticated")
        if (!auth) {
            router.push("/login")
        } else {
            setIsAuthenticated(true)
            fetchData()
        }
    }, [router])

    const fetchData = async () => {
        const [q, a, p] = await Promise.all([
            api.getQuestionnaires(),
            api.getAssignments(),
            api.getPatients()
        ])
        setQuestionnaires(q)
        // @ts-ignore
        setAssignments(a)
        setPatients(p)

        // Fetch completions for each patient (simplified for now, ideally one call)
        if (p.length > 0) {
            const allCompletions = await Promise.all(p.map((patient: any) => api.getQuestionnaireCompletions(patient.id)))
            setCompletions(allCompletions.flat().sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()))
        }
    }

    // --- Questionnaire Handlers ---
    const handleStartCreate = () => {
        setIsCreating(true)
        setEditingId(null)
        setTitle("")
        setSelectedIcon("FileQuestion")
        setQuestions([])
        setNewQuestionText("")
        setNewQuestionType("likert")
    }

    const handleEdit = (q: Questionnaire) => {
        setIsCreating(true)
        setEditingId(q.id)
        setTitle(q.title)
        setSelectedIcon(q.icon || "FileQuestion")
        setQuestions([...q.questions])
        setNewQuestionText("")
        setNewQuestionType("likert")
    }

    const handleDeleteQuestionnaire = async (id: string) => {
        if (confirm(t("confirmDelete"))) {
            const success = await api.deleteQuestionnaire(id)
            if (success) {
                setQuestionnaires(questionnaires.filter(q => q.id !== id))
            } else {
                alert("Failed to delete")
            }
        }
    }

    const handleAddQuestion = () => {
        if (!newQuestionText.trim()) return
        const newQuestion: Question = {
            id: Date.now().toString(),
            text: newQuestionText,
            type: newQuestionType,
        }
        setQuestions([...questions, newQuestion])
        setNewQuestionText("")
    }

    const handleDeleteQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id))
    }

    const handleSaveQuestionnaire = async () => {
        if (!title.trim()) return

        // Only creation supported for now via simple API
        // For updates we would need updateQuestionnaire API
        // Assuming create for now logic as provided API has create

        if (editingId) {
            // Logic for update would go here if API supported it fully
            alert("Update not fully implemented in API wrapper yet")
            return
        }

        const newQ = await api.createQuestionnaire(title, selectedIcon, questions)

        if (newQ) {
            setQuestionnaires([...questionnaires, newQ])
            setIsCreating(false)
            setEditingId(null)
        } else {
            alert("Error creating questionnaire")
        }
    }

    const handlePreview = (id: string) => {
        setPreviewId(id)
    }

    // --- Assignment Handlers ---
    const handleStartAssign = () => {
        setIsAssigning(true)
        setSelectedPatient("")
        setSelectedQuestionnaire("")
        setStartDate("")
        setEndDate("")
        setFrequencyType("weekly")
        setFrequencyCount(3)
        setWindowStart("09:00")
        setWindowEnd("21:00")
        setDeadlineHours(2)
        setMinHoursBetween(8)
        setIsImmediate(false)
    }

    const handleSaveAssignment = async () => {
        if (!selectedPatient || !selectedQuestionnaire || !startDate || !endDate) return

        const newAssignment = await api.createAssignment({
            patientId: selectedPatient,
            questionnaireId: selectedQuestionnaire,
            startDate,
            endDate,
            frequencyType,
            frequencyCount: isImmediate ? 1 : frequencyCount,
            windowStart,
            windowEnd,
            deadlineHours,
            minHoursBetween,
            nextScheduledAt: isImmediate ? new Date(Date.now() - 60000).toISOString() : undefined,
            status: "active"
        })

        if (newAssignment) {
            // Refetch to get assignments with questionnaire details populated or manually add
            fetchData()
            setIsAssigning(false)
        } else {
            alert("Error assigning questionnaire")
        }
    }

    const handleToggleStatus = async (id: string) => {
        const assignment = assignments.find(a => a.id === id)
        if (!assignment) return
        const newStatus = assignment.status === "active" ? "paused" : "active"
        const success = await api.updateAssignmentStatus(id, newStatus)
        if (success) {
            setAssignments(assignments.map(a => a.id === id ? { ...a, status: newStatus } : a))
        }
    }

    const handleDeleteAssignment = async (id: string) => {
        if (confirm(t("confirmDelete"))) {
            const success = await api.deleteAssignment(id)
            if (success) {
                setAssignments(assignments.filter(a => a.id !== id))
            }
        }
    }

    const previewQuestionnaire = questionnaires.find(q => q.id === previewId)

    if (!isAuthenticated) return null

    // Helper to get names
    const getPatientName = (id: string) => patients.find((p: any) => p.id === id)?.name || id
    const getQuestionnaireTitle = (id: string) => questionnaires.find(q => q.id === id)?.title || id
    const getQuestionnaireIcon = (id: string) => {
        const q = questionnaires.find(q => q.id === id)
        return AVAILABLE_ICONS.find(i => i.name === q?.icon)?.icon || FileQuestion
    }

    if (isCreating) {
        // Create/Edit View (Same as before)
        return (
            <DashboardLayout>
                <div className="space-y-6 max-w-3xl">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl hover:bg-muted">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-2xl font-semibold text-neutral-charcoal">
                            {editingId ? t("editQuestionnaire") : t("createQuestionnaire")}
                        </h1>
                    </div>
                    <Card className="rounded-2xl border-soft-gray shadow-soft">
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-sm font-medium text-neutral-charcoal">{t("questionnaireTitle")}</Label>
                                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl border-soft-gray" placeholder={t("enterDescription")} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-neutral-charcoal">{t("selectIcon")}</Label>
                                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                                        {AVAILABLE_ICONS.map((item) => {
                                            const IconComponent = item.icon
                                            return (
                                                <button
                                                    key={item.name}
                                                    type="button"
                                                    onClick={() => setSelectedIcon(item.name)}
                                                    className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${selectedIcon === item.name
                                                        ? "bg-calm-teal text-white shadow-md scale-110"
                                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                                        }`}
                                                >
                                                    <IconComponent className="h-5 w-5" />
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-neutral-charcoal px-1">{t("questions")}</h2>
                        {questions.map((q, index) => (
                            <Card key={q.id} className="rounded-2xl border-soft-gray bg-white/50">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-calm-teal bg-calm-teal/10 px-2 py-0.5 rounded-full uppercase">{t(q.type)}</span>
                                            <span className="text-xs text-muted-foreground">Q{index + 1}</span>
                                        </div>
                                        <p className="font-medium text-neutral-charcoal">{q.text}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(q.id)} className="h-8 w-8 p-0 text-soft-coral hover:bg-soft-coral/10 rounded-lg shrink-0">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                        <Card className="rounded-2xl border-dashed border-2 border-soft-gray bg-muted/20">
                            <CardHeader><CardTitle className="text-base font-medium text-neutral-charcoal">{t("addQuestion")}</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-xs text-muted-foreground">{t("questionText")}</Label>
                                        <Input value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} className="h-10 rounded-xl bg-white border-soft-gray" placeholder="e.g., ¿Cómo de ansioso te sientes ahora?" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">{t("questionType")}</Label>
                                        <select value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value as QuestionType)} className="w-full h-10 px-3 rounded-xl bg-white border border-soft-gray text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20">
                                            <option value="likert">{t("likert")}</option>
                                            <option value="frequency">{t("frequency")}</option>
                                            <option value="openText">{t("openText")}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button onClick={handleAddQuestion} disabled={!newQuestionText.trim()} className="rounded-xl bg-neutral-charcoal text-white hover:bg-neutral-charcoal/90" size="sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t("addQuestion")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="flex justify-end pt-6 pb-12">
                        <Button onClick={handleSaveQuestionnaire} disabled={!title.trim() || questions.length === 0} className="px-8 h-12 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md text-lg">
                            <Save className="h-5 w-5 mr-2" />
                            {t("saveQuestionnaire")}
                        </Button>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-3xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold text-neutral-charcoal mb-2">{t("questionnaires")}</h1>
                        <p className="text-muted-foreground">{t("manageQuestionnaires")}</p>
                    </div>
                </div>

                <Tabs defaultValue="questionnaires" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 rounded-xl bg-white p-1">
                        <TabsTrigger value="questionnaires" className="rounded-lg data-[state=active]:bg-calm-teal data-[state=active]:text-white data-[state=active]:shadow-sm">
                            {t("questionnaires")}
                        </TabsTrigger>
                        <TabsTrigger value="sent" className="rounded-lg data-[state=active]:bg-calm-teal data-[state=active]:text-white data-[state=active]:shadow-sm">
                            Enviados
                        </TabsTrigger>
                        <TabsTrigger value="recurring" className="rounded-lg data-[state=active]:bg-calm-teal data-[state=active]:text-white data-[state=active]:shadow-sm">
                            Recurrentes
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-calm-teal data-[state=active]:text-white data-[state=active]:shadow-sm">
                            Completados
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="questionnaires" className="mt-6 space-y-4">
                        <div className="flex justify-end">
                            <Button onClick={handleStartAssign} className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md mr-2">
                                <Plus className="h-4 w-4 mr-2" />
                                {t("assignQuestionnaire")}
                            </Button>
                            <Button onClick={handleStartCreate} className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md mr-2">
                                <Plus className="h-4 w-4 mr-2" />
                                {t("createQuestionnaire")}
                            </Button>
                        </div>
                        <div className="grid gap-4">
                            {questionnaires.length === 0 ? (
                                <Card className="rounded-2xl border-soft-gray bg-muted/20">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
                                        <p>{t("noQuestionnaires")}</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                questionnaires.map((q) => {
                                    const IconComponent = AVAILABLE_ICONS.find(i => i.name === q.icon)?.icon || FileQuestion
                                    return (
                                        <Card
                                            key={q.id}
                                            onClick={() => handlePreview(q.id)}
                                            className="group rounded-2xl border-soft-gray bg-gradient-to-br from-white to-muted/20 hover:shadow-lg hover:border-calm-teal/30 transition-all duration-200 cursor-pointer"
                                        >
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex gap-3 flex-1">
                                                        <div className="h-12 w-12 rounded-xl bg-calm-teal/10 flex items-center justify-center shrink-0 group-hover:bg-calm-teal/20 transition-colors">
                                                            <IconComponent className="h-6 w-6 text-calm-teal" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <CardTitle className="text-lg font-semibold text-neutral-charcoal mb-1 group-hover:text-calm-teal transition-colors">
                                                                {q.title}
                                                            </CardTitle>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <div className="flex items-center gap-1">
                                                                    <ClipboardList className="h-3.5 w-3.5" />
                                                                    <span>{q.questions.length} {t("questions")}</span>
                                                                </div>
                                                                <span className="text-muted-foreground/50">•</span>
                                                                <span className="text-xs">{new Date(q.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleEdit(q)
                                                            }}
                                                            className="h-8 w-8 p-0 text-calm-teal hover:bg-calm-teal/10 rounded-lg"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteQuestionnaire(q.id)
                                                            }}
                                                            className="h-8 w-8 p-0 text-soft-coral hover:bg-soft-coral/10 rounded-lg"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                        </Card>
                                    )
                                })
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="sent" className="mt-6 space-y-4">

                        <div className="grid gap-4">
                            {assignments.filter(a => a.assignmentType === "immediate" && a.status === "active").length === 0 ? (
                                <Card className="rounded-2xl border-soft-gray bg-muted/20">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <Clock className="h-12 w-12 mb-4 opacity-50" />
                                        <p>No hay cuestionarios enviados pendientes</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                assignments.filter(a => a.assignmentType === "immediate" && a.status === "active").map((a) => (
                                    <Card key={a.id} className="group rounded-2xl border-soft-gray bg-gradient-to-br from-white to-muted/20 hover:shadow-lg hover:border-calm-teal/30 transition-all duration-200">
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4 mb-5">
                                                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-calm-teal/10 to-soft-lavender/10 flex items-center justify-center shrink-0 group-hover:from-calm-teal/20 group-hover:to-soft-lavender/20 transition-colors">
                                                    <Users className="h-7 w-7 text-calm-teal" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between gap-4 mb-2">
                                                        <div>
                                                            <h3 className="text-xl font-semibold text-neutral-charcoal group-hover:text-calm-teal transition-colors">
                                                                {getPatientName(a.patientId)}
                                                            </h3>
                                                            <p className="text-sm text-calm-teal font-medium flex items-center gap-1.5 mt-1">
                                                                {(() => {
                                                                    const Icon = getQuestionnaireIcon(a.questionnaireId)
                                                                    return <Icon className="h-3.5 w-3.5" />
                                                                })()}
                                                                {getQuestionnaireTitle(a.questionnaireId)}
                                                            </p>
                                                        </div>
                                                        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase shadow-sm ${a.status === 'active'
                                                            ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-200'
                                                            : 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 border border-yellow-200'
                                                            }`}>
                                                            {t(a.status)}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                                        <div className="bg-white/50 p-3 rounded-lg border border-soft-gray/30">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Calendar className="h-3.5 w-3.5 text-calm-teal" />
                                                                <p className="text-xs font-medium text-muted-foreground">{t("activePeriod")}</p>
                                                            </div>
                                                            <p className="text-sm font-semibold text-neutral-charcoal">{a.startDate} - {a.endDate}</p>
                                                        </div>
                                                        <div className="bg-white/50 p-3 rounded-lg border border-soft-gray/30">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Clock className="h-3.5 w-3.5 text-calm-teal" />
                                                                <p className="text-xs font-medium text-muted-foreground">{t("frequency")}</p>
                                                            </div>
                                                            <p className="text-sm font-semibold text-neutral-charcoal">
                                                                {a.frequencyCount} {t(a.frequencyType === 'weekly' ? 'timesPerWeek' : 'timesPerDay')}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white/50 p-3 rounded-lg border border-soft-gray/30">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Clock className="h-3.5 w-3.5 text-calm-teal" />
                                                                <p className="text-xs font-medium text-muted-foreground">{t("timeWindow")}</p>
                                                            </div>
                                                            <p className="text-sm font-semibold text-neutral-charcoal">{a.windowStart} - {a.windowEnd}</p>
                                                        </div>
                                                        <div className="bg-white/50 p-3 rounded-lg border border-soft-gray/30">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Calendar className="h-3.5 w-3.5 text-calm-teal" />
                                                                <p className="text-xs font-medium text-muted-foreground">{t("responseDeadline")}</p>
                                                            </div>
                                                            <p className="text-sm font-semibold text-neutral-charcoal">{a.deadlineHours} {t("hours")}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-4 border-t border-soft-gray/30">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(a.id)}
                                                    className="rounded-xl border-soft-gray hover:border-calm-teal/50 hover:bg-calm-teal/5"
                                                >
                                                    {a.status === 'active' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                                    {a.status === 'active' ? t("pause") : t("resume")}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteAssignment(a.id)}
                                                    className="text-soft-coral hover:bg-soft-coral/10 rounded-xl"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="recurring" className="mt-6 space-y-4">
                        <div className="grid gap-4">
                            {assignments.filter(a => a.assignmentType === "recurring" && a.status !== "completed").length === 0 ? (
                                <Card className="rounded-2xl border-soft-gray bg-muted/20">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <Clock className="h-12 w-12 mb-4 opacity-50" />
                                        <p>No hay cuestionarios recurrentes activos</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                assignments.filter(a => a.assignmentType === "recurring" && a.status !== "completed").map((a) => (
                                    <Card key={a.id} className="group rounded-2xl border-soft-gray bg-gradient-to-br from-white to-muted/20 hover:shadow-lg hover:border-calm-teal/30 transition-all duration-200">
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4 mb-5">
                                                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-calm-teal/10 to-soft-lavender/10 flex items-center justify-center shrink-0 group-hover:from-calm-teal/20 group-hover:to-soft-lavender/20 transition-colors">
                                                    <Users className="h-7 w-7 text-calm-teal" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between gap-4 mb-2">
                                                        <div>
                                                            <h3 className="text-xl font-semibold text-neutral-charcoal group-hover:text-calm-teal transition-colors">
                                                                {getPatientName(a.patientId)}
                                                            </h3>
                                                            <p className="text-sm text-calm-teal font-medium flex items-center gap-1.5 mt-1">
                                                                {(() => {
                                                                    const Icon = getQuestionnaireIcon(a.questionnaireId)
                                                                    return <Icon className="h-3.5 w-3.5" />
                                                                })()}
                                                                {getQuestionnaireTitle(a.questionnaireId)}
                                                            </p>
                                                        </div>
                                                        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase shadow-sm ${a.status === 'active'
                                                            ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-200'
                                                            : 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 border border-yellow-200'
                                                            }`}>
                                                            {t(a.status)}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                                        <div className="bg-white/50 p-3 rounded-lg border border-soft-gray/30">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Calendar className="h-3.5 w-3.5 text-calm-teal" />
                                                                <p className="text-xs font-medium text-muted-foreground">{t("activePeriod")}</p>
                                                            </div>
                                                            <p className="text-sm font-semibold text-neutral-charcoal">{a.startDate} - {a.endDate}</p>
                                                        </div>
                                                        <div className="bg-white/50 p-3 rounded-lg border border-soft-gray/30">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Clock className="h-3.5 w-3.5 text-calm-teal" />
                                                                <p className="text-xs font-medium text-muted-foreground">{t("frequency")}</p>
                                                            </div>
                                                            <p className="text-sm font-semibold text-neutral-charcoal">
                                                                {a.frequencyCount} {t(a.frequencyType === 'weekly' ? 'timesPerWeek' : 'timesPerDay')}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white/50 p-3 rounded-lg border border-soft-gray/30">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Clock className="h-3.5 w-3.5 text-calm-teal" />
                                                                <p className="text-xs font-medium text-muted-foreground">{t("timeWindow")}</p>
                                                            </div>
                                                            <p className="text-sm font-semibold text-neutral-charcoal">{a.windowStart} - {a.windowEnd}</p>
                                                        </div>
                                                        <div className="bg-white/50 p-3 rounded-lg border border-soft-gray/30">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Calendar className="h-3.5 w-3.5 text-calm-teal" />
                                                                <p className="text-xs font-medium text-muted-foreground">{t("responseDeadline")}</p>
                                                            </div>
                                                            <p className="text-sm font-semibold text-neutral-charcoal">{a.deadlineHours} {t("hours")}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-4 border-t border-soft-gray/30">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(a.id)}
                                                    className="rounded-xl border-soft-gray hover:border-calm-teal/50 hover:bg-calm-teal/5"
                                                >
                                                    {a.status === 'active' ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                                    {a.status === 'active' ? t("pause") : t("resume")}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteAssignment(a.id)}
                                                    className="text-soft-coral hover:bg-soft-coral/10 rounded-xl"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="completed" className="mt-6 space-y-4">
                        <div className="grid gap-4">
                            {completions.length === 0 ? (
                                <Card className="rounded-2xl border-soft-gray bg-muted/20">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
                                        <p>No hay respuestas individuales registradas</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                completions.map((c) => (
                                    <Card key={c.id} className="group rounded-2xl border-soft-gray bg-gradient-to-br from-white to-muted/20 hover:shadow-lg transition-all duration-200">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                                        <ClipboardList className="h-5 w-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-neutral-charcoal text-sm">{getPatientName(c.patientId)}</h4>
                                                            {c.isDelayed && (
                                                                <span className="px-1.5 py-0.5 rounded-md bg-soft-coral/10 text-soft-coral text-[10px] font-bold uppercase border border-soft-coral/20">
                                                                    Retraso
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                            {c.questionnaire?.title || "Cuestionario"} • {new Date(c.completedAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="sm" className="text-calm-teal hover:bg-calm-teal/10 rounded-xl">
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Ver Respuestas
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Assignment Modal */}
                {isAssigning && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-soft-gray shadow-soft bg-white">
                            <CardHeader className="border-b border-soft-gray pb-4">
                                <CardTitle className="text-xl font-semibold text-neutral-charcoal">{t("assignQuestionnaire")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="space-y-2">
                                    <Label>{t("selectPatient")}</Label>
                                    <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-white border border-soft-gray text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20">
                                        <option value="">-- {t("selectPatient")} --</option>
                                        {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("questionnaireTitle")}</Label>
                                    <select value={selectedQuestionnaire} onChange={(e) => setSelectedQuestionnaire(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-white border border-soft-gray text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20">
                                        <option value="">-- {t("selectQuestionnaire")} --</option>
                                        {questionnaires.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                                    </select>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-calm-teal/5 border border-calm-teal/10">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-semibold text-calm-teal">Enviar inmediatamente</Label>
                                        <p className="text-xs text-muted-foreground">El paciente recibirá el cuestionario ahora mismo</p>
                                    </div>
                                    <Switch
                                        checked={isImmediate}
                                        onCheckedChange={(checked) => {
                                            setIsImmediate(checked)
                                            if (checked) {
                                                const today = new Date().toISOString().split('T')[0]
                                                setStartDate(today)
                                                setEndDate(today)
                                            }
                                        }}
                                    />
                                </div>

                                {!isImmediate && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t("startDate")}</Label>
                                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t("endDate")}</Label>
                                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t("frequency")}</Label>
                                            <div className="flex gap-2">
                                                <Input type="number" min="1" value={frequencyCount} onChange={(e) => setFrequencyCount(parseInt(e.target.value))} className="w-20 rounded-xl" />
                                                <select value={frequencyType} onChange={(e) => setFrequencyType(e.target.value as "weekly" | "daily")} className="flex-1 h-10 px-3 rounded-xl bg-white border border-soft-gray text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20">
                                                    <option value="weekly">{t("timesPerWeek")}</option>
                                                    <option value="daily">{t("timesPerDay")}</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t("startTime")}</Label>
                                                <Input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t("endTime")}</Label>
                                                <Input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} className="rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t("responseDeadline")} ({t("hours")})</Label>
                                                <Input type="number" min="1" value={deadlineHours} onChange={(e) => setDeadlineHours(parseInt(e.target.value))} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Horas mín. entre envíos</Label>
                                                <Input type="number" min="0" value={minHoursBetween} onChange={(e) => setMinHoursBetween(parseInt(e.target.value))} className="rounded-xl" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                            <div className="p-4 border-t border-soft-gray flex justify-end gap-2 bg-white rounded-b-2xl">
                                <Button variant="ghost" onClick={() => setIsAssigning(false)} className="rounded-xl">{t("cancel")}</Button>
                                <Button onClick={handleSaveAssignment} disabled={!selectedPatient || !selectedQuestionnaire || !startDate || !endDate} className="rounded-xl bg-calm-teal text-white">
                                    {t("save")}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Preview Modal (Same as before) */}
                {previewQuestionnaire && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-soft-gray shadow-soft bg-white">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-soft-gray pb-4 sticky top-0 bg-white z-10">
                                <CardTitle className="text-xl font-semibold text-neutral-charcoal">
                                    {previewQuestionnaire.title}
                                </CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setPreviewId(null)} className="rounded-full hover:bg-muted">
                                    <X className="h-5 w-5" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                {previewQuestionnaire.questions.map((quest, i) => (
                                    <div key={quest.id} className="space-y-2">
                                        <Label className="text-base font-medium text-neutral-charcoal">{i + 1}. {quest.text}</Label>
                                        {quest.type === "likert" && (
                                            <div className="flex justify-between px-2 pt-2">
                                                {[1, 2, 3, 4, 5].map((val) => (
                                                    <div key={val} className="flex flex-col items-center gap-1">
                                                        <div className="w-4 h-4 rounded-full border border-soft-gray" />
                                                        <span className="text-xs text-muted-foreground">{val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {quest.type === "frequency" && (
                                            <div className="flex flex-col gap-2 pt-1">
                                                {["Nunca", "Raramente", "A veces", "A menudo", "Siempre"].map((opt) => (
                                                    <div key={opt} className="flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded-full border border-soft-gray" />
                                                        <span className="text-sm text-neutral-charcoal">{opt}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {quest.type === "openText" && (
                                            <Input disabled className="bg-muted/10 border-soft-gray" placeholder="Respuesta..." />
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
