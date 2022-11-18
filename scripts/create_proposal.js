const { ethers } = require('hardhat');

const { address: governanceAddress } = require(__dirname + "/../contractsData/Governance-address.json")
const { abi: governanceAbi } = require(__dirname + "/../contractsData/Governance.json")

const { address: tokenAddress } = require(__dirname + "/../contractsData/Token-address.json")
const { abi: tokenAbi } = require(__dirname + "/../contractsData/Token.json")

const { address: timeLockAddress } = require(__dirname + "/../contractsData/TimeLock-address.json")
const { abi: timeLockAbi } = require(__dirname + "/../contractsData/TimeLock.json")

const { address: treasuryAddress } = require(__dirname + "/../contractsData/Treasury-address.json")
const { abi: treasuryAbi } = require(__dirname + "/../contractsData/Treasury.json")

//--create_proposal.js--
//glasači na tokenu zovu funkciju koja im dava mogućnost glasovanja. Na governance contract se spaja executor i šalje 4 parametra - 
//1.) koja je adresa contracta/contracata koje želi izvršiti u svom proposalu 2.) ? 3.) enkodirana funckija koja će se izvršiti
//na tom contractu 4.) naziv prijedloga (string). To vraća proposalId koji se onda koristi za provjeru stanja proposala koji može biti
//=> executed, canceled, pending, active, succeded, defeated. Nakon toga ispisujemo podatke o glasovanju i spajamo se s walletima i
//voteamo. Da bi prijedlog prošao moraju vlasnici 50/10000 tokena glasati za njega (5%). Kada je prijedlog prošao onda se nad
//governance contractom od strane executora poziva funkcija "queue" koja prijedlog stavlja u red za izvršavanje i na poslijetku execute 
//funkcija koja na treasury contractu poziva funkciju releaseFunds. 

async function main() {

    const governanceInstance = new ethers.Contract(governanceAddress, governanceAbi, ethers.provider)
    const tokenInstance = new ethers.Contract(tokenAddress, tokenAbi, ethers.provider)
    const timeLockInstance = new ethers.Contract(timeLockAddress, timeLockAbi, ethers.provider)
    const treasuryInstance = new ethers.Contract(treasuryAddress, treasuryAbi, ethers.provider)

    let isReleased, blocknumber, proposalState, vote
    const [contractDeployer, timeLockAdmin, executor, payee, proposer, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners()

    amount = ethers.utils.parseEther("5")

    //glasači sami sebi daju mogućnost glasovanja
    await tokenInstance.connect(voter1).delegate(voter1.address)
    await tokenInstance.connect(voter2).delegate(voter2.address)
    await tokenInstance.connect(voter3).delegate(voter3.address)
    await tokenInstance.connect(voter4).delegate(voter4.address)
    await tokenInstance.connect(voter5).delegate(voter5.address)

    isReleased = await treasuryInstance.isReleased()
    console.log(`Funds released: ${isReleased}`)

    funds = await ethers.provider.getBalance(treasuryInstance.address);
    console.log(`Treasury balance: ${ethers.utils.formatEther(funds)} ETH`)

    funds = await ethers.provider.getBalance(await treasuryInstance.payee());
    console.log(`Treasury payee account balance: ${ethers.utils.formatEther(funds)} ETH`)

    //U web3.js:
    //const encodedFunction = await treasuryInstance.contract.methods.releaseFunds().encodeABI()

    //U ethers.js
    let ABI = ["function releaseFunds() public"]; //bez onlyOwner
    let encodedFunction = new ethers.utils.Interface(ABI).encodeFunctionData("releaseFunds");

    const description = "Release funds from Treasury"

    //executor JEDINI može pozvati .propose() funkciju jer je on naveden kao executor u parametru TimeLock.deploy() funkcije, 
    //čudno jer ima i proposer koji se ne koristi
    let transaction = await governanceInstance.connect(executor).propose([treasuryInstance.address], [0], [encodedFunction], description)
    const txDetails = await transaction.wait();
    const proposalId = txDetails.events[0].args.proposalId.toString();
    console.log(`Prosposal created: ${proposalId}`)

    proposalState = await governanceInstance.state(proposalId)
    console.log(`Current state of proposal: ${proposalState.toString()} (Pending)`)

    const snapshot = await governanceInstance.proposalSnapshot(proposalId)
    console.log(`Proposal created on block: ${snapshot.toString()}`)

    const deadline = await governanceInstance.proposalDeadline(proposalId)
    console.log(`Proposal deadline on block: ${deadline.toString()}`)

    blocknumber = await ethers.provider.getBlockNumber()
    console.log(`Current block number: ${blocknumber.toString()}`)

    quorum = await governanceInstance.quorum(blocknumber - 1)
    console.log(`Number of votes required to pass: ${ethers.utils.formatEther(quorum.toString())}/1000`)

    console.log("Casting votes...")

    //0 - protiv, 1 - za, 2 - suzdržan
    vote = await governanceInstance.connect(voter1).castVote(proposalId, 1)
    vote = await governanceInstance.connect(voter2).castVote(proposalId, 1)
    vote = await governanceInstance.connect(voter3).castVote(proposalId, 1)
    vote = await governanceInstance.connect(voter4).castVote(proposalId, 0)
    vote = await governanceInstance.connect(voter5).castVote(proposalId, 2)

    proposalState = await governanceInstance.state(proposalId)
    console.log(`Current state of proposal: ${proposalState.toString()} (Active)`)

    const { againstVotes, forVotes, abstainVotes } = await governanceInstance.proposalVotes(proposalId)

    console.log(`Votes for: ${ethers.utils.formatEther(forVotes.toString())}`)
    console.log(`Votes against: ${ethers.utils.formatEther(againstVotes.toString())}`)
    console.log(`Votes neutral: ${ethers.utils.formatEther(abstainVotes.toString())}`)

    blocknumber = await ethers.provider.getBlockNumber()
    console.log(`Current blockNumber: ${blocknumber.toString()}`)

    proposalState = await governanceInstance.state(proposalId)
    console.log(`Current state of proposal: ${proposalState.toString()} (Succeeded)`)

    // queue
    // zadnje je bytes32 descriptionHash
    const hashedString = ethers.utils.id(description);
    await governanceInstance.connect(executor).queue([treasuryInstance.address], [0], [encodedFunction], hashedString)

    proposalState = await governanceInstance.state(proposalId)
    console.log(`Current state of proposal: ${proposalState.toString()} (Queued)`)

    //Izvršenje proposala
    await governanceInstance.connect(executor).execute([treasuryInstance.address], [0], [encodedFunction], hashedString)

    proposalState = await governanceInstance.state(proposalId)
    console.log(`Current state of proposal: ${proposalState.toString()} (Executed)`)

    isReleased = await treasuryInstance.isReleased()
    console.log(`Funds released: ${isReleased}`)

    funds = await ethers.provider.getBalance(treasuryInstance.address)
    console.log(`Treasury balance: ${ethers.utils.formatEther(funds)} ETH`)

    funds = await ethers.provider.getBalance(await treasuryInstance.payee());
    console.log(`Treasury payee account balance: ${ethers.utils.formatEther(funds)} ETH`)

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
