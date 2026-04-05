const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(3000, () => {
    console.log('Web server running');
});

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    SlashCommandBuilder, 
    REST, 
    Routes 
} = require('discord.js');

const util = require('minecraft-server-util');

// ===== CONFIG =====
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

const HOST = 'debt-astrology.gl.joinmc.link';
const PORT = 25565;
// ==================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

let statusMessageId = null;

// ===== Slash command =====
const commands = [
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check Minecraft server status')
        .toJSON()
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );
})();

// ===== Check server =====
async function checkServer() {
    try {
        const res = await util.status(HOST, PORT, { timeout: 5000 });
        return {
            online: true,
            players: res.players.online,
            max: res.players.max
        };
    } catch {
        return { online: false };
    }
}

// ===== Embed =====
function createEmbed(status) {
    if (status.online) {
        return new EmbedBuilder()
            .setTitle('🟢 Server ONLINE')
            .setColor(0x00ff00)
            .setDescription(`Players: ${status.players}/${status.max}`);
    } else {
        return new EmbedBuilder()
            .setTitle('🔴 Server OFFLINE')
            .setColor(0xff0000)
            .setDescription('Server is currently down');
    }
}

// ===== Ready =====
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const channel = await client.channels.fetch(CHANNEL_ID);

    const msg = await channel.send({
        embeds: [new EmbedBuilder().setTitle('Starting...')]
    });

    statusMessageId = msg.id;

    setInterval(async () => {
        const status = await checkServer();
        const embed = createEmbed(status);

        const message = await channel.messages.fetch(statusMessageId);
        message.edit({ embeds: [embed] });

    }, 30000);
});

// ===== Slash command =====
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'status') {
        const status = await checkServer();
        const embed = createEmbed(status);

        await interaction.reply({ embeds: [embed] });
    }
});

client.login(TOKEN);