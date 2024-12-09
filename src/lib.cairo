#[starknet::interface]
pub trait IAuctionSystem<TContractState> {
    fn create_auction(ref self: TContractState, nft_id: u256, start_price: u256, auction_duration: u64);
    fn place_bid(ref self: TContractState, nft_id: u256, bid_amount: u256);
    fn end_auction(ref self: TContractState, nft_id: u256);
    fn get_current_highest_bid(self: @TContractState, nft_id: u256) -> (felt252, u256);
    fn withdraw_bid(ref self: TContractState, nft_id: u256);
}

#[starknet::contract]
mod AuctionSystem {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_block_timestamp;
    use core::array::ArrayTrait;
    use core::traits::TryInto;
    use core::option::OptionTrait;
    use core::num::traits::Zero;

    #[storage]
    struct Storage {
        // Auction start price
        auction_start_price: LegacyMap::<u256, u256>,
        // Auction highest bid
        auction_highest_bid: LegacyMap::<u256, u256>,
        // Auction start timestamp
        auction_start_time: LegacyMap::<u256, u64>,
        // Auction duration
        auction_duration: LegacyMap::<u256, u64>,
        // Auction active status
        auction_is_active: LegacyMap::<u256, bool>,
        // Bids for each NFT and bidder
        bids: LegacyMap::<(u256, felt252), u256>,
        // Track highest bidder for each NFT
        highest_bidders: LegacyMap::<u256, felt252>
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AuctionCreated: AuctionCreated,
        BidPlaced: BidPlaced,
        AuctionEnded: AuctionEnded,
        BidWithdrawn: BidWithdrawn
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
        bidder: felt252,
        bid_amount: u256
    }

    #[derive(Drop, starknet::Event)]
    struct AuctionEnded {
        nft_id: u256,
        winner: felt252,
        winning_bid: u256
    }

    #[derive(Drop, starknet::Event)]
    struct BidWithdrawn {
        nft_id: u256,
        bidder: felt252,
        bid_amount: u256
    }

    #[abi(embed_v0)]
    impl AuctionSystemImpl of super::IAuctionSystem<ContractState> {
        fn create_auction(ref self: ContractState, nft_id: u256, start_price: u256, auction_duration: u64) {
            // Get caller address
            let caller: felt252 = get_caller_address().try_into().unwrap();
            
            // Validate inputs
            assert(auction_duration > 0, 'Invalid auction duration');
            assert(start_price > 0, 'Start price must be positive');
            
            // Store auction details
            let current_timestamp = get_block_timestamp();
            self.auction_start_price.write(nft_id, start_price);
            self.auction_highest_bid.write(nft_id, start_price);
            self.auction_start_time.write(nft_id, current_timestamp);
            self.auction_duration.write(nft_id, auction_duration);
            self.auction_is_active.write(nft_id, true);
            
            // Emit event
            self.emit(Event::AuctionCreated(AuctionCreated { 
                nft_id, 
                start_price, 
                auction_duration 
            }));
        }

        fn place_bid(ref self: ContractState, nft_id: u256, bid_amount: u256) {
            // Get caller address
            let caller: felt252 = get_caller_address().try_into().unwrap();
            
            // Check auction is active
            assert(self.auction_is_active.read(nft_id), 'Auction is not active');
            
            // Check current timestamp
            let current_timestamp = get_block_timestamp();
            let auction_start = self.auction_start_time.read(nft_id);
            let auction_length = self.auction_duration.read(nft_id);
            assert(current_timestamp < auction_start + auction_length, 'Auction has ended');
            
            // Validate bid
            let current_highest_bid = self.auction_highest_bid.read(nft_id);
            assert(bid_amount > current_highest_bid, 'Bid too low');
            
            // Refund previous highest bidder
            let previous_highest_bidder = self.highest_bidders.read(nft_id);
            if previous_highest_bidder != 0 {
                let previous_highest_bid = self.bids.read((nft_id, previous_highest_bidder));
                self.bids.write((nft_id, previous_highest_bidder), 0);
            }
            
            // Store new bid
            self.bids.write((nft_id, caller), bid_amount);
            
            // Update auction details
            self.auction_highest_bid.write(nft_id, bid_amount);
            
            // Update highest bidder
            self.highest_bidders.write(nft_id, caller);
            
            // Emit event
            self.emit(Event::BidPlaced(BidPlaced { 
                nft_id, 
                bidder: caller, 
                bid_amount 
            }));
        }

        fn end_auction(ref self: ContractState, nft_id: u256) {
            // Check auction is active
            assert(self.auction_is_active.read(nft_id), 'Auction already ended');
            
            // Check auction has ended
            let current_timestamp = get_block_timestamp();
            let auction_start = self.auction_start_time.read(nft_id);
            let auction_length = self.auction_duration.read(nft_id);
            assert(current_timestamp >= auction_start + auction_length, 'Auction not yet ended');
            
            // Get highest bidder
            let winner = self.highest_bidders.read(nft_id);
            
            // Mark auction as inactive
            self.auction_is_active.write(nft_id, false);
            
            // Emit event
            self.emit(Event::AuctionEnded(AuctionEnded { 
                nft_id, 
                winner, 
                winning_bid: self.auction_highest_bid.read(nft_id)
            }));
        }

        fn get_current_highest_bid(self: @ContractState, nft_id: u256) -> (felt252, u256) {
            // Get highest bidder and bid amount
            let highest_bidder = self.highest_bidders.read(nft_id);
            let highest_bid = self.bids.read((nft_id, highest_bidder));
            
            (highest_bidder, highest_bid)
        }

        fn withdraw_bid(ref self: ContractState, nft_id: u256) {
            // Get caller address
            let caller: felt252 = get_caller_address().try_into().unwrap();
            
            // Get user's bid
            let bid_amount = self.bids.read((nft_id, caller));
            assert(bid_amount > 0, 'No bid to withdraw');
            
            // Check they are not the highest bidder
            let highest_bidder = self.highest_bidders.read(nft_id);
            assert(caller != highest_bidder, 'Cannot withdraw highest bid');
            
            // Clear bid
            self.bids.write((nft_id, caller), 0);
            
            // Emit event
            self.emit(Event::BidWithdrawn(BidWithdrawn { 
                nft_id, 
                bidder: caller, 
                bid_amount 
            }));
        }
    }
}