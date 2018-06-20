import {observable, decorate} from "mobx";
import * as Blockchain from "../blockchainHandler";

import {etherscanTx, methodSig} from '../helpers';

class TransactionsStore {
  registry = {};
  loading = {};
  cdpCreationTx = false;
  priceModal = { open: false, standardPrice: 0, title: null, func: null, params: null, settings: {}, callbacks: null };

  checkPendingTransactions = () => {
    Object.keys(this.registry).map(tx => {
      if (this.registry[tx].pending) {
        Blockchain.getTransactionReceipt(tx).then(r => {
          if (r !== null) {
            if (r.status === "0x1") {
              this.logTransactionConfirmed(tx);
            } else {
              this.logTransactionFailed(tx);
            }
          }
        })
      }
      return false;
    });
  }

  cleanCdpCreationProperty = tx => {
    const registry = {...this.registry};
    registry[tx].cdpCreationTx = false;
    this.registry = registry;
  }

  logRequestTransaction = (id, title, cdpCreationTx) => {
    this.cdpCreationTx = cdpCreationTx;
    const msgTemp = 'Waiting for transaction signature...';
    this.notificator.info(id, title, msgTemp, false);
  }

  closePriceModal = () => {
    this.lookForCleanCallBack(this.priceModal.callbacks);
    this.priceModal = { open: false, standardPrice: 0, title: null, func: null, params: null, settings: {}, callbacks: null };
  }

  setPriceAndSend = async (title, func, params, settings, callbacks) => {
    const standardPrice = (await Blockchain.getGasPrice()).div(10**9).toNumber();
    this.priceModal = { open: true, standardPrice, title, func, params, settings, callbacks };
  }

  sendTransaction = gasPriceGwei => {
    const id = Math.random();
    const {func, params, settings, title, callbacks} = {...this.priceModal};
    const cdpCreationTx = typeof params[1] === 'string' && methodSig('lockAndDraw(address,uint256)') === params[1].substring(0, 10);
    this.logRequestTransaction(id, title, cdpCreationTx);
    settings.gasPrice = gasPriceGwei * 10 ** 9;
    func(...params, settings, (e, tx) => this.log(e, tx, id, title, callbacks));
    this.priceModal = { open: false, standardPrice: 0, title: null, func: null, params: null, settings: {}, callbacks: null };
  }

  logPendingTransaction = (id, tx, title, callbacks = []) => {
    const msgTemp = 'Transaction TX was created. Waiting for confirmation...';
    const registry = {...this.registry};
    registry[tx] = {pending: true, title, callbacks, cdpCreationTx: this.cdpCreationTx};
    this.registry = registry;
    this.cdpCreationTx = false;
    console.log(msgTemp.replace('TX', tx));
    this.notificator.hideNotification(id);
    if (!this.registry[tx].cdpCreationTx) {
      this.notificator.info(tx, title, etherscanTx(this.network.network, msgTemp.replace('TX', `${tx.substring(0,10)}...`), tx), false);
    }
  }

  logTransactionConfirmed = tx => {
    const msgTemp = 'Transaction TX was confirmed.';
    if (this.registry[tx] && this.registry[tx].pending) {
      const registry = {...this.registry};
      registry[tx].pending = false;
      this.registry = registry;
      console.log(msgTemp.replace('TX', tx));
      this.notificator.hideNotification(tx);
      if (!this.registry[tx].cdpCreationTx) {
        this.notificator.success(tx, this.registry[tx].title, etherscanTx(this.network.network, msgTemp.replace('TX', `${tx.substring(0,10)}...`), tx), 6000);
      }
      if (typeof this.registry[tx].callbacks !== 'undefined' && this.registry[tx].callbacks.length > 0) {
        this.registry[tx].callbacks.forEach(callback => this.executeCallback(callback));
      }
    }
  }

  logTransactionFailed = tx => {
    const msgTemp = 'Transaction TX failed.';
    if (this.registry[tx]) {
      const registry = {...this.registry};
      registry[tx].pending = false;
      this.registry = registry;
      if (!this.registry[tx].cdpCreationTx) {
        this.notificator.error(tx, this.registry[tx].title, msgTemp.replace('TX', `${tx.substring(0,10)}...`), 5000);
      }
      this.lookForCleanCallBack(this.registry[tx].callbacks);
    }
  }

  logTransactionRejected = (id, title, callbacks = []) => {
    const msg = 'User denied transaction signature.';
    this.notificator.error(id, title, msg, 5000);
    this.lookForCleanCallBack(callbacks);
  }

  log = (e, tx, id, title, callbacks = []) => {
    if (!e) {
      this.logPendingTransaction(id, tx, title, callbacks);
    } else {
      this.logTransactionRejected(id, title, callbacks);
    }
  }

  addLoading = (method, param) => {
    const loading = {...this.loading};
    if (typeof loading[method] === 'undefined') loading[method] = {};
    loading[method][param] = true;
    this.loading = loading;
  }

  cleanLoading = (method, param) => {
    const loading = {...this.loading};
    loading[method][param] = false;
    this.loading = loading;
  }

  lookForCleanCallBack = callbacks => {
    callbacks.forEach(callback => {
      if (callback[0] === 'transactions/cleanLoading') {
        this.executeCallback(callback)
      }
      if (typeof callback[callback.length - 1] === 'object') {
        this.lookForCleanCallBack(callback[callback.length - 1]);
      }
    });
  }

  executeCallbacks = callbacks => {
    callbacks.forEach(callback => this.executeCallback(callback));
  }

  executeCallback = args => {
    let method = args.shift();
    // If the callback is to execute a getter function is better to wait as sometimes the new value is not uopdated instantly when the tx is confirmed
    const timeout = ['transactions/cleanLoading', 'system/setAllowance', 'system/checkAllowance', 'system/lockAndDraw', 'system/wipeAndFree', 'system/lock', 'system/draw', 'system/wipe', 'system/free', 'system/shut', 'system/give', 'system/migrateCDP'].indexOf(method) !== -1 ? 0 : 5000;
    setTimeout(() => {
      method = method.split('/');
      console.log('executeCallback', `${method[0]}.${method[1]}`, args);
      if (method[0] === 'transactions') {
        this[method[1]](...args);
      } else {
        this[method[0]][method[1]](...args);
      }
    }, timeout);
  }
}

decorate(TransactionsStore, {
  registry: observable,
  loading: observable,
  priceModal: observable
});

const store = new TransactionsStore();
export default store;
