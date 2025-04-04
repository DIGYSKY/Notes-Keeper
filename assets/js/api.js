/**
 * @typedef {Object} Note
 * @property {number} id The note ID.
 * @property {string} content The note content.
 */

/**
 * @typedef {Object} MessageData
 * @property {string} identifier The client identifier.
 * @property {string} content The message content.
 * @property {string} timestamp The message date.
 */

/**
 * NoteKeeper class provides methods to interact with a note-keeping API.
 *
 * @class
 * @classdesc This class includes methods to fetch, create, delete, and update notes.
 *
 * @property {string} BASE_URL - The base URL of the API.
 * @property {string} SOCKET_URL - The base URL of the WebSocket server.
 *
 * @method static getAllNotes
 * @description Fetches all notes from the API.
 * @returns {Promise<Note[]>} A promise that resolves to an array of note objects.
 * @throws {Error} If the fetch operation fails or the response is not valid JSON.
 *
 * @method static createNote
 * @description Creates a new note.
 * @param {string} content - The note content.
 * @returns {Promise<Note>} A promise that resolves to the created note object.
 *
 * @method static deleteNote
 * @description Deletes given note.
 * @param {number} id - The ID of the note to delete.
 * @returns {Promise<boolean>} A promise that resolves when the notes have been deleted.
 *
 * @method static updateNote
 * @description Updates given notes.
 * @param {Note} note - The note to update.
 * @returns {Promise<boolean>} A promise that resolves when the note have been updated.
 */
class NoteKeeper {
  /**
   * @constant {string} BASE_URL - The base URL for the API endpoints.
   */
  static BASE_URL = "https://notekeeper.memento-dev.fr/api";

  /**
   * @constant {string} SOCKET_URL - The base URL for the WebSocket server.
   */
  static SOCKET_URL = "wss://notekeeper.memento-dev.fr/ws";

  /**
   * @private
   * @type {boolean} - Indicates whether the class has been initialized.
   */
  static #isInitialized = false;

  /**
   * @private
   * @type {string} - The VAPID key for the current client.
   */
  static #vapidKey = null;

  /**
   * @private
   * @type {string} - The identifier for the current client.
   */
  static #identifier = null;

  /**
   * @private
   * @type {WebSocket} - The WebSocket instance
   */
  static #ws = null;

  /**
   * @private
   * @type {(messageData: MessageData) => {}} - The callback function for message events.
   */
  static #onMessageCallback = null;

  /**
   * Retrieves the VAPID key.
   *
   * @returns {string} The VAPID key.
   */
  static get vapidKey() {
    return NoteKeeper.#vapidKey;
  }

  /**
   * Fetches data from the API.
   *
   * @param {string} endpoint - The API endpoint to fetch.
   * @param {RequestInit} options - The options for the fetch request.
   * @returns {Promise<Response>} A promise that resolves to the response object.
   */
  static fetchApi(endpoint, options = {}) {
    const url = `${NoteKeeper.BASE_URL}/${endpoint}`
      .replace(/https?:\/\/.*(\/\/)/g, "/")
      .replace(/\/$/, "");

    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  }

  /**
   * Connects to the notification server using the provided subscription object.
   *
   * @param {string} subscription - The subscription object for the notification server.
   */
  static connectToNotificationServer(subscription) {
    NoteKeeper.socketEmit("connect-notification", subscription);
  }

  /**
   * Initializes the WebSocket instance.
   *
   * @private
   * @returns {void}
   */
  static #initWebSocket() {
    NoteKeeper.#ws = new WebSocket(NoteKeeper.SOCKET_URL);

