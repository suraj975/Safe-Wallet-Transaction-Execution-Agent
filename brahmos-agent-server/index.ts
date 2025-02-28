import express, { Request, Response } from "express";
import { blockchainAgent } from "./src/agent-systems/agent";
import cors from "cors";

const app = express();
const PORT: number = Number(process.env.PORT) || 3001;

app.use(express.json());
const allowedOrigins = [
  "https://safe-wallet-transaction-execution-agent.vercel.app",
  "https://safe-wallet-transaction-execution-agent-rpvm-frontend.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,POST",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true, // Allow cookies & authentication headers
  })
);

let clients: Response[] = []; // Store active connections

// SSE connection for real-time events
app.get("/chat", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  clients.push(res); // Add client to the list

  const keepAliveInterval = setInterval(() => {
    res.write(" \n\n");
  }, 30000);

  req.on("close", () => {
    clients = clients.filter((client) => client !== res);
    clearInterval(keepAliveInterval);
  });
});

// Send user messages
app.post("/chat", async (req: Request, res: Response) => {
  const { message, address } = req.body;
  console.log("User Message:", message, address);

  // Send message to all connected SSE clients
  clients.forEach((client) => {
    client.write(
      `data: ${JSON.stringify({ role: "user_request", content: message })}\n\n`
    );
  });

  // Stream Langchain agent events
  await blockchainAgent({ message, address }, (event, role?: any) => {
    clients.forEach((client) => {
      if (role) {
        if (role === "assistant")
          client.write(
            `data: ${JSON.stringify({ role: "assistant", content: event })}\n\n`
          );
        else if (role === "graph_state") {
          client.write(
            `data: ${JSON.stringify({ role: "graph_state", content: event })}\n\n`
          );
        } else if (role === "tools")
          client.write(
            `data: ${JSON.stringify({ role: "tools", content: event })}\n\n`
          );
      } else client.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  });

  res.status(200).json({ success: true });
});

app.listen(PORT, () =>
  console.log(`Server is running on http://localhost:${PORT}`)
);

if (process.env.NODE_ENV !== "production") {
  console.log("Nodemon is watching for changes...");
}
