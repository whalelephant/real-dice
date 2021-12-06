import { Injectable } from '@angular/core';
import {BehaviorSubject, from, Observable, of} from "rxjs";
import { SigningCosmWasmClient } from "secretjs";
import { OfflineSigner } from 'secretjs/types/wallet';
import { environment } from 'src/environments/environment';

import { BlockchainAccount } from '../models';

// TODO: move to another folder with app configuration
const SecretNetworkConfig = {
  chainId: environment.chainId,
  chainName: 'Secret Testnet',
  rpc: environment.rpc,
  rest: environment.rest,
  bip44: {
    coinType: 529,
  },
  coinType: 529,
  stakeCurrency: {
    coinDenom: 'SCRT',
    coinMinimalDenom: 'uscrt',
    coinDecimals: 6,
  },
  bech32Config: {
    bech32PrefixAccAddr: 'secret',
    bech32PrefixAccPub: 'secretpub',
    bech32PrefixValAddr: 'secretvaloper',
    bech32PrefixValPub: 'secretvaloperpub',
    bech32PrefixConsAddr: 'secretvalcons',
    bech32PrefixConsPub: 'secretvalconspub',
  },
  currencies: [
    {
      coinDenom: 'SCRT',
      coinMinimalDenom: 'uscrt',
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'SCRT',
      coinMinimalDenom: 'uscrt',
      coinDecimals: 6,
    },
  ],
  gasPriceStep: {
    low: 0.1,
    average: 0.25,
    high: 0.4,
  },
  features: ['secretwasm'],
}

@Injectable({
  providedIn: 'root'
})
export class BlockchainService {
  private _consmJsClient!: SigningCosmWasmClient;
  private _account = new BehaviorSubject<BlockchainAccount>({
    address: "",
    balance: '0',
  });

  isConnected$ = new BehaviorSubject(false);
  public readonly account$: Observable<BlockchainAccount> = this._account.asObservable();

  async connectToWallet() {
    const currentWindow = window as any;
    if (!currentWindow.getOfflineSigner || !currentWindow.keplr) {
      alert("Please install keplr extension");
      return;
    }

    await currentWindow.keplr.experimentalSuggestChain(SecretNetworkConfig);
    await currentWindow.keplr.enable(SecretNetworkConfig.chainId);

    const keplrOfflineSigner = currentWindow.getOfflineSigner(SecretNetworkConfig.chainId) as OfflineSigner;
    const accounts = await keplrOfflineSigner.getAccounts();
    const address = accounts[0].address;

    this._consmJsClient = new SigningCosmWasmClient(
      SecretNetworkConfig.rest,
      address,
      keplrOfflineSigner,
      currentWindow.getEnigmaUtils(SecretNetworkConfig.chainId),
      {
        init: {
          amount: [{ amount: '300000', denom: 'uscrt' }],
          gas: '300000',
        },
        exec: {
          amount: [{ amount: '300000', denom: 'uscrt' }],
          gas: '300000',
        },
      },
    );

    const account = await this._consmJsClient.getAccount(address);
    if (account != null) {
      this._account.next({
        address: account.address,
        balance: account.balance.find(b => b.denom === 'uscrt')?.amount,
      });
      this.isConnected$.next(true);
    }
  }

  async getNftTokens() {
    const nftTokens = await this._consmJsClient.queryContractSmart(environment.nftContractAddress, {
      "tokens": {
        "owner": this._account.getValue().address,
      }
    });
    return nftTokens;
  }

  async joinDao(nftId: string = '') {
    const joinDaoResult = await this._consmJsClient.execute(environment.daoContractAddress, {
      "join_dao": {
        "nft_id": nftId,
      }
    });
    return joinDaoResult;
  }

  async createNewGameRoom(nftId: string = '') {
    const createNewGameResult = await this._consmJsClient.execute(environment.daoContractAddress, {
      "create_new_game_room": {
        "nft_id": nftId,
        "base_bet": {
          amount: "50",
          denom: "uscrt",
        },
        "secret": 1,
      }
    }, undefined, [{
      amount: "500",
      denom: "uscrt",
    }]);
    return createNewGameResult;
  }

  async joinGame(gameId: number, nftId: string = '') {
    const joinGameResult = await this._consmJsClient.execute(environment.daoContractAddress, {
      "join_game": {
        "nft_id": nftId,
        "game_id": gameId,
        "secret": 1,
      }
    }, undefined, [{
      amount: "500",
      denom: "uscrt",
    }]);
    return joinGameResult;
  }

  getStreamGamesByStatus(status: "pending" | "started" | "re_roll"): Observable<any[]> {
    return from(this._consmJsClient.queryContractSmart(environment.daoContractAddress, {
      "games_by_status": {
        "status": status
      },
    }));
  }

  async getGamesByStatus(status: "pending" | "started" | "re_roll") {
    const gamesResult = await this._consmJsClient.queryContractSmart(environment.daoContractAddress, {
      "games_by_status": {
        "status": status
      },
    });
    return (gamesResult as any[]).map(([gameId, value]) => ({
      game_id: gameId,
      ...value,
    }));
  }

  async getGameById(gameid: number) {
    const gameResult = await this._consmJsClient.queryContractSmart(environment.daoContractAddress, {
      "game": {
        "game_id": gameid,
      },
    });
    return gameResult;
  }
}
