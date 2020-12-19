export class Router<K, V> {
    private callbacks: Map<K, V> = new Map<K, V>();
    protected handler: Function;
    protected routingHandler: Function = this.defaultRoutingHandler;
  
    constructor (routeHandler: Function, routingHandler?: Function) {
      this.handler = routeHandler;
      if (routingHandler) {
        this.routingHandler = routingHandler;
      }
    }
  
    public add(key: K, value: V) {
      this.callbacks.set(key, value);
    }
    public delete(key: K) {
      return this.callbacks.delete(key);
    }
    public route(key: any, message: any) {
      let target = this.routingHandler(key);
      this.handler(target, message);
    }
    public getKeys() {
      return this.callbacks.keys()
    }
    public getValue(key: K) {
      return this.callbacks.get(key);
    }
  
    protected defaultRoutingHandler(key: K) {
      return this.getValue(key);
    }
  }

export class CommandRouter<T> extends Router<RegExp, Function> {
    constructor () {
        super(
            (handler: Function, data:T) => { 
                if (handler) handler(data); 
            }, (key: string) => {
                let regexs = this.getKeys();
                for(let regex of regexs) {
                    if (regex.test(key)) {
                        return this.getValue(regex);
                    }
                }
                return null;
            }
        );
    }
}