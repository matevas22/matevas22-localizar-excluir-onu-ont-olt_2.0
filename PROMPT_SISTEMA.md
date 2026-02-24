# PROMPT PARA CRIAR O SISTEMA DE GERENCIAMENTO ONU/ONT (REACT + FLASK)

## DESCRIÇÃO DO SISTEMA

Crie um sistema web completo de gerenciamento de ONU/ONT (equipamentos de rede GPON) utilizando uma arquitetura moderna com **Backend em Python (Flask)** e **Frontend em React**. O sistema permite que técnicos de telecomunicações localizem, verifiquem e excluam ONUs/ONTs conectadas a múltiplas OLTs através de conexões Telnet.

### ARQUITETURA DO SISTEMA:

1.  **Backend (API RESTful - Flask):**
    - Gerencia a lógica de negócios, conexão Telnet com as OLTs, autenticação e banco de dados.
    - Expõe endpoints JSON para o frontend.
2.  **Frontend (React - Single Page Application):**
    - Interface do usuário interativa e responsiva.
    - Consome a API do backend via requisições HTTP (Axios/Fetch).

### FUNCIONALIDADES E REQUISITOS:

#### 1. Autenticação e Segurança (Backend & Frontend)

- **Login:** Tela com usuário e senha.
- **Autenticação:** Uso de JWT (JSON Web Tokens) ou Sessões seguras.
- **Banco de Dados:** SQLite para usuários e logs.
- **Criptografia:** Senhas armazenadas com hash bcrypt.
- **Controle de Acesso:**
  - Rota protegida para `/admin` (apenas usuário "admin").
  - Rotas protegidas para `/home` (usuários técnicos).
  - Redirecionamento automático baseado no nível de acesso após login.

#### 2. Área Principal (Home) - Usuários Técnicos

Deve ser uma aplicação React com navegação por abas ou menu lateral, contendo:

- **Módulo 1: Localizar e Excluir ONU/ONT**
  - Input para busca por SN (12 caracteres).
  - Exibição do resultado (OLT identificada, Interface, Status).
  - Funcionalidade de Exclusão com modal de confirmação.
- **Módulo 2: Diagnóstico de Potência (Sinais)**
  - Busca por SN.
  - Cards ou Tabela exibindo:
    - Sinal RX/TX da ONU.
    - Sinal RX/TX da OLT.
  - **Validação Visual:** Cores indicativas (Verde = Bom, Vermelho = Crítico) baseadas nas regras de negócio.
  - Status da ONU traduzido (ex: Working, LOS, Offline).
- **Módulo 3: Perfil/Alterar Senha**
  - Formulário para alteração da própria senha.
- **Dashboard Pessoal:**
  - Gráfico (Pizza/Rosca) mostrando ações realizadas pelo usuário na sessão ou período (ex: "Verificações" vs "Exclusões").

#### 3. Painel Administrativo (Admin)

- **CRUD de Usuários:** Listar, Criar, Excluir (exceto o próprio admin) e Resetar senhas.
- **Visualizador de Logs:** Tabela com paginação/scroll mostrando logs do sistema (Quem fez, O que fez, Quando).

#### 4. Sistema de Logs (Backend)

- Middleware ou função decoradora no Flask para registrar ações críticas (Login, Busca, Exclusão, Alteração de Senha).

### ESPECIFICAÇÕES TÉCNICAS (BACKEND - FLASK):

- **Conectividade:** O backend deve manter a lista de 19 OLTs (PJT 1 a PJT 22) com IPs.
- **Telnet:** Utilizar `telnetlib` ou biblioteca similar para executar comandos nas OLTs.
- **Comandos de Referência:**
  - `show gpon onu by sn {sn}`
  - `show gpon onu state {interface}`
  - `show pon power ...` (rx/tx olt/onu)
  - `conf t`, `interface ...`, `no onu {index}` (para exclusão)
- **Endpoints Sugeridos:**
  - `POST /api/auth/login`
  - `POST /api/onu/locate` (busca em todas as OLTs)
  - `GET /api/onu/signal/{sn}`
  - `DELETE /api/onu/{sn}`
  - `GET /admin/users`, `POST /admin/users`
  - `GET /admin/logs`

### ESPECIFICAÇÕES VISUAIS (FRONTEND - REACT):

- **Estilo:** Design limpo, profissional (Dashboard).
- **Biblioteca de UI:** Sugestão de uso de Material UI, Chakra UI, Tailwind CSS ou Styled Components.
- **Componentes Chave:**
  - Cards para exibir informações de sinal.
  - Alertas/Toasts para feedback de sucesso/erro (ex: "ONU Removida com sucesso!").
  - Loaders/Spinners durante as requisições Telnet (que podem ser lentas).
- **Login:** Layout centralizado, logo "Netflex", rodapé com créditos.

### REGRAS DE NEGÓCIO E VALIDAÇÕES:

- **Sinal Óptico:**
  - Alerta Crítico se: RX ONU < -28 ou > -8.
  - Alerta TX se fora de 0 a 7000 (exemplo).
- **SN:** Validação de 12 caracteres alfanuméricos.
- **Segurança:** O frontend não deve ter as credenciais Telnet; estas ficam apenas no Backend.

### BIBLIOTECAS RECOMENDADAS:

**Backend (Python):**

- `flask` (API)
- `flask-cors` (Permitir requisições do React)
- `flask-jwt-extended` (Autenticação)
- `bcrypt` (Hash de senhas)
- `sqlite3` (Banco de dados)
- `telnetlib3` ou `telnetlib` (Comunicação OLT)

**Frontend (Javascript/Typescript):**

- `react`
- `axios` (Requisições HTTP)
- `react-router-dom` (Navegação)
- `chart.js` ou `recharts` (Gráficos)
- `react-toastify` (Notificações)

---

**NOTA:** O código deve ser modular. O Backend deve tratar erros de conexão com as OLTs (timeouts, falhas) e retornar códigos HTTP apropriados para o Frontend tratar visualmente.
