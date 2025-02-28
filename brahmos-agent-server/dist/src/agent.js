"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainAgent = exports.graph = void 0;
const langgraph_1 = require("@langchain/langgraph");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openai_1 = require("@langchain/openai");
const utils_1 = require("./utils");
const tools_1 = require("./tools");
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const messages_1 = require("@langchain/core/messages");
const OPEN_API_KEY = process.env.OPEN_API_KEY;
const llm = new openai_1.ChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
    apiKey: OPEN_API_KEY,
});
const GraphAnnotation = langgraph_1.Annotation.Root(Object.assign(Object.assign({}, langgraph_1.MessagesAnnotation.spec), { transaction: (0, langgraph_1.Annotation)(), planningTasks: (0, langgraph_1.Annotation)(), currentTransactionIndex: (0, langgraph_1.Annotation)() }));
const toolNode = new prebuilt_1.ToolNode(tools_1.ALL_TOOLS_LIST);
const callModel = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const { messages, transaction, planningTasks, currentTransactionIndex } = state;
    const currentTask = planningTasks === null || planningTasks === void 0 ? void 0 : planningTasks[currentTransactionIndex];
    const extractedTransaction = currentTask
        ? yield (0, utils_1.extractTransactionJSON)(currentTask, llm)
        : undefined;
    const transactionState = extractedTransaction
        ? yield (0, utils_1.modifyValuesAsPerRequirement)(extractedTransaction)
        : undefined;
    let toolMessages = [];
    if (!transactionState) {
        toolMessages = messages === null || messages === void 0 ? void 0 : messages.reduce((toolMessage, message) => {
            if (message === null || message === void 0 ? void 0 : message.tool_call_id) {
                toolMessage.push(JSON.stringify({
                    type: message === null || message === void 0 ? void 0 : message.name,
                    content: message === null || message === void 0 ? void 0 : message.content,
                }));
            }
            return toolMessage;
        }, []);
    }
    const content = (transactionState === null || transactionState === void 0 ? void 0 : transactionState.accountAddress)
        ? `
    - You are an AI agent that is responsible for blockchain transactions like:
    - Sending tokens from one wallet to another
    - Checking the balance of a wallet
    - Swapping tokens from one token to another
    - Bridging tokens from one chain to another
    - All transaction data tools require a data to be passed in as a parameter
    - Use this ${transaction === null || transaction === void 0 ? void 0 : transaction.accountAddress} as the accountAddress provided in the graph state and dont take it from user context
    - Make sure you use only address for token, tokenIn and tokenOut
    - Use only this data ${transactionState} to get the values required for agent tool  
    - Use this ${transactionState === null || transactionState === void 0 ? void 0 : transactionState.tokenIn} as the tokenIn provided in the graph state and dont take it from user context
    - Use this ${transactionState === null || transactionState === void 0 ? void 0 : transactionState.tokenOut} as the tokenOut provided in the graph state and dont take it from user context
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
    const llmWithTools = llm.bindTools(tools_1.ALL_TOOLS_LIST);
    const result = yield llmWithTools.invoke([
        systemMessage,
        new messages_1.HumanMessage({ content: currentTask !== null && currentTask !== void 0 ? currentTask : "All Tasks Completed" }),
    ]);
    console.log("callModel===", result);
    return {
        messages: result,
        transaction: Object.assign(Object.assign({}, transactionState), { accountAddress: transaction === null || transaction === void 0 ? void 0 : transaction.accountAddress }),
        currentTransactionIndex: currentTransactionIndex + 1,
        planningTasks,
    };
});
const shouldContinue = (state) => {
    var _a;
    const { messages, currentTransactionIndex, planningTasks } = state;
    const lastMessage = messages[messages.length - 1];
    const messageCastAI = lastMessage;
    if ((_a = messageCastAI === null || messageCastAI === void 0 ? void 0 : messageCastAI.tool_calls) === null || _a === void 0 ? void 0 : _a.length) {
        return ["tools"];
    }
    if (currentTransactionIndex >= planningTasks.length) {
        return langgraph_1.END;
    }
    return ["agent"];
};
const shouldPlanningContinue = (state) => {
    const { planningTasks } = state;
    console.log("shouldPlanningContinue===", planningTasks);
    if (planningTasks) {
        return "agent";
    }
    return ["noPlanCreation"];
};
const noPlanCreation = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    const messageCastAI = lastMessage;
    console.log("noPlanCreation===");
    return {
        messages: messageCastAI,
    };
});
const planCreation = (state) => __awaiter(void 0, void 0, void 0, function* () {
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
  `,
    };
    const result = yield llm.invoke([systemMessage, ...messages]);
    console.log("planCreation result===", result);
    const hasPlan = (0, utils_1.isValidJSON)(result === null || result === void 0 ? void 0 : result.content) &&
        (JSON === null || JSON === void 0 ? void 0 : JSON.parse(result === null || result === void 0 ? void 0 : result.content));
    return Object.assign(Object.assign(Object.assign(Object.assign({}, state), { currentTransactionIndex: 0, messages: result }), (!hasPlan ? { result: langgraph_1.END } : {})), { planningTasks: (0, utils_1.isValidJSON)(result === null || result === void 0 ? void 0 : result.content) &&
            (JSON === null || JSON === void 0 ? void 0 : JSON.parse(result === null || result === void 0 ? void 0 : result.content)) });
});
const workflow = new langgraph_1.StateGraph(GraphAnnotation)
    .addNode("agent", callModel)
    .addNode("taskPlanning", planCreation)
    .addEdge(langgraph_1.START, "taskPlanning")
    .addNode("tools", toolNode)
    .addNode("noPlanCreation", noPlanCreation)
    .addEdge("tools", "agent")
    .addEdge("noPlanCreation", langgraph_1.END)
    .addConditionalEdges("agent", shouldContinue)
    .addConditionalEdges("taskPlanning", shouldPlanningContinue);
