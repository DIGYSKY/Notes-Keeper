import { NoteKeeper } from "./api.js";

export class NotesSynchronizer {
  #notesManager;
  #eventSync = null;

  constructor(notesManager) {
    this.#notesManager = notesManager;
  }

  async sync() {
    if (!navigator.onLine) {
      if (!this.#eventSync) {
        this.#eventSync = window.addEventListener("online", async () => {
          await this.sync();
          window.removeEventListener("online", this.#eventSync);
          this.#eventSync = null;
        });
      }
      return false;
    }

    let notesFromServer;
    try {
      const notes = await this.#notesManager.getAllNotes();
      notesFromServer = await NoteKeeper.getAllNotes();

      if (!notesFromServer) {
        console.warn("Impossible de récupérer les notes du serveur");
        return false;
      }

      const notesToAdd = notes.filter(
        (note) => note.status && note.status === "pending-adding"
      );
      const notesToUpdate = notes.filter(
        (note) => note.status && note.status === "pending-updating"
      );
      const notesToDelete = notes.filter(
        (note) => note.status && note.status === "pending-deleting"
      );

      await Promise.all(
        notesToAdd.map(async (note) => {
          await NoteKeeper.createNote(note.content)
          notes[notes.indexOf(note)].status = "synced"
        })
      );
      await Promise.all(
        notesToUpdate.map(async (note) => {
          await NoteKeeper.updateNote(note)
          notes[notes.indexOf(note)].status = "synced"
        })
      );
      await Promise.all(
        notesToDelete.map(async (note) => {
          await NoteKeeper.deleteNote(note.id)
          notes.splice(notes.indexOf(note), 1)
        })
      );

      await this.#notesManager.setNotes(notes);

      notesFromServer = await NoteKeeper.getAllNotes();
    } catch (error) {
      console.error(error);
      return false;
    }

    await this.#notesManager.setNotes(notesFromServer);

    return true;
  }
}
