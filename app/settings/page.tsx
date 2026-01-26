"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings as SettingsIcon, Save } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { getUserProfile, updateUserProfile } from "@/lib/api"

export default function SettingsPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [style, setStyle] = useState("")
    const [tone, setTone] = useState("")
    const [instructions, setInstructions] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const auth = localStorage.getItem("isAuthenticated")
        const userId = localStorage.getItem("userId")

        if (!auth || !userId) {
            router.push("/login")
        } else {
            setIsAuthenticated(true)
            loadSettings(userId)
        }
    }, [router])

    const loadSettings = async (userId: string) => {
        try {
            const profile = await getUserProfile(userId)
            if (profile) {
                setStyle(profile.ai_style || "")
                setTone(profile.ai_tone || "")
                setInstructions(profile.ai_instructions || "")
            }
        } catch (error) {
            console.error("Error loading settings:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const userId = localStorage.getItem("userId")
            if (!userId) {
                throw new Error("User ID not found")
            }

            await updateUserProfile(userId, {
                ai_style: style,
                ai_tone: tone,
                ai_instructions: instructions
            })

            alert("Configuración guardada exitosamente!")
        } catch (error) {
            console.error("Error saving settings:", error)
            alert("Error al guardar la configuración")
        } finally {
            setIsSaving(false)
        }
    }

    if (!isAuthenticated || isLoading) return null

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-3xl">
                <div>
                    <h1 className="text-3xl font-semibold text-neutral-charcoal mb-2">{t("settings")}</h1>
                    <p className="text-muted-foreground">{t("aiConfigDesc")}</p>
                </div>

                <Card className="rounded-2xl border-soft-gray shadow-soft">
                    <CardHeader>
                        <CardTitle className="text-neutral-charcoal flex items-center gap-2">
                            <SettingsIcon className="h-5 w-5 text-calm-teal" />
                            {t("aiConfig")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="style" className="text-sm font-medium text-neutral-charcoal">
                                    {t("therapistStyle")}
                                </Label>
                                <Input
                                    id="style"
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    placeholder={t("stylePlaceholder")}
                                    className="h-11 rounded-xl border-soft-gray"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tone" className="text-sm font-medium text-neutral-charcoal">
                                    {t("tone")}
                                </Label>
                                <Input
                                    id="tone"
                                    value={tone}
                                    onChange={(e) => setTone(e.target.value)}
                                    placeholder={t("tonePlaceholder")}
                                    className="h-11 rounded-xl border-soft-gray"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="instructions" className="text-sm font-medium text-neutral-charcoal">
                                    {t("additionalInstructions")}
                                </Label>
                                <Textarea
                                    id="instructions"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder={t("instructionsPlaceholder")}
                                    className="min-h-[120px] rounded-xl border-soft-gray"
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-8 h-11 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md flex items-center gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {isSaving ? "Guardando..." : t("saveConfig")}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}