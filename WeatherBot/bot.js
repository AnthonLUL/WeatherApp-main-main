const sqlite3 = require('sqlite3').verbose();
const { Client, IntentsBitField } = require('discord.js');
const { token } = require('./config.json');
const fs = require('fs');

const db = new sqlite3.Database('myDatabase.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

const client = new Client({ 
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ]
});

client.once('ready', () => {
    console.log('Bot is online!');
});

// Dynamically load event files from the 'Events' directory
const eventFiles = fs.readdirSync('./Events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(`./Events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, db));
    } else {
        client.on(event.name, (...args) => event.execute(...args, db));
    }
}

client.login(token);
