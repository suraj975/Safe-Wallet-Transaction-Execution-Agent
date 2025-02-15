"use client";

import { useEffect, useState, useRef } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Transactions from "@/components/pendingTransaction";
import { useAccount } from "wagmi";
import { isValidJSON } from "@/common/utils";
import ReactMarkdown from "react-markdown";

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
  const [showEvents, setShowEvents] = useState(false);
  const [showTransactions, setShowTransactions] = useState(true);
  console.log("graphState---", graphState);
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

  return (
    <>
      <div className="flex w-full justify-end p-2 bg-black text-white">
        <ConnectButton />
      </div>

      <div className="flex flex-col lg:flex-row h-screen">
        {/* Main Content Area */}
        <div
          className={`fixed lg:relative left-0 top-0 h-full bg-gray-950 border-r border-gray-800 transform transition-transform duration-300 ${
            showTransactions
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          } lg:w-96 w-full z-50`}
        >
          <button
            onClick={() => setShowTransactions(!showTransactions)}
            className={`absolute ${
              showTransactions ? "left-0" : "-right-6"
            } top-12 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-l-lg lg:hidden`}
          >
            {showTransactions ? "◀" : "▶"}
          </button>
          <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-lg font-bold text-cyan-300 mb-4">
              💳 Transactions
            </h2>
            {transaction.length > 0 ? (
              transaction.map((component, index) => (
                <Transactions
                  key={index}
                  transaction={
                    transaction[index] as {
                      to: string;
                      data: string;
                      value: string;
                    }
                  }
                  graphState={graphState[index]}
                />
              ))
            ) : (
              <p className="text-gray-400 text-center">
                No transactions yet...
              </p>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center p-8 pb-20 gap-6 bg-black text-white overflow-hidden">
          <div className="w-full max-w-3xl space-y-6">
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
            <div className="w-full p-4 border border-cyan-600 rounded-lg bg-gray-900 shadow-lg h-96 overflow-y-auto">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  } mb-2`}
                >
                  <ReactMarkdown
                    className={`inline-block p-3 rounded-lg text-sm font-mono ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-cyan-300"
                    }`}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ))}
            </div>

            {/* Input Box */}
            <div className="flex w-full">
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
          </div>
        </div>

        {/* Events Drawer */}
        <div
          className={`fixed lg:relative right-0 top-0 h-full lg:h-auto bg-gray-950 border-l border-gray-800 transform transition-transform duration-300 ${
            showEvents ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          } lg:w-96 w-full z-50`}
        >
          <button
            onClick={() => setShowEvents(!showEvents)}
            className={`absolute ${
              showEvents ? "right-0" : "-left-5"
            } top-10 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-l-lg lg:hidden`}
          >
            {showEvents ? "▶" : "◀"}
          </button>

          <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-lg font-bold text-cyan-300 mb-4">
              🔍 Event Logs
            </h2>
            <div className="space-y-2">
              {events.length > 0 ? (
                events.map((event, index) => {
                  const isRolType =
                    isValidJSON(event) && JSON.parse(event)?.role;
                  return (
                    <div
                      key={index}
                      className={`${
                        isRolType ? "border-t-4 border-orange-700" : ""
                      }`}
                    >
                      <pre className="text-xs p-2 bg-gray-900 text-white border border-gray-800 rounded-md overflow-x-auto break-words">
                        {event}
                      </pre>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-400 text-center">
                  Waiting for events...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
