"use client";
import NetworkSwitcher from "./components/lib/NetworkSwitcher";
import Header from "./components/internal/Header";
import AddTokenButton from "./components/lib/AddToken";
import React, { useState, useEffect, useCallback } from 'react';
import { Account, Contract, Provider, RpcProvider } from 'starknet';

// Enhance ABI with more comprehensive type information
const AuctionSystemABI = [
  {
    name: 'create_auction',
    type: 'function',
    inputs: [
      { name: 'nft_id', type: 'felt' },
      { name: 'start_price', type: 'felt' },
      { name: 'auction_duration', type: 'felt' }
    ],
    outputs: []
  },
  {
    name: 'place_bid',
    type: 'function',
    inputs: [
      { name: 'nft_id', type: 'felt' },
      { name: 'bid_amount', type: 'felt' }
    ],
    outputs: []
  },
  {
    name: 'end_auction',
    type: 'function',
    inputs: [{ name: 'nft_id', type: 'felt' }],
    outputs: []
  },
  {
    name: 'get_current_highest_bid',
    type: 'function',
    inputs: [{ name: 'nft_id', type: 'felt' }],
    outputs: [
      { name: 'highest_bidder', type: 'felt' },
      { name: 'highest_bid', type: 'felt' }
    ]
  },
  {
    name: 'withdraw_bid',
    type: 'function',
    inputs: [{ name: 'nft_id', type: 'felt' }],
    outputs: []
  }
];

// Custom hook for managing Starknet connection
const useStarknetConnection = () => {
  const [provider, setProvider] = useState<RpcProvider | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const initStarknet = async () => {
      try {
        const requiredVars = [
          'NEXT_PUBLIC_ACCOUNT_ADDRESS',
          'NEXT_PUBLIC_PRIVATE_KEY',
          'NEXT_PUBLIC_CONTRACT_ADDRESS',
          'NEXT_PUBLIC_STARKNET_PROVIDER_URL'
        ];
        console.log('requiredVars', requiredVars)
        
        const missingVars = requiredVars.filter(varName => 
          process.env[varName] === undefined || process.env[varName] === ''
        );

      const starknetProvider = new RpcProvider({
        nodeUrl: process.env.NEXT_PUBLIC_STARKNET_PROVIDER_URL!
      });

      const starknetAccount = new Account(
        starknetProvider, 
        process.env.NEXT_PUBLIC_ACCOUNT_ADDRESS!,
        process.env.NEXT_PUBLIC_PRIVATE_KEY!
      );

      const auctionContract = new Contract(
        AuctionSystemABI, 
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!, 
        starknetProvider
      );

        setProvider(starknetProvider);
        setAccount(starknetAccount);
        setContract(auctionContract);
      } catch (error) {
        console.error('Starknet initialization error:', error);
        setConnectionError(error instanceof Error ? error.message : 'Unknown initialization error');
      }
    };

    initStarknet();
  }, []);

  return { provider, account, contract, connectionError };
};

