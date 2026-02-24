import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("netflex.db");
const JWT_SECRET = process.env.JWT_SECRET || "netflex-secret-key";

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'tech'
  );
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT,
    details TEXT,
    ip TEXT,
    system TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
}

const app = express();
app.use(express.json());
app.use(cors());

const logAction = (req: any, userId: number, username: string, action: string, details: string) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const system = req.headers['user-agent'];
  db.prepare("INSERT INTO logs (user_id, username, action, details, ip, system) VALUES (?, ?, ?, ?, ?, ?)").run(userId, username, action, details, ip, system);
};

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};


app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  console.log(`Tentativa de login: ${username}`);
  const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (user) {
    console.log(`Usuário encontrado: ${user.username}, validando senha...`);
    if (bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
      logAction(req, user.id, user.username, "LOGIN", "Usuário logou no sistema");
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      console.log(`Senha incorreta para o usuário: ${username}`);
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  } else {
    console.log(`Usuário não encontrado: ${username}`);
    res.status(401).json({ error: "Credenciais inválidas" });
  }
});

const OLTS = Array.from({ length: 19 }, (_, i) => ({
  id: `PJT-${i + 1}`,
  name: `OLT PJT ${i + 1}`,
  ip: `10.0.${i + 1}.1`
}));

const simulateTelnet = async (sn: string) => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const examples: Record<string, any> = {
    "ZTEG12345678": { status: "Working", rxOnu: -19.5, txOnu: 2100, rxOlt: -22.1, txOlt: 3200, olt: "OLT PJT 1", interface: "gpon-olt_1/1/1:1" },
    "HWTC87654321": { status: "Offline", rxOnu: -40.0, txOnu: 0, rxOlt: -40.0, txOlt: 0, olt: "OLT PJT 5", interface: "gpon-olt_1/1/2:10" },
    "ALCL1A2B3C4D": { status: "Working", rxOnu: -26.8, txOnu: 2450, rxOlt: -24.5, txOlt: 3100, olt: "OLT PJT 10", interface: "gpon-olt_1/1/5:42" },
    "NETF00000001": { status: "DyingGasp", rxOnu: -32.1, txOnu: 1800, rxOlt: -28.4, txOlt: 3050, olt: "OLT PJT 19", interface: "gpon-olt_1/1/16:127" }
  };

  if (examples[sn]) {
    const ex = examples[sn];
    const olt = OLTS.find(o => o.name === ex.olt) || OLTS[0];
    return {
      sn,
      olt: olt.name,
      ip: olt.ip,
      interface: ex.interface,
      status: ex.status,
      signals: {
        rxOnu: ex.rxOnu,
        txOnu: ex.txOnu,
        rxOlt: ex.rxOlt,
        txOlt: ex.txOlt
      }
    };
  }

  const hash = sn.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const oltIndex = hash % OLTS.length;
  const olt = OLTS[oltIndex];
  
  const rxOnu = -15 - (hash % 15); // -15 to -30
  const txOnu = 2000 + (hash % 1000);
  const rxOlt = -20 - (hash % 10);
  const txOlt = 3000 + (hash % 500);
  
  const statuses = ["Working", "LOS", "Offline", "DyingGasp"];
  const status = statuses[hash % statuses.length];

  return {
    sn,
    olt: olt.name,
    ip: olt.ip,
    interface: `gpon-olt_1/1/${hash % 16}:${hash % 128}`,
    status,
    signals: {
      rxOnu,
      txOnu,
      rxOlt,
      txOlt
    }
  };
};

app.post("/api/onu/locate", authenticateToken, async (req: any, res) => {
  const { sn } = req.body;
  if (!sn || sn.length !== 12) {
    return res.status(400).json({ error: "SN inválido (deve ter 12 caracteres)" });
  }

  try {
    const result = await simulateTelnet(sn);
    logAction(req, req.user.id, req.user.username, "LOCALIZAR", `Busca por SN: ${sn}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao conectar com as OLTs" });
  }
});

app.get("/api/onu/signal/:sn", authenticateToken, async (req: any, res) => {
  const { sn } = req.params;
  try {
    const result = await simulateTelnet(sn);
    logAction(req, req.user.id, req.user.username, "SINAL", `Diagnóstico de sinal SN: ${sn}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao obter sinais" });
  }
});

app.delete("/api/onu/:sn", authenticateToken, async (req: any, res) => {
  const { sn } = req.params;
  logAction(req, req.user.id, req.user.username, "EXCLUIR", `Exclusão de ONU SN: ${sn}`);
  res.json({ message: "ONU excluída com sucesso!" });
});

app.post("/api/auth/change-password", authenticateToken, (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

  if (user && bcrypt.compareSync(currentPassword, user.password)) {
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, req.user.id);
    logAction(req, user.id, user.username, "ALTERAR_SENHA", "Alterou a própria senha");
    res.json({ message: "Senha alterada com sucesso" });
  } else {
    res.status(400).json({ error: "Senha atual incorreta" });
  }
});

// Admin Routes
app.get("/api/admin/users", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const users = db.prepare("SELECT id, username, role FROM users").all();
  res.json(users);
});

app.post("/api/admin/users", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { username, password, role } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, hashedPassword, role);
    logAction(req, req.user.id, req.user.username, "ADMIN_CRIAR_USUARIO", `Criou usuário: ${username}`);
    res.json({ message: "Usuário criado" });
  } catch (e) {
    res.status(400).json({ error: "Usuário já existe" });
  }
});

app.delete("/api/admin/users/:id", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { id } = req.params;
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: "Não pode excluir a si mesmo" });
  
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  logAction(req, req.user.id, req.user.username, "ADMIN_EXCLUIR_USUARIO", `Excluiu usuário ID: ${id}`);
  res.json({ message: "Usuário excluído" });
});

app.get("/api/admin/logs", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const logs = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100").all();
  res.json(logs);
});

// Stats for dashboard
app.get("/api/user/stats", authenticateToken, (req: any, res) => {
  const stats = db.prepare(`
    SELECT action, COUNT(*) as count 
    FROM logs 
    WHERE user_id = ? 
    GROUP BY action
  `).all(req.user.id);
  res.json(stats);
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
