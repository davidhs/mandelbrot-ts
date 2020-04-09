/*


declare function postMessage(message: any, transfer: Transferable[]): void;


*/


// (this: Window, ev: MessageEvent) => any


type OnMessageFunction = (this: DedicatedWorkerGlobalScope, ev: MessageEvent) => any;
type PostMessageFunction = (message: any, transfer: Transferable[]) => void;



export default class Cartographer {
  #postMessage: PostMessageFunction;

  constructor(onMessage: OnMessageFunction, postMessage: PostMessageFunction) {
    this.#postMessage = postMessage;

    onMessage = this.receiveMessage;
  }

  public receiveMessage(ev: MessageEvent) {}

  public sendMessage() {
    const message = {};
    const transfer = [];

    this.#postMessage(message, transfer);
  }
}
