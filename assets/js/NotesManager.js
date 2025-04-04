import { JsonStorage } from "./utils/JsonStorage.js";

export class NotesManager {
  #notes = [];

  constructor() {
    this.#notes = [];
  }

  async init() {
    const storedNotes = await JsonStorage.get("notes");
    this.#notes = storedNotes || [];
  }

  async getAllNotes() {
    return this.#notes;
  }

  async getNote(id) {
    return this.#notes.find((note) => note.id === id);
  }

  async setNotes(notes) {
    this.#notes = notes;
    await this.save();
  }

  async addNote(content) {
    const note = {
      id: "",
      content,
      status: "pending-adding",
    };
    this.#notes.push(note);
    await this.save();
  }

  async deleteNote(id) {
    this.#notes = this.#notes.map((note) => {
      if (note.id === id) {
        note.status = "pending-deleting";
      }
      return note;
    });
    await this.save();
  }

  async updateNote(id, content) {
    this.#notes = this.#notes.map((note) => {
      if (note.id === id) {
        return {
          ...note,
          content,
          status: "pending-updating"
        };
      }
      return note;
    });

    await this.save();
  }

  async purge() {
    this.#notes = [];
    await this.save();
  }

  async save() {
    await JsonStorage.set("notes", this.#notes);
  }
}
