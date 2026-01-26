"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/contexts/language-context"
import { LanguageToggle } from "@/components/language-toggle"

import * as api from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [email, setEmail] = useState("admin@psicouja.com")
  const [password, setPassword] = useState("admin")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const user = await api.login(email, password);
      if (user) {
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("userName", user.name)
        localStorage.setItem("userRole", user.role)
        localStorage.setItem("userId", user.id.toString())
        localStorage.setItem("user", JSON.stringify(user))  // Store complete user object

        if (user.role === 'superadmin') {
          router.push("/superadmin")
        } else {
          router.push("/dashboard")
        }
      } else {
        alert("Invalid credentials")
      }
    } catch (err) {
      console.error(err)
      alert("Login failed")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soft-blue via-soft-lavender to-soft-pink p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <Card className="w-full max-w-md shadow-xl rounded-2xl border-0">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-32 h-32 flex items-center justify-center mb-4">
            <Image
              src="/icon.svg"
              alt="PsicoUJA Logo"
              width={128}
              height={128}
              className="object-contain"
              priority
            />
          </div>
          <CardTitle className="text-3xl font-semibold text-neutral-charcoal">PsicoUJA</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Sistema de Supervisión Psicológica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-neutral-charcoal">
                {t("email")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@psicouja.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-soft-gray focus:border-calm-teal focus:ring-calm-teal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-neutral-charcoal">
                {t("password")}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl border-soft-gray focus:border-calm-teal focus:ring-calm-teal"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white font-medium shadow-md mt-6"
            >
              {t("login")}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-6">
            Credenciales por defecto: admin@psicouja.com / admin
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
