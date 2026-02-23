"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts"
import {
    Users,
    Activity,
    LogOut,
    UserPlus,
    Stethoscope,
    UserCircle2,
    MessageSquare,
    FileText,
    MessageCircle,
    MessagesSquare
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"

export default function SuperAdminPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [stats, setStats] = useState<api.PlatformStats | null>(null)
    const [dailyStats, setDailyStats] = useState<api.DailyMessageStat[]>([])
    const [detailedUsers, setDetailedUsers] = useState<api.DetailedUsersResponse | null>(null)
    const [users, setUsers] = useState<api.Psychologist[]>([]) // Keep for backward compat or replace
    const [isLoading, setIsLoading] = useState(true)

    // Create User Form State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        role: "psychologist" as "psychologist" | "admin",
    })

    useEffect(() => {
        checkAccess()
    }, [])

    const checkAccess = async () => {
        const role = localStorage.getItem("userRole")
        if (role !== "superadmin") {
            router.push("/dashboard") // Or login
            return
        }
        await loadData()
    }

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [statsData, usersData, dailyData, detailedData] = await Promise.all([
                api.getPlatformStats(),
                api.getSystemUsers(),
                api.getDailyMessageStats(),
                api.getDetailedUsers()
            ])
            setStats(statsData)
            setUsers(usersData)
            setDailyStats(dailyData)
            setDetailedUsers(detailedData)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const created = await api.createSystemUser({
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                schedule: "Lunes a Viernes, 9:00 - 18:00" // Default
            })

            if (created) {
                setIsCreateOpen(false)
                setNewUser({ name: "", email: "", role: "psychologist" })
                loadData() // Refresh list
                alert("Usuario creado exitosamente. La contraseña ha sido enviada por correo.")
            } else {
                alert("Error al crear usuario")
            }
        } catch (e) {
            console.error(e)
            alert("Error al crear usuario")
        }
    }

    const handleLogout = () => {
        api.logout()
    }

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 relative via-blue-50/30 to-purple-50/30 p-4 md:p-8">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] pointer-events-none mix-blend-overlay"></div>
            <div className="max-w-7xl mx-auto space-y-8 relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-sm border border-white/50 gap-4 transition-all duration-300">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
                                Panel de Superadmin
                            </h1>
                        </div>
                        <p className="text-gray-500 font-medium pl-14">Panel maestro de control de plataforma y recursos</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="flex gap-2 rounded-xl group hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all border-gray-200">
                        <LogOut size={16} className="group-hover:rotate-12 transition-transform duration-300" />
                        <span className="font-semibold">Cerrar Sesión</span>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-green-500/10"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-600">Psicólogos Online</CardTitle>
                            <div className="p-2 bg-green-100 text-green-600 rounded-xl group-hover:scale-110 transition-transform">
                                <Stethoscope className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="flex items-baseline gap-2 mb-1">
                                <div className="text-4xl font-extrabold text-gray-900 tracking-tighter">
                                    {stats?.online_psychologists || 0}
                                </div>
                                <div className="text-sm font-medium text-gray-400">
                                    / {stats?.total_psychologists || 0}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-xs font-medium text-green-600">Activos ahora</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-500/10"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-600">Pacientes Online</CardTitle>
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                                <UserCircle2 className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="flex items-baseline gap-2 mb-1">
                                <div className="text-4xl font-extrabold text-gray-900 tracking-tighter">
                                    {stats?.online_patients || 0}
                                </div>
                                <div className="text-sm font-medium text-gray-400">
                                    / {stats?.total_patients || 0}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <p className="text-xs font-medium text-blue-600">Activos ahora</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-purple-500/10"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-600">Mensajes Totales</CardTitle>
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                                <MessagesSquare className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-4xl font-extrabold text-gray-900 tracking-tighter mb-1">
                                {((stats?.total_messages_patient || 0) + (stats?.total_messages_psychologist || 0)).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <p className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-md">Intercambiados en total</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-orange-500/10"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-600">Palabras Totales</CardTitle>
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                                <FileText className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-4xl font-extrabold text-gray-900 tracking-tighter mb-1 mt-[2px]">
                                {stats?.total_words?.toLocaleString() || 0}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <p className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-md">Procesadas por el sistema</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm">
                        <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 transition-all font-medium">Vista General</TabsTrigger>
                        <TabsTrigger value="psychologists" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all font-medium">Psicólogos Detallado</TabsTrigger>
                        <TabsTrigger value="patients" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-cyan-600 transition-all font-medium">Pacientes Detallado</TabsTrigger>
                        <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 transition-all font-medium">Gestión de Usuarios</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        {/* Messages Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                    <CardTitle className="text-sm font-semibold text-gray-600">Mensajes de Psicólogos</CardTitle>
                                    <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
                                        <MessageSquare className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">{stats?.total_messages_psychologist || 0}</div>
                                    <p className="text-xs font-medium text-gray-400 mt-1">Enviados por profesionales</p>
                                </CardContent>
                            </Card>
                            <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                    <CardTitle className="text-sm font-semibold text-gray-600">Mensajes de Pacientes</CardTitle>
                                    <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                                        <MessageCircle className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600 tracking-tight">{stats?.total_messages_patient || 0}</div>
                                    <p className="text-xs font-medium text-gray-400 mt-1">Enviados por usuarios</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Chart */}
                        <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden">
                            <CardHeader className="bg-gray-50/50 border-b border-gray-100/50 pb-4">
                                <CardTitle className="text-gray-800 font-semibold">Mensajes Diarios</CardTitle>
                                <CardDescription>Vista general de la actividad en los últimos 30 días</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px] pt-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dailyStats}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dx={-10} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ stroke: '#E5E7EB', strokeWidth: 2 }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                        <Line type="monotone" dataKey="psychologist_count" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 0 }} name="Psicólogos" />
                                        <Line type="monotone" dataKey="patient_count" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f59e0b', strokeWidth: 0 }} name="Pacientes" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="psychologists">
                        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
                            <CardHeader className="border-b border-gray-100/50 bg-transparent">
                                <CardTitle className="text-indigo-900">Estadísticas de Psicólogos</CardTitle>
                                <CardDescription>Detalle de actividad y uso de la plataforma por profesional</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50/80 text-gray-500 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                                            <tr>
                                                <th className="px-6 py-4">Psicólogo</th>
                                                <th className="px-6 py-4">Pacientes</th>
                                                <th className="px-6 py-4">Sesiones</th>
                                                <th className="px-6 py-4">Mensajes</th>
                                                <th className="px-6 py-4">Palabras</th>
                                                <th className="px-6 py-4">Uso de IA</th>
                                                <th className="px-6 py-4">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {detailedUsers?.psychologists.map(psych => (
                                                <tr key={psych.id} className="hover:bg-indigo-50/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        <div>{psych.name}</div>
                                                        <div className="text-xs text-gray-500 font-normal">{psych.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600">{psych.patients_count}</td>
                                                    <td className="px-6 py-4 text-gray-600">{psych.sessions_count}</td>
                                                    <td className="px-6 py-4 text-gray-600">{psych.message_count}</td>
                                                    <td className="px-6 py-4 text-gray-600">{psych.word_count.toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-purple-50 border border-purple-100 text-purple-600 px-2.5 py-1 rounded-lg text-xs font-medium">
                                                            {psych.ai_clicks} usos
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${psych.is_online ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-300"}`} />
                                                                <span className={`text-xs font-medium ${psych.is_online ? "text-green-600" : "text-gray-500"}`}>
                                                                    {psych.is_online ? "En línea" : "Desconectado"}
                                                                </span>
                                                            </div>
                                                            {!psych.is_online && psych.last_active && (
                                                                <span className="text-gray-400 text-[10px]">
                                                                    Última vez: {new Date(psych.last_active).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!detailedUsers?.psychologists || detailedUsers.psychologists.length === 0) && (
                                                <tr>
                                                    <td colSpan={7} className="p-8 text-center text-gray-500">No hay datos disponibles</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="patients">
                        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
                            <CardHeader className="border-b border-gray-100/50 bg-transparent">
                                <CardTitle className="text-blue-900">Estadísticas de Pacientes</CardTitle>
                                <CardDescription>Registro de interacción y uso por paciente</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50/80 text-gray-500 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                                            <tr>
                                                <th className="px-6 py-4">Paciente</th>
                                                <th className="px-6 py-4">Psicólogo Asignado</th>
                                                <th className="px-6 py-4">Mensajes</th>
                                                <th className="px-6 py-4">Palabras</th>
                                                <th className="px-6 py-4">Tiempo Online</th>
                                                <th className="px-6 py-4">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {detailedUsers?.patients.map(patient => (
                                                <tr key={patient.id} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        <div>{patient.patient_code}</div>
                                                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-mono border border-gray-200">ID: {patient.id}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600">{patient.psychologist_name}</td>
                                                    <td className="px-6 py-4 text-gray-600">{patient.message_count}</td>
                                                    <td className="px-6 py-4 text-gray-600">{patient.word_count.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-gray-600">
                                                        {Math.floor(patient.total_online_seconds / 60)} mins
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${patient.is_online ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-300"}`} />
                                                                <span className={`text-xs font-medium ${patient.is_online ? "text-green-600" : "text-gray-500"}`}>
                                                                    {patient.is_online ? "En línea" : "Desconectado"}
                                                                </span>
                                                            </div>
                                                            {!patient.is_online && patient.last_active && (
                                                                <span className="text-gray-400 text-[10px]">
                                                                    Última vez: {new Date(patient.last_active).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!detailedUsers?.patients || detailedUsers.patients.length === 0) && (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-gray-500">No hay pacientes disponibles</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users">
                        {/* Users Management */}
                        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
                            <CardHeader className="border-b border-gray-100/50 bg-transparent flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Gestión de Usuarios</CardTitle>
                                    <CardDescription>Administra psicólogos y administradores del sistema</CardDescription>
                                </div>

                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-gray-900 hover:bg-gray-800 text-white shadow-md rounded-xl transition-all">
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Crear Usuario
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px] rounded-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                                            <DialogDescription>
                                                Añade un nuevo administrador o psicólogo al sistema.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label>Nombre Completo</Label>
                                                <Input
                                                    required
                                                    value={newUser.name}
                                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                                    placeholder="Ej. Dr. Juan Pérez"
                                                    className="rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Email</Label>
                                                <Input
                                                    required
                                                    type="email"
                                                    value={newUser.email}
                                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                                    placeholder="correo@ejemplo.com"
                                                    className="rounded-xl"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Rol</Label>
                                                <Select
                                                    value={newUser.role}
                                                    onValueChange={(val: "psychologist" | "admin") => setNewUser({ ...newUser, role: val })}
                                                >
                                                    <SelectTrigger className="rounded-xl">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="psychologist">Psicólogo</SelectItem>
                                                        <SelectItem value="admin">Administrador</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex justify-end pt-4">
                                                <Button type="submit" className="rounded-xl bg-gray-900 hover:bg-gray-800">Crear Usuario</Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>

                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50/80 text-gray-500 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                                            <tr>
                                                <th className="px-6 py-4">Nombre</th>
                                                <th className="px-6 py-4">Email</th>
                                                <th className="px-6 py-4">Rol</th>
                                                <th className="px-6 py-4">Estado</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {users.map(user => (
                                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${user.role === 'admin'
                                                            ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                                            : user.role === 'superadmin'
                                                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                                                            }`}>
                                                            {user.role === 'admin' ? 'Administrador' : user.role === 'superadmin' ? 'Super Admin' : 'Psicólogo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${user.totalOnlineSeconds && user.totalOnlineSeconds > 0 ? "bg-green-500" : "bg-gray-300"}`} />
                                                            <span className="text-gray-500 text-xs font-medium">
                                                                {user.totalOnlineSeconds && user.totalOnlineSeconds > 0 ? t("online") : t("offline")}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-gray-400">
                                                        <Button variant="ghost" size="sm" className="rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100">
                                                            ...
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {users.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-gray-500">No hay usuarios registrados</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
