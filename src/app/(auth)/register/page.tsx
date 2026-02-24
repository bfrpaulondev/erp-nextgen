'use client'

/**
 * Register/Onboarding Page
 * Company registration for ERP Next-Gen
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Mail, Lock, User, MapPin, Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const COUNTRIES = [
  { value: 'PT', label: 'Portugal', currency: 'EUR', flag: '🇵🇹' },
  { value: 'AO', label: 'Angola', currency: 'AOA', flag: '🇦🇴' },
] as const

const FEATURES = [
  'Faturação eletrónica certificada',
  'Plano de contas automático (SNC/POC)',
  'Contabilidade automática',
  'Multi-moeda (€/Kz)',
  'Gestão de stock',
  'Dashboard em tempo real',
]

export default function RegisterPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    companyNif: '',
    country: 'PT',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const selectedCountry = COUNTRIES.find((c) => c.value === formData.country)

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (formData.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
          companyNif: formData.companyNif,
          country: formData.country,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta')
      }

      // Redirect to login with success message
      router.push('/login?registered=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-2xl text-foreground">Next-Gen</span>
              <span className="text-sm text-muted-foreground">ERP</span>
            </div>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
              <CardDescription>
                Registe a sua empresa e comece a faturar em minutos
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* User Info */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="João Silva"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="pl-9"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="pl-9"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className="pl-9 pr-9"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Company Info */}
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-3">Informações da Empresa</h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nome da Empresa</Label>
                      <Input
                        id="companyName"
                        placeholder="Empresa Lda"
                        value={formData.companyName}
                        onChange={(e) => handleChange('companyName', e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="companyNif">
                          {selectedCountry?.value === 'AO' ? 'NIF/B.I' : 'NIF'}
                        </Label>
                        <Input
                          id="companyNif"
                          placeholder="501234567"
                          value={formData.companyNif}
                          onChange={(e) => handleChange('companyNif', e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">País</Label>
                        <Select
                          value={formData.country}
                          onValueChange={(value) => handleChange('country', value)}
                          disabled={isLoading}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.value} value={country.value}>
                                {country.flag} {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A criar conta...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
                
                <p className="text-sm text-center text-muted-foreground">
                  Já tem uma conta?{' '}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Entrar
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* Right Panel - Features */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-purple-700 p-12 items-center justify-center">
        <div className="max-w-md text-white">
          <h2 className="text-3xl font-bold mb-4">
            O ERP que o seu negócio precisa
          </h2>
          <p className="text-blue-100 mb-8">
            Faturação, contabilidade e gestão de stock num só lugar.
            Feito para empresas de Portugal e Angola.
          </p>
          
          <ul className="space-y-3">
            {FEATURES.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-12 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
            <p className="text-sm text-blue-100">
              "Finalmente um ERP que funciona e é bonito. A contabilidade automática 
              poupou-nos horas de trabalho manual."
            </p>
            <p className="text-sm font-medium mt-2">
              — Maria Santos, Contabilista
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
