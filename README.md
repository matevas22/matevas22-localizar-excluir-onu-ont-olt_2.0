# Netflex ONU Manager

Um sistema completo de gerenciamento e diagnóstico para redes GPON (Gigabit Passive Optical Network). O Netflex ONU Manager facilita a vida de provedores de internet (ISPs) permitindo localizar ONUs, verificar níveis de sinal e gerenciar OLTs de forma centralizada e auditável.

## Funcionalidades Principais

- **Localização de ONU por SN**: Encontre instantaneamente em qual OLT e porta PON uma ONU específica está conectada.
- **Diagnóstico de Sinal em Tempo Real**: Leitura precisa de potência óptica (Rx/Tx) tanto da ONU quanto da OLT.
- **Gerenciamento de OLTs**: Cadastro centralizado de equipamentos (ZTE, Huawei, etc.) com credenciais seguras.
- **Controle de Acesso**: Sistema de usuários com níveis de permissão (Administrador e Técnico).
- **Logs de Auditoria Detalhados**: Registro completo de todas as ações realizadas no sistema, incluindo IP de origem, dispositivo utilizado e detalhes da operação.
- **Performance Otimizada**: Backend assíncrono capaz de consultar múltiplas OLTs simultaneamente.

## Tecnologias Utilizadas

### Frontend

- **React** com **TypeScript** e **Vite** para alta performance.
- **Tailwind CSS** para estilização moderna e responsiva.
- **Framer Motion** para animações fluidas.
- **Lucide React** para ícones intuitivos.

### Backend

- **Python** com **Flask** (API RESTful).
- **SQLAlchemy** para ORM e gerenciamento de banco de dados (SQLite).
- **JWT (JSON Web Tokens)** para autenticação segura.
- **Telnetlib** para comunicação direta com hardware de rede (OLTs).
- **Multi-threading** para execução paralela de comandos em múltiplos dispositivos.

### Infraestrutura

- **Docker** e **Docker Compose** para orquestração de containers.

## Estrutura do Projeto

```bash
sistema_gerenciamento_ont-onu/
├── backend/                  # API Server (Python/Flask)
│   ├── routes/               # Endpoints da API (Auth, ONU, OLT, Admin)
│   ├── utils/                # Utilitários (Telnet, Helpers)
│   ├── models.py             # Modelos do Banco de Dados
│   └── app.py                # Ponto de entrada da aplicação
├── netflex-onu-manager/      # Frontend Client (React/Vite)
│   ├── src/
│   │   ├── components/       # Componentes Reutilizáveis
│   │   ├── pages/            # Telas da Aplicação
│   │   └── services/         # Integração com API (Axios)
└── docker-compose.yml        # Orquestração dos serviços
```

## Como Executar

### Pré-requisitos

- [Docker](https://www.docker.com/) e Docker Compose instalados.
- **OU** [Python 3.10+](https://www.python.org/) e [Node.js 18+](https://nodejs.org/) para execução manual.

### Opção 1: Usando Docker (Recomendado)

1. Clone o repositório:

   ```bash
   git clone https://seu-repositorio.git
   cd sistema_gerenciamento_ont-onu
   ```

2. Suba os containers:

   ```bash
   docker-compose up -d --build
   ```

3. Acesse a aplicação:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5000`

### Opção 2: Execução Manual

#### Backend

1. Navegue até a pasta do backend:
   ```bash
   cd backend
   ```
2. Crie um ambiente virtual e instale as dependências:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate     # Windows
   pip install -r requirements.txt
   ```
3. Inicie o servidor:
   ```bash
   python app.py
   ```

#### Frontend

1. Navegue até a pasta do frontend:
   ```bash
   cd ../netflex-onu-manager
   ```
2. Instale as dependências e inicie:
   ```bash
   npm install
   npm run dev
   ```

## Variáveis de Ambiente

O sistema já vem configurado com valores padrão para desenvolvimento em `backend/config.py`. Para produção, certifique-se de configurar as seguintes variáveis no seu ambiente ou arquivo `.env`:

- `SECRET_KEY`: Chave para sessões do Flask.
- `JWT_SECRET_KEY`: Chave para assinatura de tokens JWT.
- `SQLALCHEMY_DATABASE_URI`: String de conexão com o banco de dados.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Para producion
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build         
   ```

## Licença

Este projeto é proprietário e desenvolvido para uso interno.
