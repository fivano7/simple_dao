# Simple_dao
Simple decentralized autonomous organization (DAO) built using openzeppelin, solidity, hardhat, and ethers.js. The app is not interactive, it's just a learning project. The main idea is that owners of the token can vote on certain proposals. Their voting power is based on what percentage of the token they own. In this case, proposal is - should they send ether to somebody? The proposal itself is the method on certain smart contract, so it's automated. Once they agree on the proposal the method to send ether is "unlocked" and the executor can call the method on the smart contract. 

## Technologies
- Javascript
- NodeJS
- Solidity version ^0.8.9
- Openzeppelin library
- Ethers.js
- Hardhat

## Requirements for the first Setup
- NodeJS
- Hardhat

## Setting up
- Clone repository
- Install dependencies with "npm install"
- Run "npm run hardhatNode"
- Run "npm run deploy"
- Run "npm run createProposal"