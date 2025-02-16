import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
  START,
  END,
  MemorySaver,
} from "@langchain/langgraph";
import dotenv from "dotenv";
dotenv.config();
import { ChatOpenAI } from "@langchain/openai";
import {
  extractTransactionJSON,
  isValidJSON,
  modifyValuesAsPerRequirement,
} from "./utils";
import { ALL_TOOLS_LIST } from "./tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";
import { TransactionSchema } from "./schemas";
import { z } from "zod";

const OPEN_API_KEY = process.env.OPEN_API_KEY;

const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
  apiKey: OPEN_API_KEY,
});

const GraphAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  transaction: Annotation<z.infer<typeof TransactionSchema>>(),
});

const toolNode = new ToolNode(ALL_TOOLS_LIST);
const memory = new MemorySaver();

const callModel = async (state: {
  messages: AIMessage[];
  transaction: z.infer<typeof TransactionSchema>;
}) => {
  const { messages, transaction } = state;
  console.log("transaction callModel messages---", transaction);
  if (!transaction) {
    throw new Error("Transaction is missing from state");
  }
  // console.log("messages=====", messages);
  // console.log("callModel=====", [...messages].pop());

  const systemMessage = {
    role: "system",
    content: `
    - You are an AI agent that is responsible for blockchain transactions like:
    - Sending tokens from one wallet to another
    - Checking the balance of a wallet
    - Swapping tokens from one token to another
    - Bridging tokens from one chain to another
    - All transaction data tools require a data to be passed in as a parameter
    - Use this ${state.transaction.accountAddress} as the accountAddress provided in the graph state and dont take it from user context
    - Make sure you use only address for token, tokenIn and tokenOut
    - Use only this data ${transaction} to get the values required for agent tool  
    - Use this ${state.transaction.tokenIn} as the tokenIn provided in the graph state and dont take it from user context
    - Use this ${state.transaction.tokenOut} as the tokenOut provided in the graph state and dont take it from user context
    - Return the response when all the transactions has been created

    `,
  };

  const llmWithTools = llm.bindTools(ALL_TOOLS_LIST);
  const result = await llmWithTools.invoke([systemMessage, ...messages]);
  return { messages: result, transaction };
};

const shouldContinue = (state: typeof GraphAnnotation.State) => {
  const { messages, transaction } = state;
  console.log("transaction=====", transaction);
  const lastMessage = messages[messages.length - 1];
  // Cast here since `tool_calls` does not exist on `BaseMessage`
  const messageCastAI = lastMessage as AIMessage;

  // console.log("messageCastAI.tool_calls", messageCastAI.tool_calls);
  if (messageCastAI.tool_calls?.length) {
    // LLM did not call any tools, so we should end.
    return ["tools"];
  }

  return ["finalOutput"];
};

const finalOutput = (state: typeof GraphAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  return { state, result: END };
};

const workflow = new StateGraph(GraphAnnotation)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addNode("tools", toolNode)
  .addNode("finalOutput", finalOutput)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", "finalOutput"]);

export const graph = workflow.compile({});

export const blockchainAgent = async (
  request: { message: string; address: string },
  sendEvent: (event: any, role?: any) => void
) => {
  const { message, address } = request;
  if (!message) return;

  const userInput = message;

  const extractedTransaction = await extractTransactionJSON(userInput, llm);
  console.log("extractedTransaction---", extractedTransaction);
  const data = await modifyValuesAsPerRequirement(extractedTransaction);
  console.log("data---", data, address);
  const inputs = {
    messages: [{ role: "user", content: userInput }],
    transaction: {
      ...extractedTransaction,
      ...data,
      accountAddress: address,
      transactions: [],
    },
  };

  for await (const event of await graph.stream(inputs, {
    recursionLimit: 50,
  })) {
    if (Object.keys(event).length > 0) {
      if (
        event?.agent?.messages &&
        event?.agent?.messages?.response_metadata.finish_reason === "tool_calls"
      ) {
        const event_values = event?.agent?.messages;
        const length = event_values?.tool_calls?.length;
        sendEvent("Creating the transaction....");
        for (let i = 0; i < length; i++) {
          const value = event_values?.tool_calls[i];
          sendEvent(`Calling agent ${value.name}....`);
          sendEvent("Creating transaction parameters");
          sendEvent({ type: value.name, ...value.args }, "graph_state");
          sendEvent(value.args);
        }
      }

      if (event?.tools?.messages) {
        sendEvent(`Preparing transactions data....`);
        for (let i = 0; i < event?.tools?.messages.length; i++) {
          const value = event?.tools?.messages[i];
          if (isValidJSON(value.content)) {
            sendEvent(i + 1 + " " + "transactions created");
            sendEvent(JSON?.parse?.(value.content) ?? "", "tools");
            sendEvent(JSON?.parse?.(value.content));
          } else {
            sendEvent(value.content);
          }
        }
      }

      if (event?.agent?.messages?.response_metadata?.finish_reason === "stop") {
        sendEvent(event?.agent?.messages?.content, "assistant");
      }
    }
  }
};

// Currently swap are only working for base, arbitrum and base chains on brahma console kit
// Send 100 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Ethereum and also send 500 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x942d35Cc6634C0532925a3b844Bc454e4438f44e on ethereum
// Can you swap 100 of this token address 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC) to 0x0555E30da8f98308EdB960aa94C0Db47230d2B9c (WBTC) on base chain
// Can you swap 100 of this token USDC to WBTC on base chain
// Can you send 10000000000000000000 DAI from Base to Arbitrum chain
