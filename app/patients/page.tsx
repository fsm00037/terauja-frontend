"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Plus, Edit, Trash2, Eye, Copy } from "lucide-react"
import { CreatePatientModal } from "@/components/create-patient-modal"
import { useLanguage } from "@/contexts/language-context"

import { type Patient } from "@/lib/api"
import * as api from "@/lib/api"

export default function PatientsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])

  const loadPatients = async () => {
    const role = localStorage.getItem("userRole")
    const id = localStorage.getItem("userId")
    // Always pass ID to scope patients to the user (admin or psychologist)
    const filterId = id ? id : undefined
    const data = await api.getPatients(filterId)
    setPatients(data)
  }

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    if (!auth) {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
      loadPatients()

      const interval = setInterval(loadPatients, 10000)
      return () => clearInterval(interval)
    }
  }, [router])

  const handleDelete = async (id: string) => {
    if (confirm(t("confirmDeletePatient"))) {
      const success = await api.deletePatient(id)
      if (success) {
        setPatients(patients.filter((p) => p.id !== id))
      } else {
        alert("Error al eliminar el paciente")
      }
    }
  }

  const handleCreatePatient = (newPatient: Patient) => {
    setPatients([...patients, newPatient])
  }

  const filteredPatients = patients.filter(
    (p) =>
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-charcoal mb-2">{t("patientManagement")}</h1>
            <p className="text-muted-foreground">{t("patientManagementDesc")}</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("createNewPatient")}
          </Button>
        </div>

        <Card className="rounded-2xl border-soft-gray shadow-soft">
          <CardContent className="p-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t("searchPatients")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl border-soft-gray"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-soft-gray">

                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">{t("patientCode")}</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">{t("accessCode")}</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">{t("unreadMessages")}</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">{t("questionnaires")}</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Psicólogo</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">{t("lastContact")}</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">{t("status")}</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-muted-foreground">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="border-b border-soft-gray last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-4 px-4 font-medium text-neutral-charcoal">{patient.patientCode}</td>
                      <td className="py-4 px-4 text-neutral-charcoal">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-soft-gray px-2 py-1 rounded text-xs">••••••</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-calm-teal/10 hover:text-calm-teal"
                            onClick={() => {
                              const copyToClipboard = async (text: string) => {
                                try {
                                  if (navigator.clipboard && window.isSecureContext) {
                                    await navigator.clipboard.writeText(text);
                                    alert("Código copiado: " + text);
                                  } else {
                                    // Fallback for insecure context (HTTP)
                                    const textArea = document.createElement("textarea");
                                    textArea.value = text;
                                    textArea.style.position = "fixed";
                                    textArea.style.left = "-999999px";
                                    textArea.style.top = "-999999px";
                                    document.body.appendChild(textArea);
                                    textArea.focus();
                                    textArea.select();
                                    try {
                                      document.execCommand('copy');
                                      alert("Código copiado: " + text);
                                    } catch (err) {
                                      console.error('Fallback: Oops, unable to copy', err);
                                      alert("No se pudo copiar el código automáticamente");
                                    }
                                    document.body.removeChild(textArea);
                                  }
                                } catch (err) {
                                  console.error('Failed to copy: ', err);
                                  alert("Error al copiar el código");
                                }
                              };
                              copyToClipboard(patient.access_code);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-neutral-charcoal">
                        {patient.unreadMessages > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/patients/${patient.id}/statistics?openChat=true`);
                            }}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-calm-teal/20 text-calm-teal font-medium text-sm cursor-pointer hover:bg-calm-teal/30 transition-colors"
                          >
                            {patient.unreadMessages}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-neutral-charcoal">
                        {patient.unreadQuestionnaires > 0 && (
                          <span
                            onClick={() => router.push(`/patients/${patient.id}/statistics?tab=questionnaires`)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-calm-teal/20 text-calm-teal font-medium text-sm cursor-pointer hover:bg-calm-teal/30 transition-colors"
                          >
                            {patient.unreadQuestionnaires}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-neutral-charcoal">
                        {patient.psychologistName || "Sin Asignar"}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">{new Date(patient.lastContact + "Z").toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${patient.isOnline
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${patient.isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                          {patient.isOnline ? t("online") : t("offline")}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/patients/${patient.id}/statistics`)}
                            className="h-9 w-9 p-0 rounded-lg hover:bg-calm-teal/10 hover:text-calm-teal"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(patient.id)}
                            className="h-9 w-9 p-0 rounded-lg hover:bg-soft-coral/10 hover:text-soft-coral"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreatePatientModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreatePatient={handleCreatePatient}
      />


    </DashboardLayout>
  )
}
