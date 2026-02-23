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
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const TOKEN = process.env.TOKEN;
const PANEL_CHANNEL_ID = "1439844994327249039";
const OWNER_ID = "1259124656124727307";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================= LOAD TRIAL DATA ================= */

let trials = {};
if (fs.existsSync("trial.json")) {
  trials = JSON.parse(fs.readFileSync("trial.json"));
}

/*
STRUKTUR trial.json:

{
  "discordId": {
     "dance": { robloxId: "123", expire: 123123123 },
     "musicp": { robloxId: "456", expire: 123123123 }
  }
}
*/

/* ================= READY ================= */

client.once("ready", async () => {
  console.log(`Bot ready sebagai ${client.user.tag}`);

  const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return console.log("Panel channel tidak ditemukan.");

  const messages = await channel.messages.fetch({ limit: 10 });
  messages
    .filter(m => m.author.id === client.user.id)
    .forEach(m => m.delete().catch(() => {}));

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎫 TG COMMUNITY PANEL")
    .setDescription("Pilih layanan di bawah ini.")
    .addFields(
      { name: "🧪 Trial", value: "Trial 3 hari (1x per script)", inline: true },
      { name: "📦 Script", value: "Download script langsung", inline: true },
      { name: "🛒 Buy", value: "Buat ticket pembelian", inline: true }
    )
    .setFooter({ text: "TG License System • Modern Edition" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("trial_button")
      .setLabel("TRIAL")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("script_button")
      .setLabel("SCRIPT")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("buy_button")
      .setLabel("BUY")
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
});

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async (interaction) => {

  /* ===== SCRIPT BUTTON ===== */
  if (interaction.isButton() && interaction.customId === "script_button") {

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select_script")
        .setPlaceholder("Pilih script...")
        .addOptions([
          { label: "Music Player Script", value: "musicp" },
          { label: "Dance Gui Script", value: "dance" }
        ])
    );

    return interaction.reply({
      content: "Pilih script:",
      components: [row],
      ephemeral: true
    });
  }

  /* ===== SCRIPT SELECT ===== */
  if (interaction.isStringSelectMenu() && interaction.customId === "select_script") {

    const fileMap = {
      dance: "./files/DanceGUI by TG.rbxm",
      musicp: "./files/MusicPlayer.rbxm"
    };

    return interaction.reply({
      content: `📦 Berikut script kamu (${interaction.values[0]})`,
      files: [fileMap[interaction.values[0]]],
      ephemeral: true
    });
  }

  /* ===== TRIAL BUTTON ===== */
  if (interaction.isButton() && interaction.customId === "trial_button") {

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("trial_select")
        .setPlaceholder("Pilih script untuk trial...")
        .addOptions([
          { label: "DanceGUI by TG Script", value: "dance" },
          { label: "Music Player Script", value: "musicp" }
        ])
    );

    return interaction.reply({
      content: "Pilih script untuk trial:",
      components: [row],
      ephemeral: true
    });
  }

  /* ===== TRIAL SELECT ===== */
  if (interaction.isStringSelectMenu() && interaction.customId === "trial_select") {

    const selected = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`trial_form_${selected}`)
      .setTitle("TRIAL SCRIPT (3 HARI)");

    const robloxInput = new TextInputBuilder()
      .setCustomId("roblox_id")
      .setLabel("ID ROBLOX")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(robloxInput)
    );

    return interaction.showModal(modal);
  }

  /* ===== TRIAL SUBMIT ===== */
  if (interaction.isModalSubmit() && interaction.customId.startsWith("trial_form_")) {

    const scriptName = interaction.customId.replace("trial_form_", "");
    const robloxId = interaction.fields.getTextInputValue("roblox_id");
    const discordId = interaction.user.id;

    if (!trials[discordId]) trials[discordId] = {};

    if (trials[discordId][scriptName]) {
      return interaction.reply({
        content: "❌ Kamu sudah pernah trial script ini.",
        ephemeral: true
      });
    }

    // cek roblox ID sudah pernah trial script ini atau belum
    for (let user in trials) {
      if (trials[user][scriptName]?.robloxId === robloxId) {
        return interaction.reply({
          content: "❌ ID Roblox ini sudah pernah trial script ini.",
          ephemeral: true
        });
      }
    }

    const expireTime = Date.now() + (3 * 24 * 60 * 60 * 1000);
    const licenseKey = `${scriptName.toUpperCase()}-${uuidv4()}`;

    trials[discordId][scriptName] = {
      robloxId: robloxId,
      expire: expireTime
    };

    fs.writeFileSync("trial.json", JSON.stringify(trials, null, 2));

    await interaction.user.send(
`🎉 Trial Aktif!

📜 Script: ${scriptName}
🔑 License:
${licenseKey}

⏳ Expire:
${new Date(expireTime).toLocaleString()}`
    );

    return interaction.reply({
      content: "✅ Trial berhasil! License dikirim ke DM.",
      ephemeral: true
    });
  }

  /* ===== BUY BUTTON ===== */
  if (interaction.isButton() && interaction.customId === "buy_button") {

    const existing = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.id}`
    );

    if (existing) {
      return interaction.reply({
        content: "❌ Kamu sudah punya ticket.",
        ephemeral: true
      });
    }

    const ticket = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: OWNER_ID,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
    });

    await ticket.send(`🎫 Ticket dibuat oleh <@${interaction.user.id}>`);

    return interaction.reply({
      content: `✅ Ticket dibuat: ${ticket}`,
      ephemeral: true
    });
  }

});

client.login(TOKEN);