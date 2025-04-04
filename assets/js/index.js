import { NotesManager } from "./NotesManager.js";
import { NotesSynchronizer } from "./NotesSynchronizer.js";
import { NoteKeeper } from "./api.js";
import { JsonStorage } from "./utils/JsonStorage.js";
import { MessagesManager } from "./MessagesManager.js";
import { NotificationManager } from "./NotificationManager.js";

let noteForm = document.querySelector("#note-form");
let noteInput = document.querySelector("textarea[name='content']");
const notesContainer = document.querySelector("#notes");
const communicationContainer = document.querySelector("#communication");


const notesManager = new NotesManager();
const notesSynchronizer = new NotesSynchronizer(notesManager);
const messagesManager = new MessagesManager();


let isInitialized = false;
const initializeApp = async () => {
  try {
    if (!isInitialized) {
      await NoteKeeper.init();
      await notesManager.init();
      await messagesManager.init();


      await NotificationManager.requestPermission();


      await NotificationManager.registerServiceWorker();


      NoteKeeper.onMessage(async (message) => {
        await messagesManager.addReceivedMessage(message);

        const messagesList = document.querySelector(".messages-list");
        const shouldScrollToBottom = messagesList ?
          (messagesList.scrollHeight - messagesList.scrollTop <= messagesList.clientHeight + 50) :
          true;

        renderMessages();

        if (shouldScrollToBottom) {
          const newMessagesList = document.querySelector(".messages-list");
          if (newMessagesList) {
            newMessagesList.scrollTop = newMessagesList.scrollHeight;
          }
        }

        if (document.hidden && !message.isFromSender) {
          await NotificationManager.showNotification(
            "NoteKeeper - Nouveau message",
            { body: message.content }
          );
        }
      });

      isInitialized = true;
    }


    const notes = await notesManager.getAllNotes();
    if (!notes || notes.length === 0) {
      notesContainer.innerHTML = "<p>Aucune note disponible</p>";
    } else {
      notesContainer.innerHTML = generateHtmlNotes(notes);
    }
    setupEventListeners();


    const syncResult = await notesSynchronizer.sync();
    if (syncResult) {
      const updatedNotes = await notesManager.getAllNotes();
      if (updatedNotes && updatedNotes.length > 0) {
        notesContainer.innerHTML = generateHtmlNotes(updatedNotes);
      }
    }
    setupEventListeners();


    renderMessages();
  } catch (error) {
    console.error("Erreur lors de l'initialisation:", error);

    notesContainer.innerHTML = `<div class="error">Erreur de connexion au serveur. Veuillez réessayer plus tard.</div>`;
  }
};

document.addEventListener("DOMContentLoaded", initializeApp);

const generateHtmlNotes = notes => {
  if (!notes || !Array.isArray(notes)) {
    return "<p>Aucune note disponible</p>";
  }

  return notes.map(note => {
    if (note.status === "pending-deleting") {
      return "";
    }
    return `
      <li data-id="${note.id}">
        <input type="text" value="${note.content}" />
        <button class="save-note" data-id="${note.id}">Enregistrer</button>
        <button class="delete-note" data-id="${note.id}">Supprimer</button>
      </li>
    `;
  }).join("");
};

const deleteNote = async id => {
  await notesManager.deleteNote(id);
  const notes = await notesManager.getAllNotes();
  if (notes) {
    notesContainer.innerHTML = generateHtmlNotes(notes);
  }
  setupEventListeners();


  await notesSynchronizer.sync();
};

const saveNote = async (id, content) => {
  await notesManager.updateNote(id, content);
  const notes = await notesManager.getAllNotes();
  if (notes) {
    notesContainer.innerHTML = generateHtmlNotes(notes);
  }
  setupEventListeners();


  await notesSynchronizer.sync();
};

const addNote = async () => {
  const content = noteInput.value;
  await notesManager.addNote(content);
  const notes = await notesManager.getAllNotes();
  if (notes) {
    notesContainer.innerHTML = generateHtmlNotes(notes);
  }

  noteInput.value = "";
  setupEventListeners();


  await notesSynchronizer.sync();
};

const setupEventListeners = () => {

  const newNoteForm = noteForm.cloneNode(true);
  noteForm.parentNode.replaceChild(newNoteForm, noteForm);
  noteForm = newNoteForm;


  noteInput = document.querySelector("textarea[name='content']");


  noteForm.addEventListener("submit", async e => {
    e.preventDefault();
    await addNote();
  });


  document.querySelectorAll(".save-note").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const content = button.parentElement.querySelector("input").value;
      await saveNote(id, content);
    });
  });


  document.querySelectorAll(".delete-note").forEach(button => {
    button.addEventListener("click", async () => {
      await deleteNote(button.dataset.id);
    });
  });
};


const renderMessages = async () => {
  const messages = await messagesManager.getAllMessages();
  const messagesList = document.querySelector(".messages-list");
  const wasAtBottom = messagesList ?
    (messagesList.scrollHeight - messagesList.scrollTop <= messagesList.clientHeight + 50) :
    true;

  const messageInput = document.querySelector("#message-input");
  const savedMessageContent = messageInput ? messageInput.value : "";
  const wasFocused = messageInput && document.activeElement === messageInput;

  if (!messages || messages.length === 0) {
    communicationContainer.innerHTML = `
      <div class="messages-container">
        <h2>Messages</h2>
        <p>Aucun message disponible</p>
        <div class="message-form">
          <textarea id="message-input" placeholder="Votre message...">${savedMessageContent}</textarea>
          <button id="send-message">Envoyer</button>
        </div>
      </div>
    `;
  } else {
    const messagesHtml = messages.map(message => `
      <div class="message ${message.isFromMe ? 'sent' : 'received'}">
        <div class="message-content">${message.content}</div>
        <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
      </div>
    `).join('');

    communicationContainer.innerHTML = `
      <div class="messages-container">
        <h2>Messages</h2>
        <div class="messages-list">
          ${messagesHtml}
        </div>
        <div class="message-form">
          <textarea id="message-input" placeholder="Votre message...">${savedMessageContent}</textarea>
          <button id="send-message">Envoyer</button>
        </div>
      </div>
    `;

    const newMessagesList = document.querySelector(".messages-list");
    if (newMessagesList && wasAtBottom) {
      newMessagesList.scrollTop = newMessagesList.scrollHeight;
    }
  }

  if (wasFocused) {
    const newMessageInput = document.querySelector("#message-input");
    if (newMessageInput) {
      newMessageInput.focus();
      const length = newMessageInput.value.length;
      newMessageInput.setSelectionRange(length, length);
    }
  }

  const sendButton = document.querySelector("#send-message");
  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  }
};

const sendMessage = async () => {
  const messageInput = document.querySelector("#message-input");
  const content = messageInput.value.trim();

  if (content) {
    await messagesManager.addMessage(content);
    messageInput.value = "";
  }
};





