require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1439844994327249039";

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const trialFile = "./trial.json";
if (!fs.existsSync(trialFile)) {
    fs.writeFileSync(trialFile, JSON.stringify({}));
}

function getTrials() {
    return JSON.parse(fs.readFileSync(trialFile));
}

function saveTrials(data) {
    fs.writeFileSync(trialFile, JSON.stringify(data, null, 2));
}

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const channel = await client.channels.fetch(CHANNEL_ID);

    const embed = new EmbedBuilder()
        .setTitle("🎟️ TG COMMUNITY PANEL")
        .setDescription("Pilih layanan di bawah ini.\n\n🟢 **Trial** - Coba script (1x saja)\n📦 **Script** - Download file\n💰 **Buy** - Buat ticket pembelian")
        .setColor("#00ffcc")
        .setFooter({ text: "TG License System • Modern Edition" });

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("trial")
            .setLabel("TRIAL")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("script")
            .setLabel("SCRIPT")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("buy")
            .setLabel("BUY")
            .setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [buttons] });
});

client.on(Events.InteractionCreate, async interaction => {

    // ================= BUTTONS =================
    if (interaction.isButton()) {

        if (interaction.customId === "trial") {

            const trials = getTrials();
            if (trials[interaction.user.id]) {
                return interaction.reply({
                    content: "❌ Kamu sudah pernah menggunakan trial.",
                    ephemeral: true
                });
            }

            const modal = new ModalBuilder()
                .setCustomId("trial_modal")
                .setTitle("TRIAL SCRIPT");

            const robloxInput = new TextInputBuilder()
                .setCustomId("roblox_id")
                .setLabel("ID ROBLOX")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const scriptInput = new TextInputBuilder()
                .setCustomId("script_name")
                .setLabel("SCRIPT (dance / music)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(robloxInput),
                new ActionRowBuilder().addComponents(scriptInput)
            );

            return interaction.showModal(modal);
        }

        if (interaction.customId === "script") {

            const select = new StringSelectMenuBuilder()
                .setCustomId("script_select")
                .setPlaceholder("Pilih script...")
                .addOptions([
                    { label: "Dance GUI", value: "dance" },
                    { label: "Music Player", value: "music" }
                ]);

            const row = new ActionRowBuilder().addComponents(select);

            return interaction.reply({
                content: "Pilih script:",
                components: [row],
                ephemeral: true
            });
        }

        if (interaction.customId === "buy") {
            return interaction.reply({
                content: "💰 Untuk membeli script, silakan hubungi admin.",
                ephemeral: true
            });
        }
    }

    // ================= SELECT MENU =================
    if (interaction.isStringSelectMenu()) {

        await interaction.deferReply({ ephemeral: true });

        let fileName;

        if (interaction.values[0] === "dance") {
            fileName = "danceguifree.rbxm";
        }

        if (interaction.values[0] === "music") {
            fileName = "musicplayerfree.rbxm";
        }

        const filePath = path.join(__dirname, "Files", fileName);

        if (!fs.existsSync(filePath)) {
            return interaction.editReply("❌ File tidak ditemukan di server.");
        }

        try {
            await interaction.user.send({
                content: "📦 Berikut file script kamu:",
                files: [filePath]
            });

            await interaction.editReply("✅ Script berhasil dikirim ke DM kamu!");
        } catch (err) {
            console.error(err);
            await interaction.editReply("❌ Gagal kirim DM. Aktifkan DM server members.");
        }
    }

    // ================= MODAL =================
    if (interaction.isModalSubmit()) {

        if (interaction.customId === "trial_modal") {

            const robloxId = interaction.fields.getTextInputValue("roblox_id");
            const scriptName = interaction.fields.getTextInputValue("script_name").toLowerCase();

            const trials = getTrials();
            trials[interaction.user.id] = {
                robloxId,
                scriptName,
                date: Date.now()
            };

            saveTrials(trials);

            return interaction.reply({
                content: `✅ Trial berhasil!\nRoblox ID: ${robloxId}\nScript: ${scriptName}\n\nTrial hanya bisa digunakan 1x.`,
                ephemeral: true
            });
        }
    }

});

client.login(TOKEN);