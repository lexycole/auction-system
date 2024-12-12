use starknet::ContractAddress; // Ensure this import is correct
use core::result::Result;
use starknet::testing::set_contract_address;
use core::traits::{TryInto, Into};
use core::array::{ArrayTrait, Array}; // Check if you need both imports

use snforge_std::{
    declare, 
    CheatTarget,
    start_prank,
    stop_prank,
    ContractClassTrait,
    deploy_contract 
};

use auction_system::{
    IAuctionSystemDispatcher, 
    IAuctionSystemDispatcherTrait
};

fn deploy_auction_system(owner: ContractAddress) -> ContractAddress {
    let contract_class = match declare("AuctionSystem") {
        Result::Ok(class) => class,
        Result::Err(_) => panic!("Failed to declare the contract class")
    };
    
    // Ensure 'array!' macro is correctly defined and imported
    let calldata = array![owner.into()]; 
    
    let deployed_contract_address = match deploy_contract(contract_class, calldata.span()) {
        Result::Ok(address) => address,
        Result::Err(_) => panic!("Failed to deploy the contract")
    };

    deployed_contract_address
}




#[test]
fn test_place_bid() {
    let owner = starknet::contract_address_const::<0x123>();
    let bidder1 = starknet::contract_address_const::<0x456>();
    let contract_address = deploy_auction_system(owner);
    let dispatcher = IAuctionSystemDispatcher { contract_address };

    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.unpause();
    stop_prank(CheatTarget::One(contract_address));

    let nft_id: u256 = 1;
    let start_price: u256 = 100;
    let auction_duration: u64 = 86400;

    dispatcher.create_auction(nft_id, start_price, auction_duration);

    start_prank(CheatTarget::One(contract_address), bidder1);
    dispatcher.place_bid(nft_id, 200);

    let (highest_bidder, highest_bid) = dispatcher.get_current_highest_bid(nft_id);

    assert!(highest_bidder == bidder1, "Highest bidder mismatch");
    assert!(highest_bid == 200, "Highest bid is incorrect");

    stop_prank(CheatTarget::One(contract_address));
}