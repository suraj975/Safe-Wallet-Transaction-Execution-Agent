import { useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useWalletClient } from "wagmi";
import { Address, parseEther } from "viem";

interface TransactionProps {
  transaction: { to: string; data: string; value: string };
  graphState: {
    accountAddress: string;
    chainId: number;
    inputTokenAmount: string;
    receiverAddress: string;
    tokenAddress: string;
    tokenIn?: string;
    tokenOut?: string;
    type: "send_token" | "bridge_token" | "swap_token_call";
  };
}

enum TransactionType {
  send_token = "Transfer",
  bridge_token = "Bridge",
  swap_token_call = "Swap",
}
const Transactions: React.FC<TransactionProps> = ({
  transaction,
  graphState,
}) => {
  const [status, setStatus] = useState<"pending" | "completed" | "failed">(
    "pending"
  );
  const { data: walletClient } = useWalletClient();

  if (!walletClient) {
    console.log("Wallet not connected");
    return;
  }

  const executeTransaction = async () => {
    try {
      setStatus("pending");
      const txHash = await walletClient.sendTransaction({
        to: transaction?.to as Address,
        data: transaction?.data as Address,
        value: parseEther(transaction.value),
      });
      console.log("Transaction sent:", txHash);
      setStatus("completed");
    } catch (error) {
      console.log("Transaction failed:", error);
      setStatus("failed");
    }
  };

  return (
    <div className="w-full mx-2 my-2 bg-gray-800 text-white rounded-lg shadow-md p-4 border border-gray-700 transition-all duration-300 hover:shadow-lg">
      {/* Header Section */}
      <div className="flex justify-between items-center pb-2 mb-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-cyan-300">
          {TransactionType[graphState.type]}
        </h3>
        <div>
          {status === "pending" && (
            <Loader2 className="animate-spin text-yellow-400" size={18} />
          )}
          {status === "completed" && (
            <CheckCircle className="text-green-500" size={18} />
          )}
          {status === "failed" && (
            <XCircle className="text-red-500" size={18} />
          )}
        </div>
      </div>

      {/* Transaction Details */}
      <div className="text-xs space-y-2">
        <p className="flex justify-between">
          <span className="text-gray-400 font-medium">Chain ID:</span>
          <span>{graphState?.chainId}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-gray-400 font-medium">Account:</span>
          <span
            className="truncate max-w-[120px] inline-block"
            title={graphState.accountAddress}
          >
            {graphState.accountAddress.slice(0, 6)}...
            {graphState.accountAddress.slice(-4)}
          </span>
        </p>
        {graphState.type !== "send_token" && (
          <p className="flex justify-between">
            <span className="text-gray-400 font-medium">Token In:</span>
            <span>
              {graphState?.tokenIn?.slice(0, 6)}...
              {graphState?.tokenIn?.slice(-4)}
            </span>
          </p>
        )}
        {graphState.type !== "send_token" && (
          <p className="flex justify-between">
            <span className="text-gray-400 font-medium">Token Out:</span>
            <span>
              {graphState?.tokenOut?.slice(0, 6)}...
              {graphState?.tokenOut?.slice(-4)}
            </span>
          </p>
        )}
        <p className="flex justify-between">
          <span className="text-gray-400 font-medium">Amount:</span>
          <span>{graphState.inputTokenAmount}</span>
        </p>
      </div>

      {/* Status Badge */}
      <div className="mt-3 flex justify-center">
        {status === "pending" && (
          <span className="inline-block bg-yellow-500 text-black px-3 py-1 text-xs font-semibold rounded-full">
            Pending
          </span>
        )}
        {status === "completed" && (
          <span className="inline-block bg-green-500 text-white px-3 py-1 text-xs font-semibold rounded-full">
            Completed
          </span>
        )}
        {status === "failed" && (
          <span className="inline-block bg-red-500 text-white px-3 py-1 text-xs font-semibold rounded-full">
            Failed
          </span>
        )}
      </div>

      {/* Execute Button */}
      <div className="mt-4">
        <button
          onClick={executeTransaction}
          className={`w-full py-2 px-3 rounded-lg text-white font-semibold transition duration-200 text-xs ${
            status === "failed"
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {TransactionType[graphState.type]}
        </button>
      </div>
    </div>
  );
};

export default Transactions;