    NoteKeeper.#ws.onopen = function () {
      console.log("Connected to the Websocket server");
    };

    NoteKeeper.#ws.onmessage = function (event) {
      const stream = JSON.parse(event.data);

      if (stream.event === "vapid") {
        NoteKeeper.#vapidKey = stream.data;
        return;
      }

      if (stream.event === "message") {
        if (NoteKeeper.#onMessageCallback) {
          NoteKeeper.#onMessageCallback(stream.data);
        }

        return;
      }
    };

    NoteKeeper.#ws.onclose = function () {
      console.log("Disconnected from the server");

      setTimeout(() => {
        console.log("Trying to reconnect...");
        NoteKeeper.#initWebSocket();
      }, 1000);
    };
  }

  /**
   * Listens for messages from the server and calls the callback function.
   *
   * @param {(messageData: MessageData) => {}} callback
   */
  static async onMessage(callback) {
    NoteKeeper.#onMessageCallback = callback;
  }

  /**
   * Fetches the client identifier from the API.
   *
   * @returns {Promise<string>} A promise that resolves to the client identifier.
   */
  static async getIdentifier() {
    if (NoteKeeper.#identifier) return NoteKeeper.#identifier;
    const response = await NoteKeeper.fetchApi("auth/login");
    const { identifier } = await response.json();

    return identifier;
  }

  /**
   * Initializes the class.
   *
   * @returns {void}
   */
  static async init() {
    if (NoteKeeper.#isInitialized) return;

    NoteKeeper.#identifier = await NoteKeeper.getIdentifier();
    NoteKeeper.#isInitialized = true;
    NoteKeeper.#initWebSocket();
  }

  /**
   * Sends a message to the server, using the WebSocket connection.
   *
   * @param {"message" | "other"} event
   * @param {any} data
   */
  static socketEmit(event, data) {
    NoteKeeper.#ws.send(JSON.stringify({ event, from: "client", data }));
  }

  /**
   * Sends a message to the server.
   *
   * @param {string} message
   */
  static async sendMessage(message) {
    NoteKeeper.socketEmit("message", message);
  }

  /**
   * Logs the user out of the server.
   */
  static async logout() {
    await NoteKeeper.fetchApi("logout");
  }

  /**
   * Fetches all notes from the API.
   *
   * @returns {Promise<Note[]>} A promise that resolves to an array of note objects.
   * @throws {Error} If the fetch operation fails or the response is not valid JSON.
   */
  static async getAllNotes() {
    const response = await NoteKeeper.fetchApi("notes");
    const data = await response.json();
    return data.notes;
  }

  /**
   * Creates a new note.
   *
   * @param {string} content The note content.
   * @returns {Promise<Note>} A promise that resolves to the created note object.
   */
  static async createNote(content) {
    const response = await NoteKeeper.fetchApi("notes", {
      method: "POST",
      body: JSON.stringify({ content }),
    });

    const data = await response.json();

    return data.note;
  }

  /**
   * Deletes given note.
   *
   * @param {number} id The ID of the note to delete.
   * @returns {Promise<boolean>} A promise that resolves when the notes have been deleted.
   */
  static async deleteNote(id) {
    const response = await NoteKeeper.fetchApi(`notes/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });

    return response.ok;
  }

  /**
   * Updates given notes.
   *
   * @param {Note} note The note to update.
   * @returns {Promise<boolean>} A promise that resolves when the note have been updated.
   */
  static async updateNote(note) {
    const response = await NoteKeeper.fetchApi(`notes/${note.id}`, {
      method: "PUT",
      body: JSON.stringify({ content: note.content }),
    });

    return response.ok;
  }

  /**
   * Checks if the message is from the sender.
   *
   * @param {MessageData} message - The message data.
   * @returns {Promise<boolean>} True if the message is from the sender, false otherwise.
   */
  static async isFromSender(message) {
    await NoteKeeper.getIdentifier();
    return message.identifier === NoteKeeper.#identifier;
  }

  /**
   * Fetches all messages from the API.
   *
   * @returns {Promise<MessageData[]>} A promise that resolves to an array of message objects.
   */
  static async getMessages() {
    const response = await NoteKeeper.fetchApi("messages");
    const data = await response.json();
    return data.messages;
  }
}

export { NoteKeeper };
