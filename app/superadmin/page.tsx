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
import {
    Users,
    Activity,
    LogOut,
    UserPlus
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"

export default function SuperAdminPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [stats, setStats] = useState<api.PlatformStats | null>(null)
    const [users, setUsers] = useState<api.Psychologist[]>([])
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
            const [statsData, usersData] = await Promise.all([
                api.getPlatformStats(),
                api.getSystemUsers()
            ])
            setStats(statsData)
            setUsers(usersData)
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
        <div className="min-h-screen bg-gray-50/50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Panel de Superadmin</h1>
                        <p className="text-gray-500">Gestión de la plataforma y usuarios</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="flex gap-2">
                        <LogOut size={16} />
                        Cerrar Sesión
                    </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Psicólogos</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total_psychologists || 0}</div>
                            <p className="text-xs text-muted-foreground">Registrados en la plataforma</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.total_patients || 0}</div>
                            <p className="text-xs text-muted-foreground">Beneficiarios activos</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Psicólogos Online</CardTitle>
                            <Activity className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats?.online_psychologists || 0}</div>
                            <p className="text-xs text-muted-foreground">Actualmente activos</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pacientes Online</CardTitle>
                            <Activity className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{stats?.online_patients || 0}</div>
                            <p className="text-xs text-muted-foreground">Actualmente activos</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Message Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Mensajes de Psicólogos</CardTitle>
                            <Activity className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">{stats?.total_messages_psychologist || 0}</div>
                            <p className="text-xs text-muted-foreground">Enviados por profesionales</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Mensajes de Pacientes</CardTitle>
                            <Activity className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{stats?.total_messages_patient || 0}</div>
                            <p className="text-xs text-muted-foreground">Enviados por usuarios</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Users Management */}
                <Card className="border-0 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Gestión de Usuarios</CardTitle>
                            <CardDescription>Administra psicólogos y administradores del sistema</CardDescription>
                        </div>

                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Crear Usuario
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
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
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Rol</Label>
                                        <Select
                                            value={newUser.role}
                                            onValueChange={(val: "psychologist" | "admin") => setNewUser({ ...newUser, role: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="psychologist">Psicólogo</SelectItem>
                                                <SelectItem value="admin">Administrador</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <Button type="submit">Crear Usuario</Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="p-4">Nombre</th>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Rol</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50/50">
                                            <td className="p-4 font-medium">{user.name}</td>
                                            <td className="p-4 text-gray-500">{user.email}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : user.role === 'superadmin'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {user.role === 'admin' ? 'Administrador' : user.role === 'superadmin' ? 'Super Admin' : 'Psicólogo'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${user.totalOnlineSeconds && user.totalOnlineSeconds > 0 ? "bg-green-500" : "bg-gray-300"}`} />
                                                    <span className="text-gray-500">
                                                        {user.totalOnlineSeconds && user.totalOnlineSeconds > 0 ? t("online") : t("offline")}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right text-gray-400">
                                                {/* Placeholder for Edit/Delete */}
                                                ...
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
            </div>
        </div>
    )
}
