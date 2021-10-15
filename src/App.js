// base imports
import React from 'react';
import './App.css';

// import packages
import Web3 from 'web3';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import bigInt from "big-integer";
import firebase from './firebase.js';
// eslint-disable-next-line
import database from 'firebase/database';

// import contract abis
import NFTreeABI from './artifacts/contracts/NFTree.sol/NFTree.json';
import NFTreeFactoryABI from './artifacts/contracts/NFTreeFactory.sol/NFTreeFactory.json';
import DAIABI from './artifacts/contracts/DAI.sol/DAI.json';
import USDCABI from './artifacts/contracts/USDC.sol/USDC.json';
import USDTABI from './artifacts/contracts/USDT.sol/USDT.json';

// import components
import Navbar from './components/Navbar';
import Plant from './components/Plant';
import Dashboard from './components/Dashboard';

class App extends React.Component {

  constructor(props) {
    super(props);
    // Don't call this.setState() here!
    this.state = {
        Currentaccount: undefined,
        Currentnetwork: undefined,
        isConnected: false,
        NFTreeContract: undefined,
        NFTreeFactoryContract: undefined,
        DAIContract: undefined,
        USDCContract: undefined,
        USDTContract: undefined,
        isLoading: true
    };

    this.contractAddresses = {
      'NFTree' : '0xa44929195B0c3AF215c6efbe5c295cc6b99F7C44',
      'NFTreeFactory' : '0xC8483f868e41E996761a701aCeA884e963cF88Fe',
      'DAI' : '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      'USDC' : '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      'USDT' : '0xdac17f958d2ee523a2206206994597c13d831ec7'
    }
    // initialize web3 and load blockchain data

    this.setState = this.setState.bind(this);
  }

  componentDidMount = async () =>  {
    await this.loadWeb3();
 
    this.setState({
      isLoading: false
    });

    // add metamask event listeners

    window.ethereum.on('accountsChanged', (accounts) => {
      window.location.reload();
    });
    
    window.ethereum.on('chainChanged', async (chainId) => {
      window.location.reload();
    });

  }


  /* ethereum initialization functions */

  // detect ethereum browser 
  loadWeb3 = async () => {
    if(window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await this.loadBlockchainData();
    } else {
      window.alert(
        'no ethereum wallet detected.'
      );
    }
  }

  checkConnection = async () => {
    // fetch user eth account
    const accounts = await window.web3.eth.getAccounts();
    const account = accounts[0];
    // set current account to account[0] if unlocked
    if (account){
      this.setState({
        isConnected: true,
        Currentaccount: account,
      });
    }

    // get networkId, display error if networkId != 1 (ethereum mainnet)
    // 1337 local host
    const networkId = await window.web3.eth.net.getId()
    if(networkId !== 1){
      this.setState({
        isConnected: false,
        Currentnetwork: networkId,
      });
    } else {
      this.setState({
        Currentnetwork: networkId,
      });  
    }
  }

  connectWallet = async () => {
    if(window.web3) {
      await window.ethereum.enable();
    } else {
      window.alert(
        'no ethereum wallet detected.'
      );
    }
    await this.loadBlockchainData();
  }

  // load ethereum accounts, network, and smart contracts 
  loadBlockchainData = async () => {    
    // check
    await this.checkConnection();

    if(window.ethereum){
      this.setState({
        NFTreeContract: await new window.web3.eth.Contract(NFTreeABI.abi, this.contractAddresses['NFTree']),
        NFTreeFactoryContract: await new window.web3.eth.Contract(NFTreeFactoryABI.abi, this.contractAddresses['NFTreeFactory']),
        DAIContract: await new window.web3.eth.Contract(DAIABI.abi, this.contractAddresses['DAI']),
        USDCContract: await new window.web3.eth.Contract(USDCABI.abi, this.contractAddresses['USDC']),
        USDTContract: await new window.web3.eth.Contract(USDTABI.abi, this.contractAddresses['USDT']),
      });
    }
  }

  getAllowance = async (coin) => { 
    if(this.state.isConnected){  
      let allowance;
      if(coin === 'DAI') {
        allowance = await this.state.DAIContract.methods.allowance(this.state.Currentaccount, this.contractAddresses['NFTreeFactory']).call();
      }
      else if (coin === 'USDC') {
        allowance = await this.state.USDCContract.methods.allowance(this.state.Currentaccount, this.contractAddresses['NFTreeFactory']).call();
      }
      else if (coin === 'USDT') {
        allowance = await this.state.USDTContract.methods.allowance(this.state.Currentaccount, this.contractAddresses['NFTreeFactory']).call();
      } 
      return allowance;
    }
    else{
      return 0;
    }
  }

