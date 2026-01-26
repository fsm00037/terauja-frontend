"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPsychologist, getPsychologists, getPatients, assignPatientToPsychologist, deletePsychologist, type Psychologist, type Patient } from "@/lib/api"
import { Loader2, Plus, UserCog, Trash2, Clock, RefreshCcw } from "lucide-react"

export default function AdminPage() {
    const router = useRouter()
    const [psychologists, setPsychologists] = useState<Psychologist[]>([])
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isAuthorized, setIsAuthorized] = useState(false)

    // Form States
    const [newPsychName, setNewPsychName] = useState("")
    const [newPsychEmail, setNewPsychEmail] = useState("")
    const [selectedPatientId, setSelectedPatientId] = useState<string>("")
    const [selectedPsychId, setSelectedPsychId] = useState<string>("")
    const [assigning, setAssigning] = useState(false)

    // Memoized fetch function to reuse in useEffect and manual refreshes
    const fetchData = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true)
        try {
            const [psychs, pats] = await Promise.all([
                getPsychologists(),
                getPatients()
            ])
            setPsychologists(psychs)
            setPatients(pats)
        } catch (error) {
            console.error("Error fetching admin data:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const userStr = localStorage.getItem("user")
        if (!userStr) {
            router.push("/login")
            return
        }

        try {
            const user = JSON.parse(userStr)
            if (user.role !== "admin") {
                router.push("/dashboard")
                return
            }
            setIsAuthorized(true)
            fetchData()
        } catch {
            router.push("/login")
        }

        // Optional: Auto-refresh data every 60 seconds to update "Time Online"
        const interval = setInterval(() => fetchData(false), 60000)
        return () => clearInterval(interval)
    }, [router, fetchData])

    const handleCreatePsychologist = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        try {
            const newPsych = await createPsychologist(newPsychName, newPsychEmail)
            if (newPsych) {
                setPsychologists(prev => [...prev, newPsych])
                setNewPsychName("")
                setNewPsychEmail("")
                setIsCreateModalOpen(false)
                alert(`Psicólogo creado exitosamente. Se han enviado las credenciales de acceso a su correo electrónico.`)
            } else {
                alert("Error al crear psicólogo")
            }
        } catch (error) {
            alert("Error al crear psicólogo. El email podría estar duplicado.")
        } finally {
            setCreating(false)
        }
    }

    const handleDeletePsychologist = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar a ${name}? Los pacientes asociados quedarán sin asignar.`)) return
        try {
            const success = await deletePsychologist(id)
            if (success) {
                // Optimistic UI update + fetch fresh data to see unassigned patients
                setPsychologists(prev => prev.filter(p => p.id !== id))
                await fetchData(false)
            }
        } catch (error) {
            alert("Error al eliminar el psicólogo.")
        }
    }

    const handleAssign = async () => {
        if (!selectedPatientId || !selectedPsychId) return
        setAssigning(true)
        try {
            const success = await assignPatientToPsychologist(selectedPatientId, selectedPsychId)
            if (success) {
                await fetchData(false) // Refresh all data to ensure sync
                setSelectedPatientId("")
                setSelectedPsychId("")
                alert("Paciente asignado correctamente")
            }
        } catch (error) {
            alert("Error en la asignación")
        } finally {
            setAssigning(false)
        }
    }

    const formatTime = (seconds?: number) => {
        if (!seconds || seconds === 0) return "0m"
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        return h > 0 ? `${h}h ${m}m` : `${m}m`
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Nunca"
        return new Date(dateString).toLocaleString('es-ES', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    }

    if (loading || !isAuthorized) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-calm-teal" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-charcoal text-balance">Administración del Sistema</h1>
                        <p className="text-muted-foreground mt-2">Gestiona el equipo profesional y la carga de pacientes.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-xl">
                        <RefreshCcw className="h-4 w-4 mr-2" /> Actualizar Datos
                    </Button>
                </div>

                {/* Psychologists Section */}
                <Card className="rounded-2xl border-soft-gray shadow-soft">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-xl font-semibold">Psicólogos</CardTitle>
                            <CardDescription>Equipo profesional registrado en la plataforma</CardDescription>
                        </div>
                        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-calm-teal hover:bg-calm-teal/90 rounded-xl">
                                    <Plus className="h-4 w-4 mr-2" /> Añadir Psicólogo
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-2xl sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Registrar Nuevo Psicólogo</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreatePsychologist} className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label>Nombre Completo</Label>
                                        <Input
                                            value={newPsychName}
                                            onChange={(e) => setNewPsychName(e.target.value)}
                                            placeholder="Ej: Dr. Alex Smith"
                                            required
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Correo Electrónico Institucional</Label>
                                        <Input
                                            type="email"
                                            value={newPsychEmail}
                                            onChange={(e) => setNewPsychEmail(e.target.value)}
                                            placeholder="usuario@dominio.com"
                                            required
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800 border border-amber-100">
                                        La contraseña temporal se generará automáticamente.
                                    </div>
                                    <Button type="submit" className="w-full rounded-xl bg-calm-teal hover:bg-calm-teal/90" disabled={creating}>
                                        {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Crear Cuenta"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">Psicólogo</th>
                                        <th className="px-4 py-3">Rol</th>
                                        <th className="px-4 py-3">Tiempo Online</th>
                                        <th className="px-4 py-3">Última Conexión</th>
                                        <th className="px-4 py-3">Pacientes</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {psychologists.map(psych => (
                                        <tr key={psych.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-calm-teal/10 flex items-center justify-center text-calm-teal font-bold text-xs uppercase">
                                                        {psych.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-neutral-charcoal">{psych.name}</p>
                                                        <p className="text-xs text-muted-foreground">{psych.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                <span className="text-[11px] px-2 py-1 bg-calm-teal/5 text-calm-teal border border-calm-teal/20 rounded-md font-medium">
                                                    {psych.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-calm-teal" />
                                                    {formatTime(psych.totalOnlineSeconds)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {new Date(psych.lastActive + "Z").toLocaleString("es-ES", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                                                    {patients.filter(p => p.psychologistId === psych.id).length} asignados
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {psych.role !== 'admin' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeletePsychologist(psych.id, psych.name)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Patient Management */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="rounded-2xl border-soft-gray shadow-soft md:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Asignación Rápida</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Paciente</Label>
                                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                                    <SelectTrigger className="w-full bg-white rounded-xl">
                                        <SelectValue placeholder="Seleccionar paciente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patients.filter(p => !p.psychologistId || p.psychologistId === "NuN").length > 0 && (
                                            <div className="px-2 py-1.5 text-xs font-semibold text-calm-teal">Sin Asignar</div>
                                        )}
                                        {patients.filter(p => !p.psychologistId || p.psychologistId === "NuN").map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.patientCode}</SelectItem>
                                        ))}
                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 border-t mt-2">Ya Asignados</div>
                                        {patients.filter(p => p.psychologistId && p.psychologistId !== "NuN").map(p => (
                                            <SelectItem key={p.id} value={p.id} className="text-muted-foreground">
                                                {p.patientCode} ({p.psychologistName || 'Asignado'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Psicólogo Destino</Label>
                                <Select value={selectedPsychId} onValueChange={setSelectedPsychId}>
                                    <SelectTrigger className="w-full bg-white rounded-xl">
                                        <SelectValue placeholder="Seleccionar psicólogo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {psychologists.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleAssign}
                                className="w-full rounded-xl bg-calm-teal hover:bg-calm-teal/90"
                                disabled={assigning || !selectedPatientId || !selectedPsychId}
                            >
                                {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCog className="h-4 w-4 mr-2" />}
                                Confirmar Asignación
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-soft-gray shadow-soft md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Listado de Pacientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border border-gray-100 overflow-hidden max-h-[400px] overflow-y-auto relative">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3">Código</th>
                                            <th className="px-4 py-3">Tiempo Online</th>
                                            <th className="px-4 py-3">Última Conexión</th>
                                            <th className="px-4 py-3">Estado Asignación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {patients.map(patient => (
                                            <tr key={patient.id} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-medium">{patient.patientCode}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5 text-gray-600">
                                                        <Clock className="w-3.5 h-3.5 text-calm-teal" />
                                                        {formatTime(patient.totalOnlineSeconds)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {new Date(patient.lastActive + "Z").toLocaleString("es-ES", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {patient.psychologistName ? (
                                                        <span className="text-[11px] px-2 py-1 bg-calm-teal/5 text-calm-teal border border-calm-teal/20 rounded-md font-medium">
                                                            {patient.psychologistName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded-md font-medium">
                                                            Sin asignar
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    )
}