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
  bridge_token = "Swap",
  swap_token_call = "Bridge",
}

const PendingTransaction: React.FC<TransactionProps> = ({
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
        value: parseEther(transaction.value), // Since value is 0
      });
      console.log("Transaction sent:", txHash);
      setStatus("completed");
    } catch (error) {
      console.log("Transaction failed:", error);
      setStatus("failed");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-900 text-white rounded-xl shadow-lg p-6 border border-gray-700">
      {/* Header Section */}
      <div className="flex justify-between items-center border-b border-gray-600 pb-3 mb-4">
        <h3 className="text-lg font-semibold">
          {TransactionType[graphState.type]}
        </h3>
        <div>
          {status === "pending" && (
            <Loader2 className="animate-spin text-yellow-400" size={22} />
          )}
          {status === "completed" && (
            <CheckCircle className="text-green-500" size={22} />
          )}
          {status === "failed" && (
            <XCircle className="text-red-500" size={22} />
          )}
        </div>
      </div>

      {/* Transaction Details */}
      <div className="text-sm space-y-3">
        <p>
          <span className="text-gray-400 font-medium">Chain ID:</span>{" "}
          {graphState?.chainId}
        </p>
        <p>
          <span className="text-gray-400 font-medium">Account:</span>{" "}
          <span
            className="truncate max-w-[230px] inline-block"
            title={graphState.accountAddress}
          >
            {graphState.accountAddress.slice(0, 6)}...
            {graphState.accountAddress.slice(-4)}
          </span>
        </p>
        {graphState.type !== "send_token" && (
          <p>
            <span className="text-gray-400 font-medium">Token In:</span>{" "}
            {graphState.tokenIn}
          </p>
        )}
        {graphState.type !== "send_token" && (
          <p>
            <span className="text-gray-400 font-medium">Token Out:</span>{" "}
            {graphState.tokenOut}
          </p>
        )}
        <p>
          <span className="text-gray-400 font-medium">Amount:</span>{" "}
          {graphState.inputTokenAmount}
        </p>
      </div>

      {/* Status Badge */}
      <div className="mt-4 flex flex-stat text-center">
        {status === "pending" && (
          <span className="inline-block bg-yellow-500 text-black px-4 py-1 text-xs font-semibold rounded-full">
            Pending
          </span>
        )}
        {status === "completed" && (
          <span className="inline-block bg-green-500 text-white px-4 py-1 text-xs font-semibold rounded-full">
            Completed
          </span>
        )}
        {status === "failed" && (
          <span className="inline-block bg-red-500 text-white px-4 py-1 text-xs font-semibold rounded-full">
            Failed
          </span>
        )}
      </div>
      {/* Execute Button */}
      <div className="mt-5">
        <button
          onClick={executeTransaction}
          className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition duration-200 ${
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

export default PendingTransaction;
