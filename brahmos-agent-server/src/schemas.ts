import { z } from "zod";

export const BridgerSchema = z.object({
  chainIdOut: z
    .number()
    .describe(
      "This is the id of the chain from which token will be out. Example:'1 for ethereum'"
    ),
  chainIdIn: z
    .number()
    .describe(
      "This is the id of chain that token will be received. Example:'8453 for base'"
    ),
  accountAddress: z
    .string()
    .describe(
      "This is the user address. Example:'0xBE882FE36D60307E3D350E5FDeD004037f5ab4ab'"
    ),
  tokenIn: z
    .string()
    .describe(
      "This is the address of the token that user receives from another chain. Example:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'"
    ),
  tokenOut: z
    .string()
    .describe(
      "This is the address of the token that user bridges or sends to another chain. Example:'0xB0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'"
    ),
  inputTokenAmount: z
    .string()
    .describe("This the user input amount. Example:'100'"),
});

export const SenderSchema = z.object({
  chainId: z
    .number()
    .describe("This is the id of the chain. Example:'1 for ethereum'"),
  inputTokenAmount: z
    .string()
    .describe("This the user input amount. Example:'100'"),
  receiverAddress: z
    .string()
    .describe(
      "This the receiving address. Example:'0x701bC19d0a0502f5E3AC122656aba1d412bE51DD'"
    ),
  accountAddress: z
    .string()
    .describe(
      "This the user address. Example:'0xBE882FE36D60307E3D350E5FDeD004037f5ab4ab'"
    ),
  tokenAddress: z
    .string()
    .describe(
      "This the token address. Example:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'"
    ),
});

export const SwapperSchema = z.object({
  chainId: z
    .number()
    .describe("This is the id of the chain. Example:'1 for ethereum'"),
  accountAddress: z
    .string()
    .describe(
      "This the user address. Example:'0xBE882FE36D60307E3D350E5FDeD004037f5ab4ab'"
    ),
  tokenIn: z
    .string()
    .describe(
      "This the token address is one which we receive after swap. Example:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'"
    ),
  tokenOut: z
    .string()
    .describe(
      "This the token address is one which we send out for swap to another token. Example:'0xB0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'"
    ),
  inputTokenAmount: z
    .string()
    .describe("This the user input amount. Example:'100'"),
});

export const TransactionSchema = z.object({
  chainId: z
    .string()
    .describe("This is the id of the chain. Example:'1 for ethereum'")
    .optional(),

  tokenIn: z
    .string()
    .describe(
      "This is the address of the token that user gets in from another chain while bridging or from same chain when swapping. Example:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'"
    )
    .optional(),
  tokenOut: z
    .string()
    .optional()
    .describe(
      "This is the address of the token that user sends out to another chain while bridging or from same chain when swapping. Example:'0xB0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'"
    ),
  inputTokenAmount: z
    .string()
    .optional()
    .describe("This the user input amount. Example:'100'"),
  receiverAddress: z
    .string()
    .optional()
    .describe(
      "This the receiving address. Example:'0x701bC19d0a0502f5E3AC122656aba1d412bE51DD'"
    ),
  accountAddress: z
    .string()
    .optional()
    .describe(
      "This the user address. Example:'0xBE882FE36D60307E3D350E5FDeD004037f5ab4ab'"
    ),
  tokenAddress: z
    .string()
    .optional()
    .describe(
      "This the token address. Example:'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'"
    ),
  chainIdOut: z
    .string()
    .optional()
    .describe(
      "This the id of the chain from which token will be out or the token transferring out of this chain. Example:'1 for ethereum'"
    ),
  chainIdIn: z
    .string()
    .optional()
    .describe(
      "This is the id of chain that token will be received or the token transferring to this chain. Example:'8453 for base'"
    ),
  transactions: z.array(z.object({})).optional(),
});
