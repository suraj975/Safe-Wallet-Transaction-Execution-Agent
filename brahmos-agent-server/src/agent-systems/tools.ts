import { tool } from "@langchain/core/tools";
import { BridgerSchema, SenderSchema, SwapperSchema } from "./schemas";
import { Address, ConsoleKit, SwapQuoteRoute } from "brahma-console-kit";
import { ConsoleKitConfig } from "./config";
import { getSwapRoutesData, modifyValuesAsPerRequirement } from "./utils";

export const sendToken = tool(
  async (input, fields) => {
    const consoleKit = new ConsoleKit(
      ConsoleKitConfig.apiKey,
      ConsoleKitConfig.baseUrl
    );
    const data = await modifyValuesAsPerRequirement(input);
    console.log("input00000==========>", data);
    try {
      const { data } = await consoleKit.coreActions.send(
        input.chainId as number,
        input.accountAddress as Address,
        {
          amount: input.inputTokenAmount,
          to: input.receiverAddress as Address,
          tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        }
      );

      //   console.log("data.transactions", data.transactions);
      return {
        transactions: data.transactions,
      };
      //   return `The following transactions must be executed to perform the requested transfer-\n${JSON.stringify(
      //     data.transactions,
      //     null,
      //     2
      //   )}`;
    } catch (e) {
      console.log(e);
      return "an error occurred";
    }
  },
  {
    name: "send_token",
    description:
      "Responsible for generating the transaction for sending token from one wallet to another",
    schema: SenderSchema,
  }
);

export const bridgeToken = tool(
  async (input) => {
    const consoleKit = new ConsoleKit(
      ConsoleKitConfig.apiKey,
      ConsoleKitConfig.baseUrl
    );
    console.log("bridgeRoute==========>input", input);
    try {
      const [bridgeRoute] = await consoleKit.coreActions.fetchBridgingRoutes({
        amountIn: input.inputTokenAmount,
        amountOut: "0",
        chainIdIn: Number(input.chainIdIn),
        chainIdOut: Number(input.chainIdOut),
        ownerAddress: input.accountAddress,
        recipient: input.accountAddress as any,
        slippage: 0.1,
        tokenIn: input.tokenIn,
        tokenOut: input.tokenOut,
      });

      if (!bridgeRoute) return "No Bridge route found";

      const { data } = await consoleKit.coreActions.bridge(
        input.chainIdIn,
        input.accountAddress as any,
        {
          amountIn: input.inputTokenAmount,
          amountOut: "0",
          chainIdIn: Number(input.chainIdIn),
          chainIdOut: Number(input.chainIdOut),
          ownerAddress: input.accountAddress as any,
          recipient: input.accountAddress as any,
          route: bridgeRoute,
          tokenIn: input.tokenIn as Address,
          tokenOut: input.tokenOut as Address,
          slippage: 1,
        }
      );
      return {
        transactions: data.transactions,
      };
      //   return `The following transactions must be executed to perform the requested bridging-\n${JSON.stringify(
      //     data.transactions,
      //     null,
      //     2
      //   )}`;
    } catch (e) {
      console.log(e);
      return "an error occurred";
    }
  },
  {
    name: "bridge_token",
    description:
      "Responsible for generating the transaction for bridging token from one chain to another",
    schema: BridgerSchema,
  }
);

export const swapToken = tool(
  async (input) => {
    const consoleKit = new ConsoleKit(
      ConsoleKitConfig.apiKey,
      ConsoleKitConfig.baseUrl
    );

    const data = await modifyValuesAsPerRequirement(input);
    console.log("input00000==========>", data);

    try {
      // const { data: swapRouteData, error } =
      // await consoleKit.coreActions.getSwapRoutes(
      //   input.tokenIn as Address,
      //   input.tokenOut as Address,
      //   input.accountAddress as Address,
      //   input.inputTokenAmount,
      //   `${1}`,
      //   input.chainId
      // );

      // console.log("swapRouteData---", error, swapRouteData);
      const swapRouteData: SwapQuoteRoute[] =
        (await getSwapRoutesData(
          input.tokenIn as Address,
          input.tokenOut as Address,
          input.accountAddress as Address,
          input.inputTokenAmount,
          `${1}`,
          Number(input.chainId)
        )) ?? [];

      if (!swapRouteData.length) return "No swap route found";

      const [swapRoute] = swapRouteData;

      const { data } = await consoleKit.coreActions.swap(
        input.chainId,
        input.accountAddress as Address,
        {
          amountIn: input.inputTokenAmount,
          chainId: Number(input.chainId),
          route: swapRoute,
          slippage: 1,
          tokenIn: input.tokenIn as Address,
          tokenOut: input.tokenOut as Address,
        }
      );
      return {
        transactions: data.transactions,
      };
      //   return `The following transactions must be executed to perform the requested swap-\n${JSON.stringify(
      //     data.transactions,
      //     null,
      //     2
      //   )}`;
    } catch (e) {
      console.log(e);
      throw `an error occurred ${e}`;
    }
  },
  {
    name: "swap_token_call",
    description:
      "Responsible for generating the transaction for swapping token from one token to another",
    schema: SwapperSchema,
  }
);

export const ALL_TOOLS_LIST = [sendToken, bridgeToken, swapToken];
