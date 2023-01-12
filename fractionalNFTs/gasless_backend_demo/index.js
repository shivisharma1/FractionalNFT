require("dotenv").config();
const express = require("express");
const Web3 = require("web3");
const Provider = require("@truffle/hdwallet-provider");
const { Biconomy } = require("@biconomy/mexa");
const {
  PORT,
  SC_ADDRESS,
  WALLET_ADDRESS,
  PRIVATE_KEY,
  JSON_RPC,
  BICONOMY_API_KEY,
  RANDOM_NUMBER,
} = process.env;

const app = express();

// Smart Contract's ABI.
const SmartContractABI = [
  {
    inputs: [
      { internalType: "address", name: "_trustedForwarder", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "ReturnCoolNumber",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTrustedForwarder",
    outputs: [{ internalType: "address", name: "forwarder", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "forwarder", type: "address" }],
    name: "isTrustedForwarder",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "x", type: "uint256" }],
    name: "setCoolNumber",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const sendData = async () => {
  const provider = new Provider(PRIVATE_KEY, JSON_RPC);
  const biconomyWithWeb3 = new Biconomy(provider, {
    apiKey: BICONOMY_API_KEY,
    debug: false, // To be set to true if you desire to view logs.
    contractAddresses: [SC_ADDRESS],
  });

  // The Web3 class is an umbrella package to house all Ethereum related modules.
  const web3 = new Web3(biconomyWithWeb3);

  // Creates a new contract instance with all its methods and events defined in its json interface object.
  const myContract = new web3.eth.Contract(SmartContractABI, SC_ADDRESS);

  // The transaction object.
  const txParams = {
    from: WALLET_ADDRESS,
    // gasLimit's optional or it can also be pre-estimated for the method call before passing.
    gasLimit: web3.utils.toHex(300000),
    to: SC_ADDRESS,
    // Call your target method. Here we're calling setCoolNumber() method of our contract.
    data: myContract.methods.setCoolNumber(RANDOM_NUMBER).encodeABI(),
  };

  // Signs an Ethereum transaction with a given private key.
  const signedTx = await web3.eth.accounts.signTransaction(
    txParams,
    `0x${PRIVATE_KEY}`
  );

  const rawTransaction = signedTx.rawTransaction;

  // Generating data to be signed.
  const forwardData = await biconomyWithWeb3.getForwardRequestAndMessageToSign(
    rawTransaction
  );

  // Signs arbitrary data.
  const { signature } = await web3.eth.accounts.sign(
    "0x" + forwardData.personalSignatureFormat.toString("hex"),
    PRIVATE_KEY
  );

  // A JSON object containing the user's signature, the raw transaction, forward request object and signature type.
  const data = {
    signature: signature,
    rawTransaction: rawTransaction,
    forwardRequest: forwardData.request,
  };

  console.log(data);
  // Get the TxHash & Receipt using the promise combined Event Emitter.
  web3.eth
    .sendSignedTransaction(data)
    .on("transactionHash", (txHash) => {
      console.log(`Transaction hash is: ${txHash}`);
    })
    .on("receipt", (receipt) => {
      console.log("Receipt of this transaction is: ", receipt);
    });
};

sendData();

app.listen(PORT, function (err) {
  if (err) console.log("Error in server setup!");
  console.log("Server listening on Port", PORT);
});