export default function Home() {
  const { provider, account, contract, connectionError } = useStarknetConnection();

  // Auction state with more robust typing
  const [auctionState, setAuctionState] = useState({
    nftId: '',
    startPrice: '',
    auctionDuration: '',
    bidAmount: '',
    highestBid: {
      bidder: '',
      amount: '',
      loading: false,
      error: null as string | null
    }
  });

  // Enhanced error handling utility
  const handleContractError = (error: unknown, actionName: string): void => {
    const errorMessage = error instanceof Error 
      ? error.message 
      : `Unknown error during ${actionName}`;
    
    console.error(`${actionName} error:`, error);
    alert(errorMessage);
  };

  // Safely convert string to BigInt
  const safeBigInt = useCallback((value: string): bigint => {
    try {
      return value !== '' ? BigInt(value) : BigInt(0);
    } catch (error) {
      console.error('Invalid BigInt conversion:', error);
      return BigInt(0);
    }
  }, []);

  // Contract interaction methods with improved error handling
  const createAuction = async () => {
    if (!contract || !account) {
      alert('Contract or account not initialized');
      return;
    }
  
    try {
      await contract.call('create_auction', [
        safeBigInt(auctionState.nftId).toString(),
        safeBigInt(auctionState.startPrice).toString(),
        safeBigInt(auctionState.auctionDuration).toString()
      ]);
      alert('Auction created successfully!');
    } catch (error) {
      handleContractError(error, 'create auction');
    }
  };
  
  const placeBid = async () => {
    if (!contract || !account) {
      alert('Contract or account not initialized');
      return;
    }
  
    try {
      await contract.call('place_bid', [
        safeBigInt(auctionState.nftId).toString(),
        safeBigInt(auctionState.bidAmount).toString()
      ]);
      alert('Bid placed successfully!');
    } catch (error) {
      handleContractError(error, 'place bid');
    }
  };
  
  const fetchHighestBid = async () => {
    if (!contract) {
      alert('Contract not initialized');
      return;
    }
  
    setAuctionState(prev => ({
      ...prev,
      highestBid: { ...prev.highestBid, loading: true, error: null }
    }));
  
    try {
      const result = await contract.call('get_current_highest_bid', [
        safeBigInt(auctionState.nftId).toString()
      ]);
  
      const [bidder, amount] = result as [bigint, bigint];
      setAuctionState(prev => ({
        ...prev,
        highestBid: {
          bidder: bidder.toString(),
          amount: amount.toString(),
          loading: false,
          error: null
        }
      }));
    } catch (error) {
      handleContractError(error, 'fetch highest bid');
      setAuctionState(prev => ({
        ...prev,
        highestBid: {
          bidder: '',
          amount: '',
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  };
  
  const endAuction = async () => {
    if (!contract || !account) {
      alert('Contract or account not initialized');
      return;
    }
  
    try {
      await contract.call('end_auction', [
        safeBigInt(auctionState.nftId).toString()
      ]);
      alert('Auction ended successfully!');
    } catch (error) {
      handleContractError(error, 'end auction');
    }
  };

  const withdrawBid = async () => {
    if (!contract || !account) {
      alert('Contract or account not initialized');
      return;
    }
  
    try {
      await contract.call('withdraw_bid', [
        safeBigInt(auctionState.nftId).toString()
      ]);
      alert('Bid withdrawn successfully!');
    } catch (error) {
      handleContractError(error, 'withdraw bid');
    }
  };

  // Update state handler with type-safe methods
  const updateAuctionState = (key: keyof typeof auctionState, value: string) => {
    setAuctionState(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Render connection error if exists
  if (connectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Connection Error</h1>
          <p className="mt-2 text-red-500">{connectionError}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-svh flex-col justify-between gap-16">
      <Header />

      <section className="pt-[8rem] md:pt-[clamp(200px,25vh,650px)]">
        <div className="mx-auto flex max-w-[600px] flex-col gap-8 p-4 text-center md:max-w-[850px] md:p-8">
          <h1 className="text-2xl text-[--headings] md:text-3xl">
            Starknet NFT Auction System
          </h1>
          <p className="text-md">
            Place bids, create auctions, and manage NFT sales on Starknet
          </p>

          <div className="flex items-center justify-center gap-4">
            <NetworkSwitcher />
            <AddTokenButton />
          </div>
        </div>
      </section>

      <section className="container mx-auto flex w-[90%] grid-cols-3 grid-rows-2 flex-col gap-4 text-text-primary md:grid md:gap-2 lg:w-[80%] lg:gap-4">
        {/* Create Auction Section */}
        <div className="feat-link relative mx-auto h-full w-full max-w-[500px] overflow-clip rounded-[16px] bg-[--link-card] md:h-[350px] md:max-h-none md:max-w-none">
          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Create Auction</h2>
            <div className="space-y-2">
              <input 
                type="text"
                placeholder="NFT ID"
                className="w-full p-2 border rounded"
                value={auctionState.nftId}
                onChange={(e) => updateAuctionState('nftId', e.target.value)}
              />
              <input 
                type="text"
                placeholder="Start Price"
                className="w-full p-2 border rounded"
                value={auctionState.startPrice}
                onChange={(e) => updateAuctionState('startPrice', e.target.value)}
              />
              <input 
                type="text"
                placeholder="Auction Duration (seconds)"
                className="w-full p-2 border rounded"
                value={auctionState.auctionDuration}
                onChange={(e) => updateAuctionState('auctionDuration', e.target.value)}
              />
              <button 
                onClick={createAuction}
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                disabled={!contract || !account}
              >
                Create Auction
              </button>
            </div>
          </div>
        </div>

        {/* Place Bid Section */}
        <div className="feat-link relative mx-auto h-full w-full max-w-[500px] overflow-clip rounded-[16px] bg-[--link-card] md:h-[350px] md:max-h-none md:max-w-none">
          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Place Bid</h2>
            <div className="space-y-2">
              <input 
                type="text"
                placeholder="NFT ID"
                className="w-full p-2 border rounded"
                value={auctionState.nftId}
                onChange={(e) => updateAuctionState('nftId', e.target.value)}
              />
              <input 
                type="text"
                placeholder="Bid Amount"
                className="w-full p-2 border rounded"
                value={auctionState.bidAmount}
                onChange={(e) => updateAuctionState('bidAmount', e.target.value)}
              />
              <div className="flex gap-2">
                <button 
                  onClick={placeBid}
                  className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
                  disabled={!contract || !account}
                >
                  Place Bid
                </button>
                <button 
                  onClick={withdrawBid}
                  className="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600"
                  disabled={!contract || !account}
                >
                  Withdraw Bid
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Auction Details Section */}
        <div className="feat-link relative mx-auto h-full w-full max-w-[500px] overflow-clip rounded-[16px] bg-[--link-card] md:h-[350px] md:max-h-none md:max-w-none">
          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Auction Details</h2>
            <div className="space-y-2">
              <input 
                type="text"
                placeholder="NFT ID to Check"
                className="w-full p-2 border rounded"
                value={auctionState.nftId}
                onChange={(e) => updateAuctionState('nftId', e.target.value)}
              />
              <button 
                onClick={fetchHighestBid}
                className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
                disabled={!contract}
              >
                Get Highest Bid
              </button>
              {auctionState.highestBid.loading ? (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  Loading highest bid...
                </div>
              ) : auctionState.highestBid.error ? (
                <div className="mt-2 p-2 bg-red-100 rounded text-red-600">
                  {auctionState.highestBid.error}
                </div>
              ) : auctionState.highestBid.bidder && (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <p>Highest Bidder: {auctionState.highestBid.bidder}</p>
                  <p>Bid Amount: {auctionState.highestBid.amount}</p>
                </div>
              )}
              <button 
                onClick={endAuction}
                className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
                >
                  End Auction
                </button>
              </div>
          </div>
        </div>

      </section>

      {/* <-- END */}

      {/* Community --> */}
      <div className="flex w-full flex-col items-center justify-center gap-4 bg-footer-image bg-cover bg-center bg-no-repeat px-4 py-16 md:px-8">
        <div className="flex flex-col items-center gap-4">
          
          <h2 className="mb-4 text-center text-xl leading-[58px] text-accent-primary md:text-2xl">
            NFT AUCTION SYSTEM
          </h2>
          
          <a
            className="w-fit rounded-[12px] bg-background-primary-light px-12 py-3 text-accent-secondary transition-all duration-300 hover:rounded-[20px]"
            href="https://github.com/lexycole/auction-system/tree/frontend"
          >
            Check Source code
          </a>
        </div>
      </div>
    </main>
  );
}
