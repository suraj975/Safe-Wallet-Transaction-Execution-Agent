import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
  START,
  END,
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
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
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
  planningTasks: Annotation<string[]>(),
  currentTransactionIndex: Annotation<number>(),
});

const toolNode = new ToolNode(ALL_TOOLS_LIST);

const callModel = async (state: {
  messages: AIMessage[];
  transaction: z.infer<typeof TransactionSchema>;
  planningTasks: string[];
  currentTransactionIndex: number;
}) => {
  const { messages, transaction, planningTasks, currentTransactionIndex } =
    state;

  const currentTask = planningTasks?.[currentTransactionIndex];
  const extractedTransaction = currentTask
    ? await extractTransactionJSON(currentTask, llm)
    : undefined;

  const transactionState = extractedTransaction
    ? await modifyValuesAsPerRequirement(extractedTransaction)
    : undefined;

  let toolMessages: any[] = [];

  if (!transactionState) {
    toolMessages = messages?.reduce((toolMessage, message) => {
      if ((message as ToolMessage)?.tool_call_id) {
        toolMessage.push(
          JSON.stringify({
            type: message?.name,
            content: message?.content,
          }) as string
        );
      }
      return toolMessage;
    }, [] as string[]);
  }

  const content = transactionState?.accountAddress
    ? `
    - You are an AI agent that is responsible for blockchain transactions like:
    - Sending tokens from one wallet to another
    - Checking the balance of a wallet
    - Swapping tokens from one token to another
    - Bridging tokens from one chain to another
    - All transaction data tools require a data to be passed in as a parameter
    - Use this ${transaction?.accountAddress} as the accountAddress provided in the graph state and dont take it from user context
    - Make sure you use only address for token, tokenIn and tokenOut
    - Use only this data ${transactionState} to get the values required for agent tool  
    - Use this ${transactionState?.tokenIn} as the tokenIn provided in the graph state and dont take it from user context
    - Use this ${transactionState?.tokenOut} as the tokenOut provided in the graph state and dont take it from user context
    - Return the response when all the transactions has been created
    `
    : `
    - You are an AI agent that is responsible for blockchain transactions like:
    - Sending tokens from one wallet to another
    - Checking the balance of a wallet
    - Swapping tokens from one token to another
    - Bridging tokens from one chain to another
    - This is the complete history for it ${toolMessages}
    - To get specific data about the transaction details that can be found in the tool ToolMessage
    - If you don't get it, in the ui all the transaction details are being shown
    - Return the response of all the transaction happened which is easy to understand
    `;

  const systemMessage = {
    role: "system",
    content: content,
  };

  const llmWithTools = llm.bindTools(ALL_TOOLS_LIST);

  const result = await llmWithTools.invoke([
    systemMessage,
    new HumanMessage({ content: currentTask ?? "All Tasks Completed" }),
  ]);
  console.log("callModel===", result);
  return {
    messages: result,
    transaction: {
      ...transactionState,
      accountAddress: transaction?.accountAddress,
    },
    currentTransactionIndex: currentTransactionIndex + 1,
    planningTasks,
  };
};

const shouldContinue = (state: typeof GraphAnnotation.State) => {
  const { messages, currentTransactionIndex, planningTasks } = state;
  const lastMessage = messages[messages.length - 1];
  const messageCastAI = lastMessage as AIMessage;

  if (messageCastAI?.tool_calls?.length) {
    return ["tools"];
  }

  if (currentTransactionIndex >= planningTasks.length) {
    return END;
  }

  return ["agent"];
};

const shouldPlanningContinue = (state: typeof GraphAnnotation.State) => {
  const { planningTasks } = state;
  console.log("shouldPlanningContinue===", planningTasks);
  if (planningTasks) {
    return "agent";
  }

  return ["noPlanCreation"];
};

const noPlanCreation = async (state: typeof GraphAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  const messageCastAI = lastMessage as AIMessage;
  console.log("noPlanCreation===");
  return {
    messages: messageCastAI,
  };
};

const planCreation = async (state: typeof GraphAnnotation.State) => {
  const { messages, transaction } = state;

  const systemMessage = {
    role: "system",
    content: `
    - You are an AI agent that is responsible for creating plans for blockchain transaction.
    - You are responsible for creating an array of tasks which includes multiple transaction.
    - The user can ask for multiple transactions to be performed like transfer, swap or bridge.
    - Your main task is to divide the user input into different array of sentences. This means separating "and" or separate the joining of the statements in the user input.
    - The tasks must be an array of english statements.
    - Should only return the array of statements that can be parsed.
    - Below are only the cases where the user input does not relate to plan for creating transaction
    - If the user input does not ask related to creating transaction like transfer, swap or bridge, then don't create a plan
    - then only you can also mention examples like below
    - Send 100 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Ethereum and also send 500 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x942d35Cc6634C0532925a3b844Bc454e4438f44e on ethereum
    - Can you swap 100 of this token address 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC) to 0x0555E30da8f98308EdB960aa94C0Db47230d2B9c (WBTC) on base chain
    - Can you swap 100 of this token USDC to WBTC on base chain
    - Can you send 10000000000000000000 DAI from Base to Arbitrum chain
  `,
  };

  const result = await llm.invoke([systemMessage, ...messages]);
  console.log("planCreation result===", result);
  const hasPlan =
    isValidJSON(result?.content as string) &&
    JSON?.parse(result?.content as string);

  return {
    ...state,
    currentTransactionIndex: 0,
    messages: result,
    ...(!hasPlan ? { result: END } : {}),
    planningTasks:
      isValidJSON(result?.content as string) &&
      JSON?.parse(result?.content as string),
  };
};

const workflow = new StateGraph(GraphAnnotation)
  .addNode("agent", callModel)
  .addNode("taskPlanning", planCreation)
  .addEdge(START, "taskPlanning")
  .addNode("tools", toolNode)
  .addNode("noPlanCreation", noPlanCreation)
  .addEdge("tools", "agent")
  .addEdge("noPlanCreation", END)
  .addConditionalEdges("agent", shouldContinue)
  .addConditionalEdges("taskPlanning", shouldPlanningContinue);

export const graph = workflow.compile({});

export const blockchainAgent = async (
  request: { message: string; address: string },
  sendEvent: (event: any, role?: any) => void
) => {
  const { message, address } = request;
  if (!message) return;

  const userInput = message;

  const inputs = {
    messages: [{ role: "user", content: userInput }],
    transaction: {
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
      if (
        event?.noPlanCreation?.messages?.response_metadata?.finish_reason ===
        "stop"
      ) {
        sendEvent(event?.noPlanCreation?.messages?.content, "assistant");
      }
      console.log("event", event);
    }
  }
};

// Currently swap are only working for base, arbitrum and base chains on brahma console kit
// Send 100 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Ethereum and also send 500 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x942d35Cc6634C0532925a3b844Bc454e4438f44e on ethereum
// Can you swap 100 of this token address 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC) to 0x0555E30da8f98308EdB960aa94C0Db47230d2B9c (WBTC) on base chain
// Can you swap 100 of this token USDC to WBTC on base chain
// Can you send 10000000000000000000 DAI from Base to Arbitrum chain

//Send 100 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Ethereum and also send 500 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x942d35Cc6634C0532925a3b844Bc454e4438f44e on ethereum and also Can you swap 100 of this token address 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC) to 0x0555E30da8f98308EdB960aa94C0Db47230d2B9c (WBTC) on base chain and also can you send 10000000000000000000 DAI from Base to Arbitrum chain
