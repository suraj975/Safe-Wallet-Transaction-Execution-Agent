import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import { z } from "zod";
import * as viemChains from "viem/chains";

import {
  Address,
  BridgeRoute,
  ConsoleKit,
  GetBridgingRoutesParams,
  SwapQuoteRoute,
} from "brahma-console-kit";
import { chainNames } from "./constant";
import { isAddress } from "viem";

const parser = StructuredOutputParser.fromNamesAndDescriptions({
  accountAddress: "The user account address",
  receiverAddress: "The receiver account address",
  transferAmount: "The amount of tokens to transfer",
  tokenAddress: "The address of the token to transfer",
  chainId: "The chain ID of the token",
  chainName: "The name of the chain",
});

const prompt = new PromptTemplate({
  template:
    "Extract the following information from the text: {input_text}\n{format_instructions}",
  inputVariables: ["input_text"],
  partialVariables: { format_instructions: parser.getFormatInstructions() },
});

export async function extractJSON(text: string, model: ChatOpenAI) {
  const formattedPrompt = await prompt.format({ input_text: text });
  const response = await model.invoke(formattedPrompt);

  //   console.log("response-->", response);
  const jsonData = await parser.parse(response.text);
  console.log("jsonData-->", jsonData);
  return jsonData;
}
const transactionParser = StructuredOutputParser.fromZodSchema(
  z.object({
    chainId: z
      .string()
      .optional()
      .describe("The chain ID where the transaction occurred"),
    tokenIn: z
      .string()
      .optional()
      .describe("This token is the one which we receive after swap"),
    tokenOut: z
      .string()
      .optional()
      .describe("This token is one we is let out for other token"),
    inputTokenAmount: z
      .string()
      .optional()
      .describe("The amount of input tokens being transferred"),
    receiverAddress: z
      .string()
      .optional()
      .describe("The recipient's wallet address"),
    accountAddress: z
      .string()
      .optional()
      .describe("The sender's wallet address"),
    tokenAddress: z
      .string()
      .optional()
      .describe("The address of the token involved"),
    chainIdOut: z
      .string()
      .optional()
      .describe("The chain ID of the output token during the bridge"),
    chainIdIn: z
      .string()
      .optional()
      .describe("The chain ID of the input token during the bridge"),
  })
);

export async function extractTransactionJSON(text: string, model: ChatOpenAI) {
  const prompt = new PromptTemplate({
    template:
      "Extract the following transaction details from the text: {input_text}\n{format_instructions}",
    inputVariables: ["input_text"],
    partialVariables: {
      format_instructions: transactionParser.getFormatInstructions(),
    },
  });

  const formattedPrompt = await prompt.format({ input_text: text });
  const response = await model.invoke(formattedPrompt);

  // Parse the structured output
  const jsonData = await transactionParser.parse(response.text);
  return jsonData;
}

export async function getTokenInfo(chain: number, token: string) {
  const url = `https://li.quest/v1/token?chain=${chain}&token=${token}`;
  const options = { method: "GET", headers: { accept: "application/json" } };

  return await fetch(url, options)
    .then((res) => res.json())
    .then((json) => json)
    .catch((err) => err);
}

export function isValidJSON(str: string) {
  if (typeof str !== "string") return false; // Ensure it's a string
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

export const fetchBridgingRoutes = async (
  params: GetBridgingRoutesParams
): Promise<any[]> => {
  const consoleKit = new ConsoleKit(
    "f27abba2-0749-4d95-aa3d-3c6beb95f59a",
    "https://dev.console.fi/v1/vendor"
  );
  try {
    const resp = await consoleKit.coreActions.fetchBridgingRoutes({
      ...params,
    });

    console.log("resp---", resp);
    return resp;
  } catch (err: any) {
    console.error(`Error fetching bridging routes: ${err.message}`);
    return [];
  }
};

export const getSwapRoutesData = async (
  tokenIn: Address,
  tokenOut: Address,
  accountAddress: Address,
  inputTokenAmount: string,
  slippage: string,
  chainId: number
) => {
  const consoleKit = new ConsoleKit(
    "f27abba2-0749-4d95-aa3d-3c6beb95f59a",
    "https://dev.console.fi/v1/vendor"
  );
  console.log("getSwapRoutesData===", {
    tokenIn,
    tokenOut,
    accountAddress,
    inputTokenAmount,
    chainId,
  });
  try {
    const resp = await consoleKit.coreActions.getSwapRoutes(
      tokenIn,
      tokenOut,
      accountAddress,
      inputTokenAmount,
      `0.5`,
      chainId
    );

    let routes = (resp.data as any).data as SwapQuoteRoute[];
    console.log(routes);

    // const { data } = await consoleKit.coreActions.swap(
    //   8453,
    //   "0xBE882FE36D60307E3D350E5FDeD004037f5ab4ab",
    //   {
    //     amountIn: "100",
    //     chainId: 8453,
    //     route: routes[0],
    //     slippage: 0.5,
    //     tokenIn: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c" as Address,
    //     tokenOut: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
    //   }
    // );

    return routes as SwapQuoteRoute[];
  } catch (err) {
    console.log(err);
  }
};

export const modifyValuesAsPerRequirement = async (input: any) => {
  const modifyData = { ...input };
  if (isNaN(input.chainId)) {
    console.log("not a chain id");
    modifyData.chainId = chainNames[input.chainId.toLowerCase()];
  }
  if (!isAddress(input.tokenAddress)) {
    console.log("not proper token address", input.tokenAddress);
    const tokenInfo = await getTokenInfo(
      Number(modifyData.chainId),
      input.tokenAddress
    );
    modifyData.tokenAddress = tokenInfo.address;
  }
  if (!isAddress(input.tokenIn)) {
    console.log("not proper token in address", input.tokenIn);
    const tokenInfo = await getTokenInfo(
      Number(modifyData.chainId),
      input.tokenIn
    );
    modifyData.tokenIn = tokenInfo.address;
  }
  if (!isAddress(input.tokenOut)) {
    console.log("not proper token out address", input.tokenOut);
    const tokenInfo = await getTokenInfo(
      Number(modifyData.chainId),
      input.tokenOut
    );
    modifyData.tokenOut = tokenInfo.address;
  }

  if (isNaN(input.chainIdIn)) {
    console.log("not a chain in id");
    modifyData.chainIdIn = chainNames[input.chainIdIn];
  }
  if (isNaN(input.chainIdOut)) {
    console.log("not a chain out id");
    modifyData.chainIdOut = chainNames[input.chainIdOut];
  }
  return Promise.resolve(modifyData);
};
