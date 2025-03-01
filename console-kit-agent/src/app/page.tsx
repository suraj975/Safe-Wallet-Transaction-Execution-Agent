"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Transactions from "@/components/pendingTransaction";
import { useAccount } from "wagmi";
import { isValidJSON } from "@/common/utils";
import ReactMarkdown from "react-markdown";
import { ToolTransactionType } from "@/type";
import {
  CustomAccordion,
  CustomAccordionItem,
} from "./components/exmaples-accordion";

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
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const eventEndRef = useRef<HTMLDivElement>(null);
  const transactionEndRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      eventEndRef.current?.scrollIntoView({ behavior: "smooth" });
      transactionEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100); // Short delay to allow DOM updates
  }, [events]);

  const [showTransactions, setShowTransactions] = useState(false);
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
            "https://safe-wallet-transaction-execution-agent.onrender.com/chat"
          );
          setupEventListeners(eventSourceRef.current);
        }
      }, 5000);
    };
  };

  useEffect(() => {
    if (!eventSourceRef.current) {
      console.log("Initializing SSE connection...");
      eventSourceRef.current = new EventSource(
        "https://safe-wallet-transaction-execution-agent.onrender.com/chat"
      );
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
    setLoading(true);
    try {
      await fetch(
        "https://safe-wallet-transaction-execution-agent.onrender.com/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userInput, address }),
        }
      );
    } catch (error) {
      console.log("Error sending message:", error);
    }

    setUserInput("");
    setLoading(false);
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
            className={`absolute zIndex-9999 ${
              showTransactions ? "left-0" : "-right-6"
            } top-12 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-l-lg lg:hidden`}
          >
            {showTransactions ? "◀" : "▶"}
          </button>

          {/* Scrollable container */}
          <div className="p-4 h-full flex flex-col">
            {/* Sticky header */}
            <h2 className="text-lg font-bold text-cyan-300 mb-4 bg-gray-950 p-2 sticky top-0 -z-10 border-b border-gray-800">
              💳 Transactions
            </h2>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {transaction.length > 0 ? (
                transaction.map((component, index) => (
                  <Transactions
                    key={index}
                    transaction={
                      transaction[index] as
                        | ToolTransactionType
                        | ToolTransactionType[]
                    }
                    graphState={graphState[index]}
                  />
                ))
              ) : (
                <p className="text-gray-400 text-center">
                  No transactions yet...
                </p>
              )}
              {/* Scrolling anchor */}
              <div ref={transactionEndRef} />
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center p-6 pb-20 gap-6 bg-black text-white overflow-hidden">
          <div className="w-full max-w-3xl space-y-2">
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
            <div
              className={`w-full p-4 rounded-lg bg-gray-900 shadow-lg h-96 overflow-y-auto relative border-4 
                ${
                  loading
                    ? "border-transparent animate-border"
                    : "border-cyan-600"
                }`}
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-end gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  } mb-3`}
                >
                  {/* Bot Avatar */}
                  {msg.role !== "user" && (
                    <img
                      src="/bot.png"
                      alt="Agent"
                      className="w-9 h-9 rounded-full border border-cyan-500"
                    />
                  )}

                  <div
                    className={`max-w-[75%] p-3 rounded-xl text-sm font-mono shadow-md ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-800 text-cyan-300 rounded-bl-none"
                    }`}
                  >
                    <ReactMarkdown className="break-words">
                      {msg.content}
                    </ReactMarkdown>
                    <div className="text-xs text-gray-400 mt-1 text-right">
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* User Avatar */}
                  {msg.role === "user" && (
                    <img
                      src="/profile.png"
                      alt="User"
                      className="w-9 h-9 rounded-full border border-blue-500"
                    />
                  )}
                </div>
              ))}
              {/* Invisible div for auto-scroll */}
              <div ref={chatEndRef} />
            </div>

            {/* Input Box */}
            <div className="flex w-full">
              <input
                type="text"
                disabled={loading}
                className={`w-full p-3 border rounded-l-lg outline-none transition-all
                  ${
                    loading
                      ? "border-gray-600 bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "border-gray-700 bg-gray-800 text-white focus:border-cyan-500"
                  }`}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type a message..."
              />

              <button
                className={`px-5 rounded-r-lg transition-all flex items-center justify-center h-13 w-10
                  ${
                    loading
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-cyan-600 hover:bg-cyan-500 text-white"
                  }`}
                onClick={sendMessage}
                disabled={loading}
              >
                {loading ? (
                  <span className="text-xl fly-animation">🚀</span>
                ) : (
                  "🚀"
                )}
              </button>
            </div>
            <div className="!mt-4">
              <CustomAccordion>
                <CustomAccordionItem title="Simple Transactions Examples">
                  <p>
                    1. Send 100 USDC from
                    0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to
                    0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Ethereum
                  </p>
                  <p>
                    2. Can you swap 100 of this token USDC to WBTC on base chain
                  </p>
                  <p>
                    3. Can you swap 100 of this token address
                    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC) to
                    0x0555E30da8f98308EdB960aa94C0Db47230d2B9c (WBTC) on base
                    chain
                  </p>
                  <p>
                    4. Can you send 10000000000000000000 DAI from Base to
                    Arbitrum
                  </p>
                </CustomAccordionItem>
                <CustomAccordionItem title="Combined Transactions Examples">
                  <p>
                    1. Send 100 USDC from
                    0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to
                    0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Ethereum and
                    also send 500 USDC from
                    0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to
                    0x942d35Cc6634C0532925a3b844Bc454e4438f44e on ethereum
                  </p>
                  <p>
                    2. Send 100 USDC from
                    0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to
                    0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Ethereum and
                    also send 500 USDC from
                    0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to
                    0x942d35Cc6634C0532925a3b844Bc454e4438f44e on ethereum and
                    also Can you swap 100 of this token address
                    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC) to
                    0x0555E30da8f98308EdB960aa94C0Db47230d2B9c (WBTC) on base
                    chain and also can you send 10000000000000000000 DAI from
                    Base to Arbitrum chain
                  </p>
                </CustomAccordionItem>
              </CustomAccordion>
            </div>
            <div className="text-gray-400 text-xs">
              Currently, swaps are only working for Base, Arbitrum mainnet
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
            className={`absolute z-90 ${
              showEvents ? "right-0" : "-left-5"
            } top-10 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-l-lg lg:hidden`}
          >
            {showEvents ? "▶" : "◀"}
          </button>

          {/* Scrollable container */}
          <div className="p-4 h-full flex flex-col">
            {/* Sticky header */}
            <h2 className="text-lg   font-bold text-cyan-300 mb-4 bg-gray-950 p-2 sticky top-0 -z-10 border-b border-gray-800">
              🔍 Event Logs
            </h2>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
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
                        <pre
                          className={`text-xs p-2 bg-gray-900 ${
                            isRolType ? "text-orange-400" : "text-green-300"
                          } border border-gray-800 rounded-md overflow-x-auto break-words`}
                        >
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
              {/* Scrolling anchor */}
              <div ref={eventEndRef} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
