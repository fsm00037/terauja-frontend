"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import * as api from "@/lib/api"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageSquare, ClipboardList } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState("Dr. Smith")
  const [stats, setStats] = useState<any>({ total_patients: 0, total_messages: 0, recent_activity: [], completed_questionnaires: 0, pending_questionnaires: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    const storedName = localStorage.getItem("userName")
    if (!auth) {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
      if (storedName) setUserName(storedName)
      loadStats()

      // Poll stats every 10 seconds
      const interval = setInterval(loadStats, 10000)
      return () => clearInterval(interval)
    }
  }, [router])

  const loadStats = async () => {
    try {
      const role = localStorage.getItem("userRole")
      const id = localStorage.getItem("userId")
      const filterId = (id) ? id : undefined

      const data = await api.getDashboardStats(filterId)
      setStats(data)
    } catch (error) {
      console.error("Failed to load stats", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-charcoal mb-2">
            {t("welcomeBack", { name: userName })}
          </h1>
          <p className="text-muted-foreground">{t("overviewToday")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalPatients")}</CardTitle>
              <Users className="h-5 w-5 text-calm-teal" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-neutral-charcoal">{stats.total_patients}</div>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-calm-teal font-medium">{stats.online_patients || 0} usuarios online</span>
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("unreadMessages")}</CardTitle>
              <MessageSquare className="h-5 w-5 text-calm-teal" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-neutral-charcoal">{stats.total_messages}</div>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-calm-teal font-medium">{stats.total_messages} mensajes totales</span>
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cuestionarios completados</CardTitle>
              <ClipboardList className="h-5 w-5 text-calm-teal" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-neutral-charcoal">{stats.completed_questionnaires}</div>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-calm-teal font-medium">{stats.pending_questionnaires} cuestionarios no completados</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-soft-gray shadow-soft">
          <CardHeader>
            <CardTitle className="text-neutral-charcoal">{t("recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-4">
                {stats.recent_activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay actividad reciente</p>
                ) : (
                  stats.recent_activity.map((activity: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-3 border-b border-soft-gray last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-neutral-charcoal">{activity.patient}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {new Date(activity.time + "Z").toLocaleString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {activity.patient_id && (
                          <div
                            className="text-xs text-calm-teal cursor-pointer hover:underline"
                            onClick={() => router.push(`/patients/${activity.patient_id}/statistics?openChat=true`)}
                          >
                            Ver Chat
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout >
  )
}
