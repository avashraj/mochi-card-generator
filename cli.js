const { addDeck, addCard, getDecks } = require("./index");

async function main() {
  const { select, input } = await import("@inquirer/prompts");

  const action = await select({
    message: "What would you like to do?",
    choices: [
      { name: "Add Deck", value: "deck" },
      { name: "Add Card", value: "card" },
    ],
  });

  if (action === "deck") {
    const name = await input({ message: "Deck name:" });
    const deck = await addDeck(name);
    console.log(`\nDeck "${deck.name}" created (id: ${deck.id})`);
  } else {
    const front = await input({
      message: "Front:",
      validate: (v) => v.trim().length > 0 || "Front cannot be empty",
    });

    const back = await input({ message: "Back (Enter to skip):" });

    const decks = await getDecks();
    if (decks.length === 0) {
      console.error("\nNo decks found. Create a deck first.");
      process.exit(1);
    }

    const deckId = await select({
      message: "Select a deck:",
      choices: decks.map((d) => ({ name: d.name, value: d.id })),
    });

    const deckName = decks.find((d) => d.id === deckId)?.name;
    const card = await addCard({
      front: front.trim(),
      back: back.trim(),
      deckId,
    });
    console.log(`\nCard "${card.front}" added to "${deckName}"`);
  }
}

main().catch((err) => {
  if (err.name === "ExitPromptError") return; // user hit Ctrl+C
  console.error(err.message);
  process.exit(1);
});
