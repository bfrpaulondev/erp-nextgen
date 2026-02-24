# 🚀 ERP Next-Gen

Um ERP revolucionário focado no mercado de **Portugal** e **Angola**, construído para superar a concorrência atual em três pilares: **Performance**, **Experiência do Utilizador (UI/UX)** e **Inteligência**.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue?logo=postgresql)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Diferenciais Chave ("Killer Features")

### 🌐 Motor Fiscal Híbrido
Conformidade legislativa automática em tempo real para Portugal e Angola (ex: atualização de taxas de IVA/IGVA via Cloud sem patches manuais).

### 📡 Arquitetura Offline-First
Funcionalidade total sem internet (crucial para o mercado angolano), com sincronização automática quando a conexão retorna.

### 📊 Contabilidade Automática
Cada fatura ou movimento gera automaticamente os lançamentos contabilísticos no plano de contas, sem intervenção manual do utilizador.

### 🚢 Hub Logístico Lusófono
Gestão visual do ciclo de importação/exportação entre os dois países.

### 🎨 UI Moderna
Interface limpa, rápida e responsiva (nível Apple/Stripe), abandonando o visual "Windows 95" da concorrência.

## 🛠️ Stack Tecnológica

| Categoria | Tecnologia |
|-----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Linguagem** | TypeScript (Strict mode) |
| **Banco de Dados** | PostgreSQL (Supabase) |
| **ORM** | Prisma |
| **Cache** | Redis |
| **UI/Design** | Tailwind CSS + Shadcn/UI + Framer Motion |
| **Autenticação** | NextAuth.js |
| **Ícones** | Lucide React |

## 📁 Estrutura de Pastas

```
src/
├── app/                    # Rotas (Next.js App Router)
│   ├── (auth)/             # Login/Registro (Layout sem sidebar)
│   ├── (dashboard)/        # App Principal (Layout com sidebar)
│   │   ├── faturacao/
│   │   ├── contabilidade/
│   │   └── dashboard/
│   └── api/                # Server Actions e Rotas de API
├── components/
│   ├── ui/                 # Componentes base (Shadcn)
│   └── shared/             # Sidebar, Navbar, Data Tables
├── lib/                    # Utilitários (Prisma client, Redis client, helpers)
├── modules/                # Lógica de Negócio (Core)
│   ├── faturacao/          # Serviços de faturação
│   ├── contabilidade/      # Serviços de diário/razão
│   └── stock/              # Serviços de stock
├── styles/
└── types/                  # Tipagens globais TypeScript
```

## 🗄️ Modelos de Dados (Prisma Schema)

- **Company**: (Multi-tenant) - id, name, nif, country ("PT"/"AO"), currency ("EUR"/"AOA")
- **User**: (Autenticação) - id, email, name, role, companyId
- **Party**: (Entidades) - id, name, fiscalId, type ("CUSTOMER", "SUPPLIER"), companyId
- **Account**: (Plano de Contas) - id, code, name, type ("ASSET", "LIABILITY", etc.), companyId
- **Item**: (Produtos/Serviços) - id, code, name, price, taxRate, companyId
- **Invoice**: (Documentos) - id, number, date, status, totalAmount, customerId, companyId
- **InvoiceLineItem**: (Linhas da Fatura) - id, description, quantity, unitPrice, invoiceId
- **LedgerEntry**: (Diário Contabilístico) - id, description, debit, credit, date, accountId, sourceId, companyId

## 🚀 Quick Start

### 1. Clonar o repositório

```bash
git clone https://github.com/bfrpaulondev/erp-nextgen.git
cd erp-nextgen
```

### 2. Instalar dependências

```bash
bun install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` com:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# NextAuth.js
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Redis
REDIS_URL="redis://localhost:6379"
```

### 4. Executar migrations

```bash
bun run db:migrate
```

### 5. Iniciar servidor de desenvolvimento

```bash
bun run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📅 Roadmap de Desenvolvimento

### ✅ Fase 0: Fundação e Arquitetura (Concluída)
- [x] Setup Next.js 15 com TypeScript
- [x] Schema Prisma para PostgreSQL
- [x] Autenticação com NextAuth.js
- [x] Layout Base com Sidebar e Navbar
- [x] Páginas de Login e Registro
- [x] Geração automática do Plano de Contas (SNC/POC)

### ✅ Fase 1: O Núcleo e Onboarding (Concluída)
- [x] Onboarding Inteligente (Wizard pós-registro)
- [x] Gestão de Entidades (CRUD completo)
- [x] Validação de NIF (Portugal) e B.I (Angola)

### 📋 Fase 2: MVP de Faturação e Stock
- [x] Gestão de Produtos/Serviços
- [ ] Emissão de Faturas
- [ ] Stock Básico

### 📊 Fase 3: Motor Contabilístico & Financeiro
- [ ] Lançamento Automático
- [ ] Tesouraria (Recibos)
- [ ] Multi-Moeda

### 📡 Fase 4: Arquitetura Offline-First
- [ ] Service Workers
- [ ] IndexedDB (Local Database)
- [ ] Sincronização Inteligente

### 🤖 Fase 5: Inteligência e Analytics
- [ ] Dashboard Dinâmico
- [ ] Assistente IA
- [ ] Relatórios Oficiais

## 💰 Suporte Multi-Moeda

O sistema suporta nativamente:
- **€ (EUR)** - Euro para Portugal
- **Kz (AOA)** - Kwanza para Angola

## 📊 Planos de Contas

### Portugal (SNC)
- Classe 1: Meios Financeiros
- Classe 2: Terceiros
- Classe 3: Inventários
- Classe 4: Investimentos
- Classe 5: Capital e Reservas
- Classe 6: Gastos
- Classe 7: Rendimentos
- Classe 8: Impostos (IVA)

### Angola (POC)
- Adaptado para o Plano Oficial de Contas angolano
- Taxas de IGVA configuradas (14% normal, 7% reduzido)

## 🔐 Autenticação e Autorização

Sistema de roles:
- **ADMIN**: Acesso total
- **MANAGER**: Gestão operacional
- **ACCOUNTANT**: Acesso contabilístico
- **USER**: Utilizador básico

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuir

1. Fork o projeto
2. Crie uma branch para a feature (`git checkout -b feature/AmazingFeature`)
3. Commit as mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

Desenvolvido com ❤️ para o mercado lusófono.
