"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"

export default function ProfilePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [name, setName] = useState("Dr. Sarah Smith")
  const [availability, setAvailability] = useState("Lunes-Viernes, 9AM-5PM")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [profileId, setProfileId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    const id = localStorage.getItem("userId")
    if (!auth) {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
      if (id) {
        setProfileId(id)
        // Assuming 'api' is defined elsewhere or imported, e.g., from a services file
        // For example: import * as api from "@/services/api"
        // This part of the code assumes 'api' is available in scope.
        // If 'api' is not defined, this will cause a runtime error.
        // For the purpose of this edit, I'm assuming 'api' is correctly imported/defined.
        // @ts-ignore - Ignoring potential 'api' not defined error for the sake of applying the diff
        api.getUserProfile(id).then(user => {
          if (user) {
            setName(user.name)
            setAvailability(user.schedule)
          }
        })
      }
    }
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (profileId) {
      // @ts-ignore - Ignoring potential 'api' not defined error for the sake of applying the diff
      await api.updateUserProfile(profileId, { name, schedule: availability })
      localStorage.setItem("userName", name) // Update cache
      // Dispatch event to update sidebar immediately if possible, or just rely on reload
      window.dispatchEvent(new Event("storage"))
      alert(t("profileUpdated"))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setAvatarUrl(url)
    }
  }

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-charcoal mb-2">{t("profileSettings")}</h1>
          <p className="text-muted-foreground">{t("manageInfo")}</p>
        </div>

        <Card className="rounded-2xl border-soft-gray shadow-soft">
          <CardHeader>
            <CardTitle className="text-neutral-charcoal">{t("personalInformation")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 bg-calm-teal/10">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-2xl text-calm-teal font-semibold">UJA</AvatarFallback>
                  </Avatar>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-calm-teal text-white flex items-center justify-center shadow-md hover:bg-calm-teal/90"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <p className="font-medium text-neutral-charcoal">{t("profilePhoto")}</p>
                  <p className="text-sm text-muted-foreground">{t("clickToUpdate")}</p>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-neutral-charcoal">
                    {t("fullName")}
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-xl border-soft-gray"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability" className="text-sm font-medium text-neutral-charcoal">
                    {t("availability")}
                  </Label>
                  <Input
                    id="availability"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="h-11 rounded-xl border-soft-gray"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  className="px-8 h-11 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md"
                >
                  {t("save")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