  approve = async (totalCost, coin) => {
    let amount = String(bigInt(totalCost * (10**18)));
    if(this.state.isConnected){
      if(coin === 'DAI') {
        await this.state.DAIContract.methods.approve(this.contractAddresses['NFTreeFactory'], amount).send({from: this.state.Currentaccount});
      }
      else if (coin === 'USDC') {
        await this.state.USDCContract.methods.approve(this.contractAddresses['NFTreeFactory'], amount).send({from: this.state.Currentaccount});
      }
      else if (coin === 'USDT') {
        await this.state.USDTContract.methods.approve(this.contractAddresses['NFTreeFactory'], amount).send({from: this.state.Currentaccount});
      }
    }
    else {
      //alert('connect metamask wallet');
    }
  }

  mintNFTree = async (numCredits, totalCost, coin) => {   
    //let amount = String(bigInt(totalCost * (10**18))); 
    if(this.state.isConnected){
      console.log(numCredits, totalCost, coin, this.state.Currentaccount)
      await this.state.NFTreeFactoryContract.methods.mintNFTree(numCredits, totalCost, coin).send({from: this.state.Currentaccount});
    }
    else {
      //alert('connect metamask wallet');
    }
  }

  insertDB = (transactionHash, numCredits, totalCost, coin) => {
      var today = new Date();
      var dd = String(today.getDate()).padStart(2, '0');
      var mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0
      var yyyy = today.getFullYear();
      today = mm + '/' + dd + '/' + yyyy;

      var database = firebase.database().ref('transactions/' + transactionHash);
      database.set({
          date: today,
          wallet: this.state.Currentaccount,
          amount: totalCost,
          coin: coin,
          carbon_credits: numCredits,
      });
  }

  calculateImpact = async () => {  
    console.log('calculate impact');  
    if(this.state.isConnected){
      let totalOffset = 0;
      let tokens = await this.state.NFTreeContract.methods.tokensOfOwner(this.state.Currentaccount).call();
      if (tokens.length !== 0){
        for (var i = 0; i < tokens.length; i ++) {
          let uri = await this.state.NFTreeContract.methods.tokenURI(tokens[i]).call();
          let obj = await (await fetch(uri)).json();
          let offset = parseInt(obj['attributes'][1].value, 10);
          totalOffset += offset;
        }
      }
    
      let impact = {
        nftrees: tokens.length,
        offset: totalOffset,
      }

      console.log(impact);

      return(impact);
    }
    else {
      //alert('connect metamask wallet');
    }
  }

  hasBalance = async (coin, totalCost) => {
    let balance = 0;
    if(this.state.isConnected){
      if(coin === 'DAI') {
        balance = await this.state.DAIContract.methods.balanceOf(this.state.Currentaccount).call();
      }
      else if (coin === 'USDC') {
        balance = await this.state.USDCContract.methods.balanceOf(this.state.Currentaccount).call();
      }
      else if (coin === 'USDT') {
        balance = await this.state.USDTContract.methods.balanceOf(this.state.Currentaccount).call();
      }

      return balance >= totalCost * (10**18);
    }
    else {
      //alert('connect metamask wallet');
      return(false);
    }
  }
  
  render () {
    if(this.state.isLoading){
      return(
        <div className="App">
          loading
        </div>
      )
    }
    else {
      return (
        <div className="App">
          <Router>
            <Switch>
              <Route exact path = '/'>
                <div className = 'background'>
                <Navbar account = {this.state.Currentaccount} connectWallet = {this.connectWallet} isConnected = {this.state.isConnected} Currentnetwork = {this.state.Currentnetwork}/>
                <Plant getAllowance = {this.getAllowance} approve = {this.approve} mintNFTree = {this.mintNFTree} insertDB = {this.insertDB} isConnected = {this.state.isConnected} 
                  NFTreeContract = {this.state.NFTreeContract} DAIContract = {this.state.DAIContract} USDCContract = {this.state.USDCContract} USDTContract = {this.state.USDTContract}
                  hasBalance = {this.hasBalance}/>
                </div>
              </Route>
    
              <Route exact path = '/dashboard'>
                <div className = 'background'>
                  <Navbar account = {this.state.Currentaccount} connectWallet = {this.connectWallet} isConnected = {this.state.isConnected} Currentnetwork = {this.state.Currentnetwork}/>
                  <Dashboard account = {this.state.Currentaccount} isConnected = {this.state.isConnected} calculateImpact = {this.calculateImpact}/>
                </div>
              </Route>
            </Switch>
          </Router>
        </div>
      );
    }
  }
}

export default App;
