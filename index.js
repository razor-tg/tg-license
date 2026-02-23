require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1259124656124727307";
const GUILD_ID = "1439545058343915656";
const PANEL_CHANNEL_ID = "1439844994327249039";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================= LOAD TRIAL DATA ================= */

let trials = {};
if (fs.existsSync("trial.json")) {
  trials = JSON.parse(fs.readFileSync("trial.json"));
}

/* ================= AUTO PANEL SEND ================= */

client.once("ready", async () => {
  console.log(`Bot ready sebagai ${client.user.tag}`);

  const channel = await client.channels.fetch(PANEL_CHANNEL_ID);

  if (!channel) return console.log("Channel tidak ditemukan.");

  // Hapus panel lama biar tidak spam
  const messages = await channel.messages.fetch({ limit: 10 });
  const botMessages = messages.filter(msg => 
    msg.author.id === client.user.id
  );

  for (const msg of botMessages.values()) {
    await msg.delete().catch(() => {});
  }

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎫 PANEL UNTUK MEMBER DAN BUYER TG COMMUNITY")
    .setDescription("Silakan pilih layanan di bawah ini.")
    .addFields(
      { name: "🧪 TRIAL", value: "Coba script 3 hari", inline: true },
      { name: "📦 SCRIPT", value: "Download script langsung", inline: true }
    )
    .setFooter({ text: "TG Community License System" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("trial_button")
      .setLabel("TRIAL")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("script_button")
      .setLabel("SCRIPT")
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [row] });
});

/* ================= INTERACTION HANDLER ================= */

client.on("interactionCreate", async (interaction) => {

  /* ===== SCRIPT BUTTON ===== */
  if (interaction.isButton()) {

    if (interaction.customId === "script_button") {

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_script")
          .setPlaceholder("Pilih script...")
          .addOptions([
            { label: "Dance Script", value: "dance" },
            { label: "Overhead Script", value: "overhead" }
          ])
      );

      return interaction.reply({
        content: "Pilih script yang ingin dikirim:",
        components: [row],
        ephemeral: true
      });
    }

    if (interaction.customId === "trial_button") {

      const modal = new ModalBuilder()
        .setCustomId("trial_form")
        .setTitle("TRIAL SCRIPT");

      const robloxInput = new TextInputBuilder()
        .setCustomId("roblox_id")
        .setLabel("ID ROBLOX")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const scriptInput = new TextInputBuilder()
        .setCustomId("script_name")
        .setLabel("SCRIPT (Dance / Overhead)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(robloxInput),
        new ActionRowBuilder().addComponents(scriptInput)
      );

      return interaction.showModal(modal);
    }
  }

  /* ===== SELECT SCRIPT ===== */
  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "select_script") {

      const script = interaction.values[0];

      const fileMap = {
        music: "./files/MusicPlayer.rbxm",
        dance: "./files/DanceGUI by TG.rbxm"
      };

      try {
        await interaction.user.send({
          content: `📦 Berikut script kamu (${script})`,
          files: [fileMap[script]]
        });

        return interaction.reply({
          content: "✅ Script dikirim ke DM kamu.",
          ephemeral: true
        });

      } catch {
        return interaction.reply({
          content: "❌ Gagal kirim DM. Aktifkan DM kamu.",
          ephemeral: true
        });
      }
    }
  }

  /* ===== TRIAL FORM SUBMIT ===== */
  if (interaction.isModalSubmit()) {

    if (interaction.customId === "trial_form") {

      const robloxId = interaction.fields.getTextInputValue("roblox_id");
      const scriptName = interaction.fields.getTextInputValue("script_name");
      const discordId = interaction.user.id;

      if (trials[discordId] || Object.values(trials).includes(robloxId)) {
        return interaction.reply({
          content: "❌ Kamu sudah pernah mencoba trial.",
          ephemeral: true
        });
      }

      const licenseKey = uuidv4();

      trials[discordId] = robloxId;
      fs.writeFileSync("trial.json", JSON.stringify(trials, null, 2));

      try {
        await interaction.user.send(`
🎉 Trial Berhasil!

🔑 License:
\`${licenseKey}\`

📜 Script: ${scriptName}
⏳ Durasi: 3 Hari
`);

        return interaction.reply({
          content: "✅ Trial berhasil! License dikirim ke DM.",
          ephemeral: true
        });

      } catch {
        return interaction.reply({
          content: "❌ Gagal kirim DM. Aktifkan DM kamu.",
          ephemeral: true
        });
      }
    }
  }

});

client.login(TOKEN);