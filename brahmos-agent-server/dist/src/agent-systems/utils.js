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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleKitFetchBridgingRoutes = exports.modifyValuesAsPerRequirement = exports.getSwapRoutesData = exports.fetchBridgingRoutes = void 0;
exports.extractJSON = extractJSON;
exports.extractTransactionJSON = extractTransactionJSON;
exports.getTokenInfo = getTokenInfo;
exports.isValidJSON = isValidJSON;
const prompts_1 = require("@langchain/core/prompts");
const output_parsers_1 = require("langchain/output_parsers");
const zod_1 = require("zod");
const brahma_console_kit_1 = require("brahma-console-kit");
const constant_1 = require("./constant");
const viem_1 = require("viem");
const parser = output_parsers_1.StructuredOutputParser.fromNamesAndDescriptions({
    accountAddress: "The user account address",
    receiverAddress: "The receiver account address",
    transferAmount: "The amount of tokens to transfer",
    tokenAddress: "The address of the token to transfer",
    chainId: "The chain ID of the token",
    chainName: "The name of the chain",
});
const prompt = new prompts_1.PromptTemplate({
    template: "Extract the following information from the text: {input_text}\n{format_instructions}",
    inputVariables: ["input_text"],
    partialVariables: { format_instructions: parser.getFormatInstructions() },
});
function extractJSON(text, model) {
    return __awaiter(this, void 0, void 0, function* () {
        const formattedPrompt = yield prompt.format({ input_text: text });
        const response = yield model.invoke(formattedPrompt);
        //   console.log("response-->", response);
        const jsonData = yield parser.parse(response.text);
        return jsonData;
    });
}
const transactionParser = output_parsers_1.StructuredOutputParser.fromZodSchema(zod_1.z.object({
    chainId: zod_1.z
        .string()
        .optional()
        .describe("The chain ID where the transaction occurred"),
    tokenIn: zod_1.z
        .string()
        .optional()
        .describe("This is the token is the one which user receives after swap or bridge"),
    tokenOut: zod_1.z
        .string()
        .optional()
        .describe("This is the token which user is giving out for another token through bridge or swap"),
    inputTokenAmount: zod_1.z
        .string()
        .optional()
        .describe("The amount of input tokens being transferred"),
    receiverAddress: zod_1.z
        .string()
        .optional()
        .describe("The recipient's wallet address"),
    accountAddress: zod_1.z
        .string()
        .optional()
        .describe("The sender's wallet address"),
    tokenAddress: zod_1.z
        .string()
        .optional()
        .describe("The address of the token involved"),
    chainIdOut: zod_1.z
        .string()
        .optional()
        .describe("The chain ID of the token that user sends out during swap or bridge"),
    chainIdIn: zod_1.z
        .string()
        .optional()
        .describe("The chain ID on which user receives the token during bridge or swap "),
}));
function extractTransactionJSON(text, model) {
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = new prompts_1.PromptTemplate({
            template: "Extract the following transaction details from the text: {input_text}\n{format_instructions}",
            inputVariables: ["input_text"],
            partialVariables: {
                format_instructions: transactionParser.getFormatInstructions(),
            },
        });
        const formattedPrompt = yield prompt.format({ input_text: text });
        const response = yield model.invoke(formattedPrompt);
        // Parse the structured output
        const jsonData = yield transactionParser.parse(response.text);
        return jsonData;
    });
}
function getTokenInfo(chain, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://li.quest/v1/token?chain=${chain}&token=${token}`;
        const options = { method: "GET", headers: { accept: "application/json" } };
        return yield fetch(url, options)
            .then((res) => res.json())
            .then((json) => json)
            .catch((err) => {
            throw err;
        });
    });
}
function isValidJSON(str) {
    if (typeof str !== "string")
        return false; // Ensure it's a string
    try {
        JSON.parse(str);
        return true;
    }
    catch (e) {
        return false;
    }
}
const fetchBridgingRoutes = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const consoleKit = new brahma_console_kit_1.ConsoleKit("f27abba2-0749-4d95-aa3d-3c6beb95f59a", "https://dev.console.fi/v1/vendor");
    try {
        const resp = yield consoleKit.coreActions.fetchBridgingRoutes(Object.assign({}, params));
        return resp;
    }
    catch (err) {
        console.error(`Error fetching bridging routes: ${err.message}`);
        return [];
    }
});
exports.fetchBridgingRoutes = fetchBridgingRoutes;
const getSwapRoutesData = (tokenIn, tokenOut, accountAddress, inputTokenAmount, slippage, chainId) => __awaiter(void 0, void 0, void 0, function* () {
    const consoleKit = new brahma_console_kit_1.ConsoleKit("f27abba2-0749-4d95-aa3d-3c6beb95f59a", "https://dev.console.fi/v1/vendor");
    console.log("getSwapRoutesData===", {
        tokenIn,
        tokenOut,
        accountAddress,
        inputTokenAmount,
        chainId,
    });
    try {
        const resp = yield consoleKit.coreActions.getSwapRoutes(tokenIn, tokenOut, accountAddress, inputTokenAmount, `0.5`, chainId);
        let routes = resp.data.data;
        console.log(routes);
        return routes;
    }
    catch (err) {
        console.log(err);
    }
});
exports.getSwapRoutesData = getSwapRoutesData;
const modifyValuesAsPerRequirement = (input) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const modifyData = Object.assign({}, input);
    try {
        if (isNaN(input.chainId)) {
            console.log("not a chain id");
            modifyData.chainId = constant_1.chainNames[(_a = input === null || input === void 0 ? void 0 : input.chainId) === null || _a === void 0 ? void 0 : _a.toLowerCase()];
        }
        if (isNaN(input.chainIdIn)) {
            console.log("not a chain in id");
            modifyData.chainIdIn = constant_1.chainNames[(_b = input === null || input === void 0 ? void 0 : input.chainIdIn) === null || _b === void 0 ? void 0 : _b.toLowerCase()];
        }
        if (isNaN(input.chainIdOut)) {
            console.log("not a chain out id");
            modifyData.chainIdOut = constant_1.chainNames[(_c = input === null || input === void 0 ? void 0 : input.chainIdOut) === null || _c === void 0 ? void 0 : _c.toLowerCase()];
        }
        if (!(0, viem_1.isAddress)(input.tokenAddress)) {
            console.log("not proper token address", input.tokenAddress);
            const tokenInfo = yield getTokenInfo(Number(modifyData === null || modifyData === void 0 ? void 0 : modifyData.chainId), input.tokenAddress);
            modifyData.tokenAddress = tokenInfo.address;
        }
        if (!(0, viem_1.isAddress)(input.tokenIn)) {
            console.log("not proper token in address", input.tokenIn);
            const tokenInfo = yield getTokenInfo(Number((_d = modifyData === null || modifyData === void 0 ? void 0 : modifyData.chainIdIn) !== null && _d !== void 0 ? _d : modifyData === null || modifyData === void 0 ? void 0 : modifyData.chainId), input.tokenIn);
            modifyData.tokenIn = tokenInfo.address;
        }
        if (!(0, viem_1.isAddress)(input.tokenOut)) {
            console.log("not proper token out address", input.tokenOut);
            const tokenInfo = yield getTokenInfo(Number((_e = modifyData === null || modifyData === void 0 ? void 0 : modifyData.chainIdOut) !== null && _e !== void 0 ? _e : modifyData === null || modifyData === void 0 ? void 0 : modifyData.chainId), input.tokenOut);
            modifyData.tokenOut = tokenInfo.address;
        }
    }
    catch (error) {
        console.log("error----", error);
    }
    return Promise.resolve(modifyData);
});
exports.modifyValuesAsPerRequirement = modifyValuesAsPerRequirement;
const ConsoleKitFetchBridgingRoutes = (input) => __awaiter(void 0, void 0, void 0, function* () {
    const consoleKit = new brahma_console_kit_1.ConsoleKit("f27abba2-0749-4d95-aa3d-3c6beb95f59a", "https://dev.console.fi/v1/vendor");
    try {
        const resp = yield consoleKit.coreActions.fetchBridgingRoutes(input);
        console.log("resp", resp);
        let routes = resp.data;
        console.log(routes);
        const { data } = yield consoleKit.coreActions.bridge(input.chainIdOut, input.ownerAddress, Object.assign(Object.assign({}, input), { route: routes[0] }));
        console.log(data);
        return Promise.resolve(data);
    }
    catch (err) {
        console.log(err);
        return undefined;
    }
});
exports.ConsoleKitFetchBridgingRoutes = ConsoleKitFetchBridgingRoutes;
