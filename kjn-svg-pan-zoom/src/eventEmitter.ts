import Logger from "./logger";

export default class EventEmitter {
  handlers: {
    [eventType: string]: {
      [handlerId: string]: (data: unknown) => void;
    };
  };
  handlerId;

  constructor() {
    this.handlers = {};
    this.handlerId = 0;
  }

  on(eventType: string, handlerFunction: (data: unknown) => void) {
    const handlerId = this.handlerId++;

    if (!(eventType in this.handlers)) {
      this.handlers[eventType] = {};
    }
    this.handlers[eventType][handlerId] = handlerFunction;

    logger.info(`added handler(${handlerId}) for ${eventType}`);

    // Returns cleanup function
    return () => {
      logger.info(`removed handler(${handlerId}) for ${eventType}`);
      delete this.handlers[eventType][handlerId];
    };
  }

  $emit(eventType: string, data: unknown) {
    const handlers = Object.values(this.handlers[eventType] || {});

    for (const handler of handlers) {
      handler(data);
    }
  }
}

const logger = new Logger("event-emitter");
