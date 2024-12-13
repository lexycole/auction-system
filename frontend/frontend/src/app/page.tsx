"use client";
import Image from "next/image";
import faucet from "../../public/assets/faucetBanner.svg";
import deployer from "../../public/assets/deployerBanner.svg";
import wikipedia from "../../public/assets/wikipediaBanner.svg";
import addressBook from "../../public/assets/addressBook.svg";
import converter from "../../public/assets/converterBanner.svg";
import burnerWallet from "../../public/assets/burnerWallet.svg";
import Link from "next/link";
import Upright from "public/svg/Upright";
import NetworkSwitcher from "./components/lib/NetworkSwitcher";
import Header from "./components/internal/Header";
import AddTokenButton from "./components/lib/AddToken";
import { Account, Contract, Provider } from 'starknet';
import React, { useState, useEffect } from 'react';

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  // Auction state
  const [nftId, setNftId] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [auctionDuration, setAuctionDuration] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [highestBid, setHighestBid] = useState(null);

  // Helper function to convert to BigInt safely
  const safeBigInt = (value) => {
    try {
      return value !== '' ? BigInt(value) : BigInt(0);
    } catch (error) {
      console.error('Invalid BigInt conversion:', error);
      return BigInt(0);
    }
  };

  const accAddres = process.env.NEXT_APP_ACCOUNT_ADDRESS
  const privateKey = process.env.NEXT_APP_PRIVATE_KEY
  const contAddres =  process.env.NEXT_APP_CONTRACT_ADDRESS 

  useEffect(() => {
    const initStarknet = async () => {
      try {
        // Use environment variables
        const starknetProvider = new Provider({
          nodeUrl: process.env.REACT_APP_STARKNET_PROVIDER_URL
        });


        const starknetAccount = new Account(
          starknetProvider, 
          accAddres,
          privateKey
        );

        const auctionContract = new Contract(
          [], // Your contract ABI here
          contAddres, 
          starknetProvider
        );

        setProvider(starknetProvider);
        setAccount(starknetAccount);
        setContract(auctionContract);
      } catch (error) {
        console.error('Starknet initialization error:', error);
      }
    };

    initStarknet();
  }, []);

  const createAuction = async () => {
    if (!contract) {
      alert('Contract not initialized');
      return;
    }

    try {
      await contract.create_auction(
        safeBigInt(nftId),
        safeBigInt(startPrice),
        safeBigInt(auctionDuration)
      );
      alert('Auction created successfully!');
    } catch (error) {
      console.error('Error creating auction:', error);
      alert(`Failed to create auction: ${error.message}`);
    }
  };

  const placeBid = async () => {
    if (!contract) {
      alert('Contract not initialized');
      return;
    }

    try {
      await contract.place_bid(
        safeBigInt(nftId),
        safeBigInt(bidAmount)
      );
      alert('Bid placed successfully!');
    } catch (error) {
      console.error('Error placing bid:', error);
      alert(`Failed to place bid: ${error.message}`);
    }
  };

  const fetchHighestBid = async () => {
    if (!contract) {
      alert('Contract not initialized');
      return;
    }

    try {
      const [bidder, amount] = await contract.get_current_highest_bid(safeBigInt(nftId));
      setHighestBid({ 
        bidder, 
        amount: amount.toString() 
      });
    } catch (error) {
      console.error('Error fetching highest bid:', error);
      alert(`Failed to fetch highest bid: ${error.message}`);
    }
  };

  const endAuction = async () => {
    if (!contract) {
      alert('Contract not initialized');
      return;
    }

    try {
      await contract.end_auction(safeBigInt(nftId));
      alert('Auction ended successfully!');
    } catch (error) {
      console.error('Error ending auction:', error);
      alert(`Failed to end auction: ${error.message}`);
    }
  };

  return (
    <main className="flex min-h-svh flex-col justify-between gap-16">
      <Header />

      <section className="pt-[8rem] md:pt-[clamp(200px,25vh,650px)]">
        <div className="mx-auto flex max-w-[600px] flex-col gap-8 p-4 text-center md:max-w-[850px] md:p-8">
          <h1 className="text-2xl text-[--headings] md:text-3xl">
            Everything you need to buidl pixel-perfect dApps on Starknet
          </h1>
          <p className="text-md">
            A modern clean version of Starknet-Scaffold with NextJS, Starknetjs,
            Starknetkit, Starknet-React and Typescript. Supports Scarb and
            Starknet Foundry for contract development.
          </p>

          <div className="flex items-center justify-center gap-4">
            <NetworkSwitcher />
            <AddTokenButton />
          </div>
        </div>
      </section>

      <section className="container mx-auto flex w-[90%] grid-cols-3 grid-rows-2 flex-col gap-4 text-text-primary md:grid md:gap-2 lg:w-[80%] lg:gap-4">
      <div className="feat-link relative col-span-2 mx-auto h-[280px] w-full max-w-[500px] overflow-clip rounded-[16px] bg-[--link-card] md:h-[350px] md:max-w-none">
          <Link
            href="/burner"
            target="_blank"
            rel="noopener noreferrer"
            className="feat-link flex h-full w-full flex-col rounded-[16px] p-4 transition-all duration-500 md:block md:pb-0"
          >
            <div className="p-4 md:absolute md:pt-8 lg:w-[40%]">
              <h2 className="mb-2 flex items-center gap-1 text-l text-[--headings]">
                <span>Scaffold Burner Wallet</span>
                <span className="arrow transition-all duration-500">
                  <Upright />
                </span>
              </h2>
              <p className="">
                Generate temporary wallets which can be used during the course
                of development
              </p>
            </div>
            <div className="flex h-full w-full">
              <Image src={burnerWallet} alt="" className="mt-auto w-full" />
            </div>
          </Link>
        </div>

        <div className="feat-link relative mx-auto h-[280px] w-full max-w-[500px] overflow-clip rounded-[16px] bg-[--link-card] md:h-[350px] md:max-h-none md:max-w-none">
           <h1 className="text-2xl font-bold mb-4">NFT StarkNet Auction System</h1>

        </div>
       
        <div className="space-y-4">
          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Create Auction</h2>
            <div className="space-y-2">
              <input 
                type="text"
                placeholder="NFT ID"
                className="w-full p-2 border rounded"
                value={nftId}
                onChange={(e) => setNftId(e.target.value)}
              />
              <input 
                type="text"
                placeholder="Start Price"
                className="w-full p-2 border rounded"
                value={startPrice}
                onChange={(e) => setStartPrice(e.target.value)}
              />
              <input 
                type="text"
                placeholder="Auction Duration (seconds)"
                className="w-full p-2 border rounded"
                value={auctionDuration}
                onChange={(e) => setAuctionDuration(e.target.value)}
              />
              <button 
                onClick={createAuction}
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Create Auction
              </button>
            </div>
          </div>

          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Place Bid</h2>
            <div className="space-y-2">
              <input 
                type="text"
                placeholder="NFT ID"
                className="w-full p-2 border rounded"
                value={nftId}
                onChange={(e) => setNftId(e.target.value)}
              />
              <input 
                type="text"
                placeholder="Bid Amount"
                className="w-full p-2 border rounded"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
              />
              <button 
                onClick={placeBid}
                className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
              >
                Place Bid
              </button>
            </div>
          </div>

          <div className="border p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Auction Details</h2>
            <div className="space-y-2">
              <input 
                type="text"
                placeholder="NFT ID to Check"
                className="w-full p-2 border rounded"
                value={nftId}
                onChange={(e) => setNftId(e.target.value)}
              />
              <button 
                onClick={fetchHighestBid}
                className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600"
              >
                Get Highest Bid
              </button>
              {highestBid && (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <p>Highest Bidder: {highestBid.bidder}</p>
                  <p>Bid Amount: {highestBid.amount}</p>
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
          <img
            src={"assets/footerLogo.svg"}
            alt="burner banner"
            className="mx-auto"
          />
          <h2 className="mb-4 text-center text-xl leading-[58px] text-accent-primary md:text-2xl">
            NFT AUCTION SYSTEM
          </h2>
          
          <a
            className="w-fit rounded-[12px] bg-background-primary-light px-12 py-3 text-accent-secondary transition-all duration-300 hover:rounded-[20px]"
            href="https://t.me/+sH0ug1mZ_WtjNmM0"
          >
            go up
          </a>
        </div>
      </div>
    </main>
  );
}
