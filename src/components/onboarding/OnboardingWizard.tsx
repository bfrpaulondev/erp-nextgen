'use client'

/**
 * Onboarding Wizard
 * Shown to new users after first login
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  CheckCircle2,
  ChevronRight,
  Users,
  Package,
  Loader2,
  Rocket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const STEPS = [
  { id: 'welcome', title: 'Bem-vindo', description: 'Vamos configurar a sua empresa' },
  { id: 'company', title: 'Dados da Empresa', description: 'Complete as informações' },
  { id: 'customer', title: 'Primeiro Cliente', description: 'Adicione um cliente' },
  { id: 'product', title: 'Primeiro Produto', description: 'Adicione um produto/serviço' },
  { id: 'complete', title: 'Concluído!', description: 'Tudo pronto para começar' },
]

export default function OnboardingWizard() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)

  // Company data
  const [companyData, setCompanyData] = useState({
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    website: '',
  })

  // First customer
  const [customerData, setCustomerData] = useState({
    name: '',
    fiscalId: '',
    email: '',
    phone: '',
  })

  // First product
  const [productData, setProductData] = useState({
    code: 'P001',
    name: '',
    type: 'PRODUCT',
    price: '',
    taxRateId: '',
  })

  const [taxRates, setTaxRates] = useState<Array<{ id: string; name: string; rate: number }>>([])

  useEffect(() => {
    if (currentStep === 3) {
      const fetchTaxRates = async () => {
        try {
          const response = await fetch('/api/tax-rates')
          const data = await response.json()
          if (response.ok) {
            setTaxRates(data.data)
            if (data.data.length > 0) {
              setProductData(prev => ({ ...prev, taxRateId: data.data[0].id }))
            }
          }
        } catch (error) {
          console.error('Failed to fetch tax rates:', error)
        }
      }
      fetchTaxRates()
    }
  }, [currentStep])

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  const handleSkipAll = async () => {
    try {
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
    } catch {}
    router.push('/dashboard')
  }

  const saveCompanyData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData),
      })
      if (!response.ok) throw new Error('Failed')
      toast.success('Dados da empresa guardados')
      handleNext()
    } catch {
      toast.error('Erro ao guardar dados da empresa')
    } finally {
      setLoading(false)
    }
  }

  const saveCustomer = async () => {
    if (!customerData.name) {
      toast.error('Nome do cliente é obrigatório')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...customerData,
          type: 'CUSTOMER',
          country: session?.user?.company?.country || 'PT',
        }),
      })
      if (!response.ok) throw new Error('Failed')
      toast.success('Cliente criado com sucesso')
      handleNext()
    } catch {
      toast.error('Erro ao criar cliente')
    } finally {
      setLoading(false)
    }
  }

  const saveProduct = async () => {
    if (!productData.name || !productData.price) {
      toast.error('Nome e preço são obrigatórios')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productData,
          price: parseFloat(productData.price),
          unit: 'UN',
        }),
      })
      if (!response.ok) throw new Error('Failed')
      toast.success('Produto criado com sucesso')
      handleNext()
    } catch {
      toast.error('Erro ao criar produto')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      await update({})
      router.push('/dashboard')
    } catch {
      router.push('/dashboard')
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Rocket className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Bem-vindo ao ERP Next-Gen!</h2>
              <p className="text-muted-foreground mt-2">
                Vamos configurar a sua empresa em poucos passos.<br/>
                Pode saltar qualquer passo e configurar mais tarde.
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handleSkipAll}>Saltar Configuração</Button>
              <Button onClick={handleNext}>
                Começar Configuração
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )

      case 1: // Company Details
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Morada</Label>
                <Input placeholder="Rua, número" value={companyData.address}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input placeholder="Lisboa / Luanda" value={companyData.city}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, city: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Código Postal</Label>
                <Input placeholder="1000-001" value={companyData.postalCode}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, postalCode: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input placeholder="+351 912 345 678" value={companyData.phone}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleNext}>Saltar</Button>
              <Button onClick={saveCompanyData} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar e Continuar
              </Button>
            </div>
          </div>
        )

      case 2: // First Customer
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do Cliente *</Label>
                <Input placeholder="Nome da empresa" value={customerData.name}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>NIF / B.I</Label>
                <Input placeholder="501234567" value={customerData.fiscalId}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, fiscalId: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@cliente.com" value={customerData.email}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input placeholder="+351 912 345 678" value={customerData.phone}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleNext}>Saltar</Button>
              <Button onClick={saveCustomer} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Cliente
              </Button>
            </div>
          </div>
        )

      case 3: // First Product
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input placeholder="P001" value={productData.code}
                  onChange={(e) => setProductData(prev => ({ ...prev, code: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={productData.type} onValueChange={(v) => setProductData(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRODUCT">Produto</SelectItem>
                    <SelectItem value="SERVICE">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input placeholder="Nome do produto" value={productData.name}
                onChange={(e) => setProductData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Preço *</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={productData.price}
                  onChange={(e) => setProductData(prev => ({ ...prev, price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Taxa de Imposto</Label>
                <Select value={productData.taxRateId} onValueChange={(v) => setProductData(prev => ({ ...prev, taxRateId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {taxRates.map((tax) => (
                      <SelectItem key={tax.id} value={tax.id}>{tax.name} ({tax.rate}%)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleNext}>Saltar</Button>
              <Button onClick={saveProduct} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Produto
              </Button>
            </div>
          </div>
        )

      case 4: // Complete
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Configuração Concluída!</h2>
              <p className="text-muted-foreground mt-2">
                A sua empresa está pronta para usar.<br/>Agora pode começar a faturar!
              </p>
            </div>
            <Button size="lg" onClick={handleComplete} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ir para o Dashboard
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                  index < currentStep ? 'bg-green-500 border-green-500 text-white' :
                  index === currentStep ? 'bg-primary border-primary text-white' :
                  'border-muted-foreground/30 text-muted-foreground/30'
                }`}>
                  {index < currentStep ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${index < currentStep ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle>{STEPS[currentStep].title}</CardTitle>
            <CardDescription>{STEPS[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">{renderStepContent()}</CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {session?.user?.company?.name} • {session?.user?.company?.country === 'PT' ? '🇵🇹 Portugal' : '🇦🇴 Angola'}
        </p>
      </div>
    </div>
  )
}