exports.graph = workflow.compile({});
const blockchainAgent = (request, sendEvent) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    var _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
    const { message, address } = request;
    if (!message)
        return;
    const userInput = message;
    const inputs = {
        messages: [{ role: "user", content: userInput }],
        transaction: {
            accountAddress: address,
            transactions: [],
        },
    };
    try {
        for (var _0 = true, _1 = __asyncValues(yield exports.graph.stream(inputs, {
            recursionLimit: 50,
        })), _2; _2 = yield _1.next(), _a = _2.done, !_a; _0 = true) {
            _c = _2.value;
            _0 = false;
            const event = _c;
            if (Object.keys(event).length > 0) {
                if (((_d = event === null || event === void 0 ? void 0 : event.agent) === null || _d === void 0 ? void 0 : _d.messages) &&
                    ((_f = (_e = event === null || event === void 0 ? void 0 : event.agent) === null || _e === void 0 ? void 0 : _e.messages) === null || _f === void 0 ? void 0 : _f.response_metadata.finish_reason) === "tool_calls") {
                    const event_values = (_g = event === null || event === void 0 ? void 0 : event.agent) === null || _g === void 0 ? void 0 : _g.messages;
                    const length = (_h = event_values === null || event_values === void 0 ? void 0 : event_values.tool_calls) === null || _h === void 0 ? void 0 : _h.length;
                    sendEvent("Creating the transaction....");
                    for (let i = 0; i < length; i++) {
                        const value = event_values === null || event_values === void 0 ? void 0 : event_values.tool_calls[i];
                        sendEvent(`Calling agent ${value.name}....`);
                        sendEvent("Creating transaction parameters");
                        sendEvent(Object.assign({ type: value.name }, value.args), "graph_state");
                        sendEvent(value.args);
                    }
                }
                if ((_j = event === null || event === void 0 ? void 0 : event.tools) === null || _j === void 0 ? void 0 : _j.messages) {
                    sendEvent(`Preparing transactions data....`);
                    for (let i = 0; i < ((_k = event === null || event === void 0 ? void 0 : event.tools) === null || _k === void 0 ? void 0 : _k.messages.length); i++) {
                        const value = (_l = event === null || event === void 0 ? void 0 : event.tools) === null || _l === void 0 ? void 0 : _l.messages[i];
                        if ((0, utils_1.isValidJSON)(value.content)) {
                            sendEvent(i + 1 + " " + "transactions created");
                            sendEvent((_o = (_m = JSON === null || JSON === void 0 ? void 0 : JSON.parse) === null || _m === void 0 ? void 0 : _m.call(JSON, value.content)) !== null && _o !== void 0 ? _o : "", "tools");
                            sendEvent((_p = JSON === null || JSON === void 0 ? void 0 : JSON.parse) === null || _p === void 0 ? void 0 : _p.call(JSON, value.content));
                        }
                        else {
                            sendEvent(value.content);
                        }
                    }
                }
                if (((_s = (_r = (_q = event === null || event === void 0 ? void 0 : event.agent) === null || _q === void 0 ? void 0 : _q.messages) === null || _r === void 0 ? void 0 : _r.response_metadata) === null || _s === void 0 ? void 0 : _s.finish_reason) === "stop") {
                    sendEvent((_u = (_t = event === null || event === void 0 ? void 0 : event.agent) === null || _t === void 0 ? void 0 : _t.messages) === null || _u === void 0 ? void 0 : _u.content, "assistant");
                }
                if (((_x = (_w = (_v = event === null || event === void 0 ? void 0 : event.noPlanCreation) === null || _v === void 0 ? void 0 : _v.messages) === null || _w === void 0 ? void 0 : _w.response_metadata) === null || _x === void 0 ? void 0 : _x.finish_reason) ===
                    "stop") {
                    sendEvent((_z = (_y = event === null || event === void 0 ? void 0 : event.noPlanCreation) === null || _y === void 0 ? void 0 : _y.messages) === null || _z === void 0 ? void 0 : _z.content, "assistant");
                }
                console.log("event", event);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_0 && !_a && (_b = _1.return)) yield _b.call(_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
});
exports.blockchainAgent = blockchainAgent;
// Currently swap are only working for base, arbitrum and base chains on brahma console kit
// Send 100 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Ethereum and also send 500 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x942d35Cc6634C0532925a3b844Bc454e4438f44e on ethereum
// Can you swap 100 of this token address 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC) to 0x0555E30da8f98308EdB960aa94C0Db47230d2B9c (WBTC) on base chain
// Can you swap 100 of this token USDC to WBTC on base chain
// Can you send 10000000000000000000 DAI from Base to Arbitrum chain
//Send 100 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Ethereum and also send 500 USDC from 0x701bC19d0a0502f5E3AC122656aba1d412bE51DD to 0x942d35Cc6634C0532925a3b844Bc454e4438f44e on ethereum and also Can you swap 100 of this token address 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC) to 0x0555E30da8f98308EdB960aa94C0Db47230d2B9c (WBTC) on base chain and also can you send 10000000000000000000 DAI from Base to Arbitrum chain
