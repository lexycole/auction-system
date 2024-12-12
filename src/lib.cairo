// SPDX-License-Identifier: MIT

use starknet::ContractAddress;
use core::traits::TryInto; 
// use core::zeroable::Zeroable
use core::num::traits::Zero;



#[starknet::interface]
pub trait IAuctionSystem<TContractState> {
    fn create_auction(ref self: TContractState, nft_id: u256, start_price: u256, auction_duration: u64);
    fn place_bid(ref self: TContractState, nft_id: u256, bid_amount: u256);
    fn end_auction(ref self: TContractState, nft_id: u256);
    fn get_current_highest_bid(self: @TContractState, nft_id: u256) -> (ContractAddress, felt252);
    fn withdraw_bid(ref self: TContractState, nft_id: u256);
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
}

#[starknet::contract]
mod AuctionSystem {
    use core::num::traits::Zero;
    use openzeppelin::access::ownable::OwnableComponent; 
    use openzeppelin::security::pausable::PausableComponent;
    
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_block_timestamp;


    // Declare the components
    component!(path: PausableComponent, storage: pausable, event: PausableEvent);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    // Instantiate `InternalImpl` to give the contract access to the `initializer`
    impl InternalImpl = OwnableComponent::InternalImpl<ContractState>;

    // Pausable integration
    #[abi(embed_v0)]
    impl PausableImpl = PausableComponent::PausableImpl<ContractState>;
    impl PausableInternalImpl = PausableComponent::InternalImpl<ContractState>;

    // Ownable integration
    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        auction_start_price: starknet::storage::Map::<u256, u256>,
        auction_highest_bid: starknet::storage::Map::<u256, u256>,
        auction_start_time: starknet::storage::Map::<u256, u64>,
        auction_duration: starknet::storage::Map::<u256, u64>,
        auction_is_active: starknet::storage::Map::<u256, bool>,
        bids: starknet::storage::Map::<(u256, ContractAddress), u256>,
        highest_bidders: starknet::storage::Map::<u256, ContractAddress>,
        
        #[substorage(v0)]
        pausable: PausableComponent::Storage,
        
        #[substorage(v0)]
        ownable: OwnableComponent::Storage
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AuctionCreated: AuctionCreated,
        BidPlaced: BidPlaced,
        AuctionEnded: AuctionEnded,
        BidWithdrawn: BidWithdrawn,
        
        #[flat]
        PausableEvent: PausableComponent::Event,
        
        #[flat]
        OwnableEvent: OwnableComponent::Event
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionCreated {
        nft_id: u256,
        start_price: u256,
        auction_duration: u64
    }

    #[derive(Drop, starknet::Event)]
    struct BidPlaced {
        nft_id: u256,
        bidder: ContractAddress,
        bid_amount: u256
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionEnded {
        nft_id: u256,
        winner: ContractAddress,
        winning_bid: u256
    }

    #[derive(Drop, starknet::Event)]
    struct BidWithdrawn {
        nft_id: u256,
        bidder: ContractAddress,
        bid_amount: u256
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.ownable.initializer(owner);
        self.pausable.pause();  // Use pause() instead of init()
    }

    #[abi(embed_v0)]
    impl AuctionSystemImpl of super::IAuctionSystem<ContractState> {
        fn create_auction(ref self: ContractState, nft_id: u256, start_price: u256, auction_duration: u64) {
            self.pausable.assert_not_paused();
            
            // Remove unused caller variable
            
            assert(auction_duration > 0, 'Invalid auction duration');
            assert(start_price > 0, 'Start price must be positive');
            
            let current_timestamp = get_block_timestamp();
            self.auction_start_price.write(nft_id, start_price);
            self.auction_highest_bid.write(nft_id, start_price);
            self.auction_start_time.write(nft_id, current_timestamp);
            self.auction_duration.write(nft_id, auction_duration);
            self.auction_is_active.write(nft_id, true);
            
            self.emit(Event::AuctionCreated(AuctionCreated { 
                nft_id, 
                start_price, 
                auction_duration 
            }));
        }

       

        fn place_bid(ref self: ContractState, nft_id: u256, bid_amount: u256) {
            self.pausable.assert_not_paused();
            
            let caller = get_caller_address();
            
            assert(self.auction_is_active.read(nft_id), 'Auction is not active');
            
            let current_timestamp = get_block_timestamp();
            let auction_start = self.auction_start_time.read(nft_id);
            let auction_length = self.auction_duration.read(nft_id);
            assert(current_timestamp < auction_start + auction_length, 'Auction has ended');
            
            let current_highest_bid = self.auction_highest_bid.read(nft_id);
            assert(bid_amount > current_highest_bid, 'Bid too low');
            
            let previous_highest_bidder = self.highest_bidders.read(nft_id);
            if !previous_highest_bidder.is_zero() {
                let _previous_highest_bid = self.bids.read((nft_id, previous_highest_bidder));
                self.bids.write((nft_id, previous_highest_bidder), 0);
            } 
            
            self.bids.write((nft_id, caller), bid_amount);
            self.auction_highest_bid.write(nft_id, bid_amount);
            self.highest_bidders.write(nft_id, caller);
            
            self.emit(Event::BidPlaced(BidPlaced { 
                nft_id, 
                bidder: caller, 
                bid_amount 
            }));
        }

        fn end_auction(ref self: ContractState, nft_id: u256) {
            self.pausable.assert_not_paused();
            
            assert(self.auction_is_active.read(nft_id), 'Auction already ended');
            
            let current_timestamp = get_block_timestamp();
            let auction_start = self.auction_start_time.read(nft_id);
            let auction_length = self.auction_duration.read(nft_id);
            assert(current_timestamp >= auction_start + auction_length, 'Auction not yet ended');
            
            let winner = self.highest_bidders.read(nft_id);
            self.auction_is_active.write(nft_id, false);
            
            self.emit(Event::AuctionEnded(AuctionEnded { 
                nft_id, 
                winner, 
                winning_bid: self.auction_highest_bid.read(nft_id)
            }));
        }

        fn get_current_highest_bid(self: @ContractState, nft_id: u256) -> (ContractAddress, felt252) {
            let highest_bidder = self.highest_bidders.read(nft_id);
            let highest_bid = self.bids.read((nft_id, highest_bidder));
            
            (highest_bidder, highest_bid.try_into().unwrap()) 
        }

        fn withdraw_bid(ref self: ContractState, nft_id: u256) {
            self.pausable.assert_not_paused();
            
            let caller = get_caller_address();
            
            let bid_amount = self.bids.read((nft_id, caller));
            assert(bid_amount > 0, 'No bid to withdraw');
            
            let highest_bidder = self.highest_bidders.read(nft_id);
            assert(caller != highest_bidder, 'Cannot withdraw highest bid');
            
            self.bids.write((nft_id, caller), 0);
            
            self.emit(Event::BidWithdrawn(BidWithdrawn { 
                nft_id, 
                bidder: caller, 
                bid_amount 
            }));
        }

        // Owner-only pause/unpause functions
        fn pause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.pause();
        }

        fn unpause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.unpause();
        }
    }
}