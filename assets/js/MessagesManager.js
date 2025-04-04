import { JsonStorage } from "./utils/JsonStorage.js";
import { NoteKeeper } from "./api.js";

export class MessagesManager {
  #messages = [];

  constructor() {
    this.#messages = [];
  }

  async init() {
    const storedMessages = await JsonStorage.get("messages");
    this.#messages = storedMessages || [];
  }

  async getAllMessages() {
    return this.#messages;
  }

  async addMessage(content) {
    const message = {
      id: crypto.randomUUID(),
      content,
      timestamp: new Date().toISOString(),
      isFromMe: true
    };

    this.#messages.push(message);
    await this.save();


    await NoteKeeper.sendMessage(content);

    return message;
  }

  async addReceivedMessage(message) {

    const existingMessage = this.#messages.find(m =>
      m.content === message.content &&
      Math.abs(new Date(m.timestamp) - new Date(message.timestamp)) < 5000
    );

    if (existingMessage) {
      return existingMessage;
    }

    const newMessage = {
      id: message.id || crypto.randomUUID(),
      content: message.content,
      timestamp: message.timestamp || new Date().toISOString(),
      isFromMe: false
    };

    this.#messages.push(newMessage);
    await this.save();

    return newMessage;
  }

  async save() {
    await JsonStorage.set("messages", this.#messages);
  }
} 