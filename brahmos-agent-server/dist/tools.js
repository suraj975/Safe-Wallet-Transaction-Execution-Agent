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
exports.ALL_TOOLS_LIST = exports.swapToken = exports.bridgeToken = exports.sendToken = void 0;
const tools_1 = require("@langchain/core/tools");
const schemas_1 = require("./schemas");
const brahma_console_kit_1 = require("brahma-console-kit");
const config_1 = require("./config");
const utils_1 = require("./utils");
exports.sendToken = (0, tools_1.tool)((input, fields) => __awaiter(void 0, void 0, void 0, function* () {
    const consoleKit = new brahma_console_kit_1.ConsoleKit(config_1.ConsoleKitConfig.apiKey, config_1.ConsoleKitConfig.baseUrl);
    const data = yield (0, utils_1.modifyValuesAsPerRequirement)(input);
    console.log("called---sendToken");
    try {
        const { data } = yield consoleKit.coreActions.send(input.chainId, input.accountAddress, {
            amount: input.inputTokenAmount,
            to: input.receiverAddress,
            tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        });
        //   console.log("data.transactions", data.transactions);
        return {
            transactions: data.transactions,
        };
        //   return `The following transactions must be executed to perform the requested transfer-\n${JSON.stringify(
        //     data.transactions,
        //     null,
        //     2
        //   )}`;
    }
    catch (e) {
        console.log(e);
        return "an error occurred";
    }
}), {
    name: "send_token",
    description: "Responsible for generating the transaction for sending token from one wallet to another",
    schema: schemas_1.SenderSchema,
});
exports.bridgeToken = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    const consoleKit = new brahma_console_kit_1.ConsoleKit(config_1.ConsoleKitConfig.apiKey, config_1.ConsoleKitConfig.baseUrl);
    console.log("bridgeRoute==========>input", input);
    const data = yield (0, utils_1.modifyValuesAsPerRequirement)(input);
    console.log("bridgeRoute==========>data", data);
    try {
        const data = yield (0, utils_1.ConsoleKitFetchBridgingRoutes)({
            amountIn: input.inputTokenAmount,
            amountOut: "0",
            chainIdIn: Number(input.chainIdIn),
            chainIdOut: Number(input.chainIdOut),
            ownerAddress: input.accountAddress,
            recipient: input.accountAddress,
            slippage: 0.5,
            tokenIn: input.tokenIn,
            tokenOut: input.tokenOut,
        });
        if (!data)
            return "No Bridge route found";
        return {
            transactions: data.transactions,
        };
    }
    catch (e) {
        console.log(e);
        return "an error occurred";
    }
}), {
    name: "bridge_token",
    description: "Responsible for generating the transaction for bridging token from one chain to another",
    schema: schemas_1.BridgerSchema,
});
exports.swapToken = (0, tools_1.tool)((input) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const consoleKit = new brahma_console_kit_1.ConsoleKit(config_1.ConsoleKitConfig.apiKey, config_1.ConsoleKitConfig.baseUrl);
    const data = yield (0, utils_1.modifyValuesAsPerRequirement)(input);
    console.log("input00000==========>", data);
    try {
        const swapRouteData = (_a = (yield (0, utils_1.getSwapRoutesData)(input.tokenIn, input.tokenOut, input.accountAddress, input.inputTokenAmount, `${1}`, Number(input.chainId)))) !== null && _a !== void 0 ? _a : [];
        if (!swapRouteData.length)
            return "No swap route found";
        const [swapRoute] = swapRouteData;
        const { data } = yield consoleKit.coreActions.swap(input.chainId, input.accountAddress, {
            amountIn: input.inputTokenAmount,
            chainId: Number(input.chainId),
            route: swapRoute,
            slippage: 1,
            tokenIn: input.tokenIn,
            tokenOut: input.tokenOut,
        });
        return {
            transactions: data.transactions,
        };
    }
    catch (e) {
        console.log(e);
        throw `an error occurred ${e}`;
    }
}), {
    name: "swap_token_call",
    description: "Responsible for generating the transaction for swapping token from one token to another",
    schema: schemas_1.SwapperSchema,
});
exports.ALL_TOOLS_LIST = [exports.sendToken, exports.bridgeToken, exports.swapToken];
