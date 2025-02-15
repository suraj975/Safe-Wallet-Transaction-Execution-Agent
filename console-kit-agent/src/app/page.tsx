"use client";

import { useEffect, useState, useRef } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import PendingTransaction from "@/components/pendingTransaction";
import { useAccount } from "wagmi";

export default function ChatUI() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [transaction, setTransaction] = useState<unknown[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [graphState, setGraphState] = useState<
    {
      accountAddress: string;
      chainId: number;
      inputTokenAmount: string;
      receiverAddress: string;
      tokenAddress: string;
      type: "send_token" | "bridge_token" | "swap_token_call";
    }[]
  >([]);
  const [userInput, setUserInput] = useState("");
  const [connected, setConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null); // Store SSE connection
  const { address } = useAccount();

  // Function to set up SSE listeners
  const setupEventListeners = (eventSource: EventSource) => {
    eventSource.onopen = () => {
      console.log("SSE Connection Opened");
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse?.(event.data);
        console.log("Received SSE message:", data);

        if (data.role === "user" || data.role === "assistant") {
          setMessages((prev) => [...prev, data]);
        } else if (data.role === "tools") {
          setTransaction((prev) => [...prev, data?.content?.transactions?.[0]]);
        } else if (data.role === "graph_state") {
          setGraphState((prev) => [...prev, data?.content]);
        } else {
          setEvents((prev) => [...prev, JSON.stringify(data, null, 2)]);
        }
      } catch (error) {
        console.log("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = () => {
      console.log("SSE Connection Error, retrying in 5s...");
      setConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Reconnect after 5 seconds
      setTimeout(() => {
        if (!eventSourceRef.current) {
          console.log("Reconnecting SSE...");
          eventSourceRef.current = new EventSource(
            "http://localhost:3001/chat"
          );
          setupEventListeners(eventSourceRef.current);
        }
      }, 5000);
    };
  };

  useEffect(() => {
    if (!eventSourceRef.current) {
      console.log("Initializing SSE connection...");
      eventSourceRef.current = new EventSource("http://localhost:3001/chat");
      setupEventListeners(eventSourceRef.current);
    }

    return () => {
      console.log("Closing SSE connection...");
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: userInput }]);

    try {
      await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput, address }),
      });
    } catch (error) {
      console.log("Error sending message:", error);
    }

    setUserInput("");
  };

  const chatStyle = !transaction?.length
    ? "lg:w-[100%] items-center"
    : "lg:w-[50%]";

  return (
    <>
      <div className="flex w-full justify-end p-2 bg-black text-white">
        <ConnectButton />
      </div>
      <div className="flex flex-col lg:flex-row">
        <div
          className={`flex w-full ${chatStyle} flex-col items-center min-h-screen p-8 pb-20 gap-6 bg-black text-white`}
        >
          <h1 className="text-3xl w-full flex justify-center font-bold text-cyan-400 tracking-wide">
            🧠 Agentic AI Chat
          </h1>
          <p
            className={`text-sm w-full flex justify-center ${
              connected ? "text-green-400" : "text-red-400"
            }`}
          >
            {connected ? "Connected" : "Reconnecting..."}
          </p>

          {/* Chat Box */}
          <div className="w-full max-w-3xl p-4 border border-cyan-600 rounded-lg bg-gray-900 shadow-lg overflow-y-auto h-96">
            {messages.length > 0 ? (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  } mb-2`}
                >
                  <span
                    className={`inline-block p-3 rounded-lg text-sm font-mono ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-cyan-300"
                    }`}
                  >
                    {msg.content}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center">
                Start a conversation with the AI...
              </p>
            )}
          </div>

          {/* Input Box */}
          <div className="flex w-full max-w-3xl">
            <input
              type="text"
              className="w-full p-3 border border-gray-700 bg-gray-800 text-white rounded-l-lg outline-none focus:border-cyan-500"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type a message..."
            />
            <button
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 rounded-r-lg transition-all"
              onClick={sendMessage}
            >
              🚀
            </button>
          </div>

          {/* Events Panel */}
          <div className="w-full max-w-3xl p-4 border border-gray-700 rounded-lg bg-gray-950 shadow-lg overflow-y-auto h-60">
            <h2 className="text-lg font-bold text-cyan-300 mb-2">
              🔍 Event Logs
            </h2>
            {events.length > 0 ? (
              events.map((event, index) => (
                <pre
                  key={index}
                  className="text-xs p-2 bg-gray-800 border w-full border-gray-700 rounded-md mb-2 overflow-x-auto break-words whitespace-pre-wrap"
                >
                  {event}
                </pre>
              ))
            ) : (
              <p className="text-gray-400 text-center">Waiting for events...</p>
            )}
          </div>
        </div>
        {transaction?.length > 0 && (
          <div className="h-screen w-full lg:w-[50%]  text-white p-8 pb-20 gap-6">
            <div>
              <h1 className="text-3xl flex justify-center font-bold text-cyan-400 tracking-wide mb-[80px]">
                Transactions
              </h1>
            </div>
            <div className="overflow-y-auto  flex justify-center flex-wrap gap-4">
              {transaction?.map((component, index) => (
                <div key={index} className=" min-w-[40%]">
                  <PendingTransaction
                    transaction={
                      transaction[index] as {
                        to: string;
                        data: string;
                        value: string;
                      }
                    }
                    graphState={graphState[index]}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
