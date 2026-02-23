require("dotenv").config();

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1475400856152051836";
const OWNER_ID = "1259124656124727307";
const GUILD_ID = "1439545058343915656";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let licenses = {};
let blacklist = [];

if (fs.existsSync("licenses.json")) {
    licenses = JSON.parse(fs.readFileSync("licenses.json"));
}
if (fs.existsSync("blacklist.json")) {
    blacklist = JSON.parse(fs.readFileSync("blacklist.json"));
}

client.once('ready', () => {
    console.log(`Bot ready sebagai ${client.user.tag}`);
});

const commands = [

    new SlashCommandBuilder()
        .setName('gettrial')
        .setDescription('Generate trial license')
        .addStringOption(o =>
            o.setName('robloxid')
                .setDescription('Masukkan Roblox User ID')
                .setRequired(true))
        .addIntegerOption(o =>
            o.setName('days')
                .setDescription('Durasi trial (max 3 hari)')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('getperm')
        .setDescription('Generate permanent license')
        .addStringOption(o =>
            o.setName('robloxid')
                .setDescription('Masukkan Roblox User ID')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('addgroup')
        .setDescription('Tambahkan group ke license')
        .addStringOption(o =>
            o.setName('licensekey')
                .setDescription('Masukkan license key')
                .setRequired(true))
        .addStringOption(o =>
            o.setName('groupid')
                .setDescription('Masukkan Group ID')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('removegroup')
        .setDescription('Hapus group dari license')
        .addStringOption(o =>
            o.setName('licensekey')
                .setDescription('Masukkan license key')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Hapus license')
        .addStringOption(o =>
            o.setName('licensekey')
                .setDescription('Masukkan license key')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Blacklist Roblox ID')
        .addStringOption(o =>
            o.setName('robloxid')
                .setDescription('Masukkan Roblox User ID')
                .setRequired(true)),

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands },
    );
})();

client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;
    const now = Math.floor(Date.now() / 1000);

    if (interaction.commandName === 'gettrial') {

        const robloxId = interaction.options.getString('robloxid');
        const days = interaction.options.getInteger('days');

        if (days > 3)
            return interaction.reply({ content: "❌ Max 3 hari.", ephemeral: true });

        const usedDiscord = Object.values(licenses)
            .find(l => l.discordId === interaction.user.id && l.type === "trial");

        const usedRoblox = Object.values(licenses)
            .find(l => l.robloxUserId === robloxId && l.type === "trial");

        if (usedDiscord || usedRoblox)
            return interaction.reply({ content: "❌ Trial sudah pernah digunakan.", ephemeral: true });

        const key = "TG-" + uuidv4().slice(0, 8).toUpperCase();

        licenses[key] = {
            discordId: interaction.user.id,
            robloxUserId: robloxId,
            groupId: null,
            type: "trial",
            expireAt: now + (days * 86400),
            status: "active"
        };

        fs.writeFileSync("licenses.json", JSON.stringify(licenses, null, 2));

        await interaction.user.send(`🔑 License Trial:\n${key}\nDurasi: ${days} hari`);
        return interaction.reply({ content: "✅ License dikirim ke DM.", ephemeral: true });
    }

    if (interaction.commandName === 'getperm') {

        if (interaction.user.id !== OWNER_ID)
            return interaction.reply({ content: "❌ Owner only.", ephemeral: true });

        const robloxId = interaction.options.getString('robloxid');
        const key = "TG-" + uuidv4().slice(0, 8).toUpperCase();

        licenses[key] = {
            discordId: interaction.user.id,
            robloxUserId: robloxId,
            groupId: null,
            type: "permanent",
            expireAt: null,
            status: "active"
        };

        fs.writeFileSync("licenses.json", JSON.stringify(licenses, null, 2));

        return interaction.reply(`🔥 Permanent license dibuat:\n${key}`);
    }

    if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ content: "❌ Owner only.", ephemeral: true });

    const key = interaction.options.getString('licensekey');

    if (interaction.commandName === 'addgroup') {
        const groupId = interaction.options.getString('groupid');
        if (!licenses[key]) return interaction.reply("❌ License tidak ditemukan.");
        licenses[key].groupId = parseInt(groupId);
        fs.writeFileSync("licenses.json", JSON.stringify(licenses, null, 2));
        return interaction.reply("✅ Group ditambahkan.");
    }

    if (interaction.commandName === 'removegroup') {
        if (!licenses[key]) return interaction.reply("❌ License tidak ditemukan.");
        licenses[key].groupId = null;
        fs.writeFileSync("licenses.json", JSON.stringify(licenses, null, 2));
        return interaction.reply("✅ Group dihapus.");
    }

    if (interaction.commandName === 'delete') {
        delete licenses[key];
        fs.writeFileSync("licenses.json", JSON.stringify(licenses, null, 2));
        return interaction.reply("✅ License dihapus.");
    }

    if (interaction.commandName === 'blacklist') {
        const robloxId = interaction.options.getString('robloxid');
        blacklist.push(robloxId);
        fs.writeFileSync("blacklist.json", JSON.stringify(blacklist, null, 2));
        return interaction.reply("🚫 Roblox ID diblacklist.");
    }
});

client.login(TOKEN);

// ===== EXPRESS API =====
const app = express();
app.use(express.json());

app.post('/check', (req, res) => {

    const { licenseKey, creatorId, creatorType } = req.body;

    if (!licenses[licenseKey])
        return res.json({ valid: false });

    const data = licenses[licenseKey];
    const now = Math.floor(Date.now() / 1000);

    if (blacklist.includes(data.robloxUserId))
        return res.json({ valid: false });

    if (data.type === "trial" && now > data.expireAt)
        return res.json({ valid: false });

    if (creatorType === "User" && parseInt(creatorId) === parseInt(data.robloxUserId))
        return res.json({ valid: true });

    if (creatorType === "Group" && data.groupId && parseInt(creatorId) === parseInt(data.groupId))
        return res.json({ valid: true });

    return res.json({ valid: false });
});

app.listen(3000, () => console.log("API berjalan di port 3000"));