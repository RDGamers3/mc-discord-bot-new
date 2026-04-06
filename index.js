const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

// Use Render port
app.listen(process.env.PORT || 3000, () => {
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
const ROLE_ID = process.env.ROLE_ID;

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
            .setTitle('🟢 Server Online! So get yo ahhh on mc rn')
            .setColor(0x00ff00)
            .setDescription(`Players: ${status.players}/${status.max}`);
    } else {
        return new EmbedBuilder()
            .setTitle('🔴 Danic does not know how to keep a server up so server is Offline.')
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

    let lastStatus = null;

    setInterval(async () => {
        const status = await checkServer();
        const embed = createEmbed(status);

        const message = await client.channels.fetch(CHANNEL_ID)
            .then(channel => channel.messages.fetch(statusMessageId));

        // update the main status message
        message.edit({ embeds: [embed] });

        // detect change
        if (lastStatus === null) {
            lastStatus = status.online;
            return;
        }

        if (!lastStatus && status.online) {
            // OFF -> ON
            const channel = await client.channels.fetch(CHANNEL_ID);
            channel.send({
                content: `<@&${ROLE_ID}> 🟢 Chat the server is Online! Get yo ahh on mc`,
            });
        }

        lastStatus = status.online;

    }, 30000); // <- This closing parenthesis and brace was missing/causing the error
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
