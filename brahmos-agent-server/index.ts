import express, { Request, Response } from "express";
import cors from "cors";
import { blockchainAgent } from "./src/agent-systems/agent";

const app = express();
const PORT: number = Number(process.env.PORT) || 4000;
//safe-wallet-transaction-execution-agent.onrender.com/

https: app.use(express.json());

// ✅ List of Allowed Frontend Origins
const allowedOrigins = [
  "https://safe-wallet-transaction-execution-agent.vercel.app",
  "https://safe-wallet-transaction-execution-agent-rpvm-frontend.vercel.app",
];

// ✅ CORS Middleware - Allow only specific origins
app.use(
  cors({
    origin: (origin, callback) => {
      console.log("🔄 Incoming CORS request from:", origin);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked CORS request from:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET, POST, OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
    credentials: true, // Allow authentication headers
  })
);

// ✅ Handle Preflight (`OPTIONS`) Requests for CORS
//@ts-ignore
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(204);
  }
  res.status(403).json({ error: "Not allowed by CORS" });
});

// ✅ Store Active SSE Clients
let clients: Response[] = [];

// ✅ SSE Connection for Real-Time Updates
app.get("/chat", (req: any, res: any) => {
  const origin = req.headers.origin;

  if (!origin || !allowedOrigins.includes(origin)) {
    console.log("❌ Blocked SSE connection from:", origin);
    return res.status(403).json({ error: "Not allowed by CORS" });
  }

  // ✅ Set CORS Headers for SSE
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // ✅ Add Client to Active SSE Connections
  clients.push(res);

  // ✅ Keep SSE Connection Alive
  const keepAliveInterval = setInterval(() => {
    res.write(":\n\n"); // Comment to prevent disconnection
  }, 30000);

  // ✅ Remove Disconnected Clients
  req.on("close", () => {
    clients = clients.filter((client) => client !== res);
    clearInterval(keepAliveInterval);
  });
});

// ✅ Send User Messages via SSE
app.post("/chat", async (req: Request, res: Response) => {
  const { message, address } = req.body;
  console.log("💬 User Message:", message, address);

  // ✅ Send Message to All SSE Clients
  clients.forEach((client) => {
    client.write(
      `data: ${JSON.stringify({ role: "user_request", content: message })}\n\n`
    );
  });

  // ✅ Stream Langchain Agent Events
  await blockchainAgent({ message, address }, (event, role?: string) => {
    clients.forEach((client) => {
      if (role) {
        client.write(`data: ${JSON.stringify({ role, content: event })}\n\n`);
      } else {
        client.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    });
  });

  res.status(200).json({ success: true });
});

// ✅ Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
);
