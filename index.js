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
  PermissionsBitField,
  Events
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const PANEL_CHANNEL = "1439844994327249039";
const OWNER_ID = "1259124656124727307";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================= TRIAL DATA ================= */

const trialPath = "./trial.json";
if (!fs.existsSync(trialPath)) fs.writeFileSync(trialPath, "{}");

function getTrials() {
  return JSON.parse(fs.readFileSync(trialPath));
}
function saveTrials(data) {
  fs.writeFileSync(trialPath, JSON.stringify(data, null, 2));
}

/* ================= READY ================= */

client.once("ready", async () => {
  console.log(`Bot ready: ${client.user.tag}`);

  const channel = await client.channels.fetch(PANEL_CHANNEL);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("🎫 TG COMMUNITY PANEL")
    .setDescription("Silakan pilih layanan di bawah ini.")
    .addFields(
      { name: "🧪 Trial", value: "Trial 1x per script", inline: true },
      { name: "📦 Script", value: "Download free script", inline: true },
      { name: "💎 Buy", value: "Beli script premium", inline: true }
    )
    .setColor("#00ffcc")
    .setFooter({ text: "TG License System" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("trial").setLabel("TRIAL").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("script").setLabel("SCRIPT").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("buy").setLabel("BUY").setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
});

/* ================= INTERACTION ================= */

client.on(Events.InteractionCreate, async interaction => {

  /* ===== SCRIPT DOWNLOAD ===== */
  if (interaction.isButton() && interaction.customId === "script") {

    const select = new StringSelectMenuBuilder()
      .setCustomId("free_select")
      .setPlaceholder("Pilih free script")
      .addOptions([
        { label: "Dance GUI Free", value: "danceguifree.rbxm" },
        { label: "Music Player Free", value: "musicplayerfree.rbxm" }
      ]);

    return interaction.reply({
      content: "Pilih script:",
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "free_select") {
    await interaction.deferReply({ ephemeral: true });

    const filePath = path.join(__dirname, "Files", interaction.values[0]);

    if (!fs.existsSync(filePath)) {
      return interaction.editReply("❌ File tidak ditemukan.");
    }

    await interaction.user.send({
      content: "📦 Berikut file kamu:",
      files: [filePath]
    });

    return interaction.editReply("✅ File dikirim ke DM kamu.");
  }

  /* ===== TRIAL ===== */
  if (interaction.isButton() && interaction.customId === "trial") {

    const select = new StringSelectMenuBuilder()
      .setCustomId("trial_select")
      .setPlaceholder("Pilih script untuk trial")
      .addOptions([
        { label: "VIP System", value: "vipsystem.rbxm" },
        { label: "Sync Dance", value: "syncdance.rbxm" }
      ]);

    return interaction.reply({
      content: "Pilih script trial:",
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "trial_select") {

    const modal = new ModalBuilder()
      .setCustomId(`trial_modal_${interaction.values[0]}`)
      .setTitle("Trial Form");

    const robloxInput = new TextInputBuilder()
      .setCustomId("roblox_id")
      .setLabel("ID Roblox")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(robloxInput));

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("trial_modal_")) {

    const trials = getTrials();
    const script = interaction.customId.replace("trial_modal_", "");
    const robloxId = interaction.fields.getTextInputValue("roblox_id");

    if (!trials[interaction.user.id]) trials[interaction.user.id] = {};

    if (trials[interaction.user.id][script]) {
      return interaction.reply({ content: "❌ Kamu sudah trial script ini.", ephemeral: true });
    }

    trials[interaction.user.id][script] = {
      robloxId,
      expire: Date.now() + (3 * 24 * 60 * 60 * 1000)
    };

    saveTrials(trials);

    return interaction.reply({
      content: `✅ Trial aktif untuk ${script}\nExpire: 3 hari`,
      ephemeral: true
    });
  }

  /* ===== BUY SYSTEM ===== */
  if (interaction.isButton() && interaction.customId === "buy") {

    const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}`);
    if (existing) {
      return interaction.reply({ content: "❌ Kamu sudah punya ticket.", ephemeral: true });
    }

    const ticket = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: OWNER_ID, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const select = new StringSelectMenuBuilder()
      .setCustomId("buy_select")
      .setPlaceholder("Pilih script yang ingin dibeli")
      .addOptions([
        { label: "VIP System", value: "vip" },
        { label: "Sync Dance", value: "sync" }
      ]);

    const embed = new EmbedBuilder()
      .setTitle("💳 Informasi Pembayaran")
      .setDescription(`
Pilih script di bawah ini.

🏦 BNI: 1234567890 a.n TG COMMUNITY
📱 QRIS tersedia di bawah.
`)
      .setColor("#00ffcc");

    await ticket.send({ embeds: [embed] });
    await ticket.send({ files: [path.join(__dirname, "Assets", "qris.png")] });
    await ticket.send({ components: [new ActionRowBuilder().addComponents(select)] });

    return interaction.reply({ content: `✅ Ticket dibuat: ${ticket}`, ephemeral: true });
  }

});
client.login(TOKEN);