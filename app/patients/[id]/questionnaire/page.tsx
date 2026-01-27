"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    ArrowLeft,
    ClipboardList,
    Calendar,
    ChevronDown,
    ChevronUp,
    Search,
    Clock,
    AlertCircle,
    Filter,
    X
} from "lucide-react"
import { getQuestionnaireCompletions, getPatients, type QuestionnaireCompletion } from "@/lib/api"
import { useLanguage } from "@/contexts/language-context"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

export default function PatientQuestionnairePage() {
    const params = useParams()
    const router = useRouter()
    const { t } = useLanguage()
    const { toast } = useToast()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [hasAccess, setHasAccess] = useState(false)
    const [completions, setCompletions] = useState<QuestionnaireCompletion[]>([])
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")
    const [showFilters, setShowFilters] = useState(false)

    const patientId = params.id as string

    useEffect(() => {
        const auth = localStorage.getItem("isAuthenticated")
        if (!auth) {
            router.push("/login")
        } else {
            setIsAuthenticated(true)
        }
    }, [router])

    useEffect(() => {
        if (patientId && isAuthenticated) {
            console.log(`DEBUG: Loading questionnaire completions for patient ${patientId}`);
            getPatients().then(patients => {
                const found = patients.find(p => p.id === patientId)
                if (found) {
                    setHasAccess(true)
                    getQuestionnaireCompletions(patientId).then(data => {
                        console.log(`DEBUG: Found ${data.length} completions`);
                        if (data.length === 0) {
                            console.log("DEBUG: No completions found, checking for old assignments...");
                            import("@/lib/api").then(api => {
                                api.getPatientAssignments(patientId).then(assignments => {
                                    const oldCompletions = assignments
                                        .filter(a => a.status === 'completed' && a.answers && a.questionnaire)
                                        .map(a => ({
                                            id: a.id,
                                            assignmentId: a.id,
                                            patientId: a.patientId,
                                            questionnaireId: a.questionnaireId,
                                            answers: a.answers as any[],
                                            completedAt: a.assignedAt || new Date().toISOString(),
                                            isDelayed: false,
                                            questionnaire: a.questionnaire ? {
                                                title: a.questionnaire.title,
                                                icon: a.questionnaire.icon || "FileQuestion"
                                            } : undefined
                                        } as QuestionnaireCompletion));
                                    console.log(`DEBUG: Found ${oldCompletions.length} old style completions`);
                                    setCompletions(oldCompletions);
                                });
                            });
                        } else {
                            setCompletions(data)
                        }
                    })
                } else {
                    console.error("DEBUG: Patient not found", { patientId });
                    toast({
                        title: "Acceso denegado",
                        description: "No tienes acceso a este paciente",
                        variant: "destructive",
                    })
                    router.push("/dashboard")
                }
            }).catch(err => {
                console.error("DEBUG: Error fetching patients", err);
                router.push("/dashboard")
            })
        }
    }, [patientId, isAuthenticated, router, toast])

    const filteredCompletions = useMemo(() => {
        if (!completions) return [];
        return completions.filter(c => {
            const title = c.questionnaire?.title || "Cuestionario";
            const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase())

            const completionDate = new Date(c.completedAt)
            if (isNaN(completionDate.getTime())) return matchesSearch;

            const dateStr = completionDate.toISOString().split('T')[0]
            const timeStr = completionDate.toTimeString().slice(0, 5) // HH:mm

            const matchesStartDate = !startDate || dateStr >= startDate
            const matchesEndDate = !endDate || dateStr <= endDate
            const matchesStartTime = !startTime || timeStr >= startTime
            const matchesEndTime = !endTime || timeStr <= endTime

            return matchesSearch && matchesStartDate && matchesEndDate && matchesStartTime && matchesEndTime
        })
    }, [completions, searchQuery, startDate, endDate, startTime, endTime])

    const toggleQuestionnaireDetails = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const clearFilters = () => {
        setSearchQuery("")
        setStartDate("")
        setEndDate("")
        setStartTime("")
        setEndTime("")
    }

    if (!isAuthenticated || !hasAccess) return null

    return (
        <DashboardLayout>
            <div className="space-y-6 px-4 md:px-8 pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => router.push(`/patients/${patientId}/view`)}
                            className="rounded-xl hover:bg-muted p-2"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-semibold text-neutral-charcoal">
                                Historial de cuestionarios
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Respuestas de cuestionarios completados
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por título..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 rounded-xl border-soft-gray focus:border-calm-teal ring-0"
                            />
                        </div>
                        <Button
                            variant={showFilters ? "secondary" : "outline"}
                            onClick={() => setShowFilters(!showFilters)}
                            className="rounded-xl gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            <span className="hidden sm:inline">Filtros</span>
                        </Button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <Card className="rounded-2xl border-soft-gray shadow-sm bg-muted/30 animate-in fade-in slide-in-from-top-2">
                        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase px-1">Fecha Inicio</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-10 rounded-lg"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase px-1">Fecha Fin</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-10 rounded-lg"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase px-1">Hora Inicio</label>
                                <Input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="h-10 rounded-lg"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase px-1">Hora Fin</label>
                                <Input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="h-10 rounded-lg"
                                />
                            </div>
                            <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10 text-muted-foreground rounded-lg">
                                <X className="h-5 w-5" />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Main Content */}
                <Card className="rounded-2xl border-soft-gray shadow-soft overflow-hidden">
                    <CardHeader className="border-b border-soft-gray bg-white/50">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-neutral-charcoal text-lg">Historial de Completaciones</CardTitle>
                            <Badge variant="outline" className="rounded-lg px-2.5 py-0.5 font-medium">
                                {filteredCompletions.length} Resultados
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredCompletions.length === 0 ? (
                            <div className="text-center py-20 bg-muted/5">
                                <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ClipboardList className="h-8 w-8 text-muted-foreground opacity-50" />
                                </div>
                                <p className="text-lg font-medium text-neutral-charcoal">No se encontraron resultados</p>
                                <p className="text-sm text-muted-foreground mt-1">Intenta ajustar los filtros de búsqueda</p>
                                {(searchQuery || startDate || endDate || startTime || endTime) && (
                                    <Button variant="link" onClick={clearFilters} className="mt-2 text-calm-teal">Limpiar todos los filtros</Button>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-soft-gray">
                                {filteredCompletions.map((completion) => (
                                    <div key={completion.id} className="transition-colors hover:bg-muted/5">
                                        <div
                                            className="p-5 cursor-pointer flex items-center gap-4"
                                            onClick={() => toggleQuestionnaireDetails(completion.id)}
                                        >
                                            <div className="h-10 w-10 rounded-xl bg-calm-teal/10 flex items-center justify-center shrink-0">
                                                <Calendar className="h-5 w-5 text-calm-teal" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-neutral-charcoal">
                                                        {completion.questionnaire?.title || 'Cuestionario'}
                                                    </h3>
                                                    {completion.isDelayed && (
                                                        <Badge variant="destructive" className="bg-soft-coral/10 text-soft-coral border-soft-coral/20 font-medium py-0 px-2 flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            Retraso
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{new Date(completion.completedAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{new Date(completion.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    {completion.scheduledAt && (
                                                        <div className="flex items-center gap-1.5 text-muted-foreground/60 italic">
                                                            <span className="hidden sm:inline">Programado para:</span>
                                                            <span className="sm:hidden">Prog:</span>
                                                            <span>{new Date(completion.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center gap-4">
                                                <Badge variant="secondary" className="bg-calm-teal/5 text-calm-teal hover:bg-calm-teal/10 border-transparent">
                                                    {completion.answers.length} respuestas
                                                </Badge>
                                                {expandedIds.has(completion.id) ? (
                                                    <ChevronUp className="h-5 w-5 text-calm-teal" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Expandable answers */}
                                        {expandedIds.has(completion.id) && (
                                            <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2">
                                                <div className="bg-muted/30 rounded-2xl p-4 md:p-6 border border-soft-gray/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {completion.answers.map((answer: any, idx: number) => (
                                                        <div key={idx} className="bg-white/80 p-4 rounded-xl border border-soft-gray/30 shadow-sm">
                                                            <p className="text-xs font-bold text-calm-teal uppercase tracking-wider mb-2 flex items-center gap-2">
                                                                <span className="h-4 w-4 rounded-full bg-calm-teal text-white flex items-center justify-center text-[10px]">{idx + 1}</span>
                                                                {answer.question_text || `Pregunta ${idx + 1}`}
                                                            </p>
                                                            <p className="text-neutral-charcoal font-medium leading-relaxed">
                                                                {typeof answer.answer === 'object' ? JSON.stringify(answer.answer) : answer.answer || "Sin respuesta"}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}

