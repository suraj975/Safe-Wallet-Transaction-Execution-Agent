import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import {
  ActionNameToId,
  Address,
  BridgeRoute,
  ConsoleKit,
  GenerateCalldataResponse,
  GeneratePayload,
  GetBridgingRoutesParams,
  SendParams,
  SwapQuoteRoute,
} from "brahma-console-kit";
import { chainNames } from "./constant";
import { isAddress } from "viem";
import axios from "axios";

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
      .describe(
        "This is the token is the one which user receives after swap or bridge"
      ),
    tokenOut: z
      .string()
      .optional()
      .describe(
        "This is the token which user is giving out for another token through bridge or swap"
      ),
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
      .describe(
        "The chain ID of the token that user sends out during swap or bridge"
      ),
    chainIdIn: z
      .string()
      .optional()
      .describe(
        "The chain ID on which user receives the token during bridge or swap "
      ),
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
    .catch((err) => {
      throw err;
    });
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

    return routes as SwapQuoteRoute[];
  } catch (err) {
    console.log(err);
  }
};

export const modifyValuesAsPerRequirement = async (input: any) => {
  const modifyData = { ...input };
  try {
    if (isNaN(input.chainId)) {
      console.log("not a chain id");
      modifyData.chainId = chainNames[input?.chainId?.toLowerCase()];
    }
    if (isNaN(input.chainIdIn)) {
      console.log("not a chain in id");
      modifyData.chainIdIn = chainNames[input?.chainIdIn?.toLowerCase()];
    }
    if (isNaN(input.chainIdOut)) {
      console.log("not a chain out id");
      modifyData.chainIdOut = chainNames[input?.chainIdOut?.toLowerCase()];
    }
    if (!isAddress(input.tokenAddress)) {
      console.log("not proper token address", input.tokenAddress);
      const tokenInfo = await getTokenInfo(
        Number(modifyData?.chainId),
        input.tokenAddress
      );
      modifyData.tokenAddress = tokenInfo.address;
    }
    if (!isAddress(input.tokenIn)) {
      console.log("not proper token in address", input.tokenIn);

      const tokenInfo = await getTokenInfo(
        Number(modifyData?.chainIdIn ?? modifyData?.chainId),
        input.tokenIn
      );
      modifyData.tokenIn = tokenInfo.address;
    }
    if (!isAddress(input.tokenOut)) {
      console.log("not proper token out address", input.tokenOut);
      const tokenInfo = await getTokenInfo(
        Number(modifyData?.chainIdOut ?? modifyData?.chainId),
        input.tokenOut
      );
      modifyData.tokenOut = tokenInfo.address;
    }
  } catch (error) {
    console.log("error----", error);
  }

  return Promise.resolve(modifyData);
};

export const ConsoleKitFetchBridgingRoutes = async (
  input: GetBridgingRoutesParams
) => {
  const consoleKit = new ConsoleKit(
    "f27abba2-0749-4d95-aa3d-3c6beb95f59a",
    "https://dev.console.fi/v1/vendor"
  );

  try {
    const resp = await consoleKit.coreActions.fetchBridgingRoutes(input);
    console.log("resp", resp);
    let routes = (resp as any).data as BridgeRoute[];
    console.log(routes);
    const { data } = await consoleKit.coreActions.bridge(
      input.chainIdOut,
      input.ownerAddress as Address,
      //@ts-ignore
      { ...input, route: routes[0] }
    );

    console.log(data);
    return Promise.resolve(data);
  } catch (err) {
    console.log(err);
    return undefined;
  }
};

export const ConsoleKitSend = async (
  chainId: number,
  accountAddress: Address,
  params: SendParams
): Promise<GenerateCalldataResponse> => {
  try {
    const response = await axios.post<GenerateCalldataResponse>(
      "https://dev.console.fi/v1/vendor/builder/generate",
      {
        id: "INTENT",
        action: "BUILD",
        params: {
          id: ActionNameToId.send,
          chainId: chainId,
          consoleAddress: accountAddress,
          params,
        },
      } as GeneratePayload<SendParams, "BUILD">,
      {
        headers: {
          "x-api-key": "f27abba2-0749-4d95-aa3d-3c6beb95f59a", // Set x-api-key header
        },
      }
    );

    return response.data as GenerateCalldataResponse; // Ensure correct return type
  } catch (err: any) {
    console.error(`Error generating calldata: ${err.message}`);
    throw err;
  }
};
