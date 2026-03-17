require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const { addCard, getDecks, addDeck } = require('../index.js');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    titleBarStyle: 'hidden',
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('gemini:generate', async (_, text) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
  const prompt =
    `You are a networks professor. Using the following information provided, create flashcards to help students study for a computer networks course. Return ONLY a valid JSON array with no markdown formatting or code blocks. Each item must have "front" (the question or term) and "back" (the answer or definition). Create as many flashcards as needed to thoroughly cover the key concepts.\n\nInformation:\n${text}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const raw = response.text;
  const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  return JSON.parse(cleaned);
});

ipcMain.handle('cards:save', async (_, cards) => {
  const decks = await getDecks();
  let deck = decks.find((d) => d.name === 'Networks');
  if (!deck) {
    deck = await addDeck('Networks');
  }
  for (const card of cards) {
    await addCard({ front: card.front, back: card.back, deckId: deck.id });
  }
  return { saved: cards.length };
});
