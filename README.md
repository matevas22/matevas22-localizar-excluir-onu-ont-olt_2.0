# Netflex ONU Manager

Sistema completo de gerenciamento e diagnóstico para redes GPON (Gigabit Passive Optical Network). O Netflex ONU Manager permite que provedores de internet (ISPs) localizem ONUs, verifiquem níveis de sinal e gerenciem OLTs de forma centralizada e auditável.

## Funcionalidades

- **Localização de ONU por SN** — Localize rapidamente em qual OLT e porta PON uma ONU está conectada.
- **Diagnóstico de sinal em tempo real** — Leitura de potência óptica (Rx/Tx) na ONU e na OLT.
- **Gerenciamento de OLTs** — Cadastro centralizado de equipamentos (ZTE, Huawei, etc.) com credenciais seguras.
- **Controle de acesso** — Usuários com níveis de permissão (Administrador e Técnico).
- **Logs de auditoria** — Registro de todas as ações, incluindo IP de origem, dispositivo e detalhes da operação.
- **Performance** — Backend assíncrono que consulta múltiplas OLTs em paralelo.

## Tecnologias

### Frontend

- React com TypeScript e Vite
- Tailwind CSS para estilização responsiva
- Framer Motion para animações
- Lucide React para interface

### Backend

- Python com Flask (API REST)
- SQLAlchemy para ORM e SQLite
- JWT para autenticação
- Telnetlib para comunicação com OLTs
- Multi-threading para execução paralela em múltiplos dispositivos

### Infraestrutura

- Docker e Docker Compose

## Estrutura do Projeto

```
sistema_gerenciamento_ont-onu/
├── backend/                  # API (Python/Flask)
│   ├── routes/               # Endpoints (Auth, ONU, OLT, Admin)
│   ├── utils/                # Telnet, helpers
│   ├── models.py             # Modelos do banco
│   └── app.py                # Entrada da aplicação
├── netflex-onu-manager/      # Frontend (React/Vite)
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── pages/            # Telas
│   │   └── services/         # Integração com API (Axios)
└── docker-compose.yml        # Orquestração dos serviços
```

## Como executar

### Pré-requisitos

- Docker e Docker Compose
- Ou Python 3.10+ e Node.js 18+ para execução manual

### Com Docker (recomendado)

1. Clone o repositório:

   ```bash
   git clone https://seu-repositorio.git
   cd sistema_gerenciamento_ont-onu
   ```

2. Inicie os containers:

   ```bash
   docker-compose up -d --build
   ```

3. Acesse:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

### Execução manual

**Backend**

```bash
cd backend
python -m venv venv
# Linux/Mac:  source venv/bin/activate
# Windows:    venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Frontend**

```bash
cd netflex-onu-manager
npm install
npm run dev
```

## Produção

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Variáveis de ambiente

O sistema usa valores padrão em `backend/config.py`. Para produção, configure:

- `SECRET_KEY` — Chave para sessões do Flask
- `JWT_SECRET_KEY` — Chave para assinatura de tokens JWT
- `SQLALCHEMY_DATABASE_URI` — String de conexão do banco de dados

## Contribuição

Contribuições são bem-vindas. Abra issues ou envie pull requests.

## Licença

Projeto proprietário para uso interno.
