const { ethers } = require("hardhat");

//Ukratko: 
//--deploy.js--
//Deploya se 1000 tokena i petero glasaca dobije 50 tokena. Nakon toga se deploya timeLock čija je svrha izvršavanje prijedloga nakon što je uspješan
//i u njemu se definira tko smije predlagati i tko izvršavati. Onda se deploya governance contract čija je svrha da se preko njega vrše prijedlozi.
//on prima % glasova potreban za izvršenje prijedloga, nakon koliko blokova je gotovo glasovanje i koliko traje, token kojim se glasuje te
//adresu timeLocka koji definira vrijeme između glasovanja i provedbe. Nakon toga se deploya treasury contract prilikom čega se šalju etheri koji će 
//se kasnije poslati payee-u koji se isto definira. Isto tako trasury prati sa bool da li su etheri poslani. Nakon deploya se poziva funkcija koja 
//definira tko će biti executor funkcije ako prijelog prođe, a taj executor je timeLock contract - on će jedini moći pozivati funkciju "releaseFunds"
//nad Treasury contractom. 


async function main() {

  const Token = await ethers.getContractFactory("Token")
  const TimeLock = await ethers.getContractFactory("TimeLock")
  const Governance = await ethers.getContractFactory("Governance")
  const Treasury = await ethers.getContractFactory("Treasury")

  const [contractDeployer, timeLockAdmin, executor, proposer, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners()
  const name = "CRO Token"
  const symbol = "CRO"
  const supply = ethers.utils.parseEther("1000");

  //TOKEN

  const tokenInstance = await Token.deploy(name, symbol, supply)

  let amount = ethers.utils.parseEther("50");
  tokenInstance.connect(contractDeployer).transfer(voter1.address, amount)
  tokenInstance.connect(contractDeployer).transfer(voter2.address, amount)
  tokenInstance.connect(contractDeployer).transfer(voter3.address, amount)
  tokenInstance.connect(contractDeployer).transfer(voter4.address, amount)
  tokenInstance.connect(contractDeployer).transfer(voter5.address, amount)

  // //TIMELOCK

  const minDelay = 1 //minimalno čekanje u blokovima prije izvršenja uspješno provedenog prijedloga
  const allowedToMakeProposal = [proposer.address]
  const allowedToExecuteProposal = [executor.address] //On kasnije poziva funkciju .propose!!!!! nad governanceInstance
  const timelockInstance = await TimeLock.deploy(minDelay, allowedToMakeProposal, allowedToExecuteProposal, timeLockAdmin.address)

  //GOVERNANCE
  let quorum = 5 //postotak ukupnog supplya TOKENA potrebnog da bi se prijedlog odobrio - 5%
  const votingDelay = 0 //nakon koliko blokova poslije izdavanja prijedloga je dozvoljeno glasanje
  const votingPeriod = 5 //koliko blokova glasači smiju glasati nakon što je krenulo glasovanje

  //token, timelock, % za odobrenje, dozvoljenoGlasanjeOd, dozvoljenoGlasanjeDo
  const governanceInstance = await Governance.deploy(tokenInstance.address, timelockInstance.address, quorum, votingDelay, votingPeriod)

  //TREASURY
  //TimeLock contract će biti owner Treasury contracta
  //Kada je prijedlog uspješan i izvršen TimeLock contract će zvati funkciju na njemu

  let funds = ethers.utils.parseEther("25");
  const treasuryInstance = await Treasury.deploy(executor.address, { value: funds }) //executor je primatelj uplace (payee)

  //funkcija na Ownable, sa executora jer je on address[0], pa deploya
  //onda samo timeLock contract može zvati releaseFunds funkciju
  await treasuryInstance.connect(contractDeployer).transferOwnership(timelockInstance.address) 

  const proposerRole = await timelockInstance.PROPOSER_ROLE()
  const executorRole = await timelockInstance.EXECUTOR_ROLE()

  await timelockInstance.connect(timeLockAdmin).grantRole(proposerRole, governanceInstance.address)
  await timelockInstance.connect(timeLockAdmin).grantRole(executorRole, governanceInstance.address)

  saveFrontendFiles(tokenInstance, "Token");
  saveFrontendFiles(timelockInstance, "TimeLock");
  saveFrontendFiles(governanceInstance, "Governance");
  saveFrontendFiles(treasuryInstance, "Treasury");

  function saveFrontendFiles(contract, name) {
    const fs = require("fs");
    const contractsDir = __dirname + "/../contractsData";
  
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir);
    }
  
    fs.writeFileSync(
      contractsDir + `/${name}-address.json`,
      JSON.stringify({ address: contract.address }, undefined, 2)
    );
  
    const contractArtifact = artifacts.readArtifactSync(name);
  
    fs.writeFileSync(
      contractsDir + `/${name}.json`,
      JSON.stringify(contractArtifact, null, 2)
    );
  }

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
