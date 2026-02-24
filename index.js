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
  Events,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1259124656124727307";
const GUILD_ID = "1439545058343915656";
const PANEL_CHANNEL = "1439844994327249039";
const OWNER_ID = "1259124656124727307";
const TICKET_CATEGORY = "1439842726433787984";

/* ================= INIT FILES ================= */

if (!fs.existsSync("./trial.json")) fs.writeFileSync("./trial.json", "{}");
if (!fs.existsSync("./licenses.json")) fs.writeFileSync("./licenses.json", "{}");
if (!fs.existsSync("./ticketCount.json")) fs.writeFileSync("./ticketCount.json", JSON.stringify({count:0}));

function getJSON(file){ return JSON.parse(fs.readFileSync(file)); }
function saveJSON(file,data){ fs.writeFileSync(file, JSON.stringify(data,null,2)); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= REGISTER COMMAND ================= */

const commands = [
  new SlashCommandBuilder()
    .setName("success")
    .setDescription("Konfirmasi pembayaran & kirim script premium")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

/* ================= READY PANEL ================= */

client.once("ready", async () => {
  console.log(`Bot Ready: ${client.user.tag}`);

  const channel = await client.channels.fetch(PANEL_CHANNEL).catch(()=>null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("🎫 TG COMMUNITY PANEL")
    .setColor("#00ffcc")
    .setDescription(`
🧪 Trial 1x per script  
📦 Download Free Script  
💎 Buy Premium Script
`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("trial").setLabel("TRIAL").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("script").setLabel("SCRIPT").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("buy").setLabel("BUY").setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds:[embed], components:[row] });
});

/* ================= INTERACTION ================= */

client.on(Events.InteractionCreate, async interaction => {

  /* ===== FREE SCRIPT ===== */
  if (interaction.isButton() && interaction.customId === "script") {

    const select = new StringSelectMenuBuilder()
      .setCustomId("free_select")
      .setPlaceholder("Pilih free script")
      .addOptions([
        { label:"Dance GUI Free", value:"danceguifree.rbxm" },
        { label:"Music Player Free", value:"musicplayerfree.rbxm" }
      ]);

    return interaction.reply({
      content:"Pilih script:",
      components:[new ActionRowBuilder().addComponents(select)],
      ephemeral:true
    });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "free_select") {
    await interaction.deferReply({ephemeral:true});
    const filePath = path.join(__dirname,"Files",interaction.values[0]);
    if(!fs.existsSync(filePath)) return interaction.editReply("❌ File tidak ditemukan.");
    await interaction.user.send({ files:[filePath] });
    return interaction.editReply("✅ File dikirim ke DM kamu.");
  }

  /* ===== TRIAL ===== */
  if (interaction.isButton() && interaction.customId === "trial") {

    const select = new StringSelectMenuBuilder()
      .setCustomId("trial_select")
      .setPlaceholder("Pilih script trial")
      .addOptions([
        { label:"VIP System", value:"vipsystem.rbxm" },
        { label:"Sync Dance", value:"syncdance.rbxm" }
      ]);

    return interaction.reply({
      content:"Pilih script trial:",
      components:[new ActionRowBuilder().addComponents(select)],
      ephemeral:true
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

    const trials = getJSON("./trial.json");
    const script = interaction.customId.replace("trial_modal_","");
    const robloxId = interaction.fields.getTextInputValue("roblox_id");

    if(!trials[interaction.user.id]) trials[interaction.user.id] = {};

    if(trials[interaction.user.id][script])
      return interaction.reply({content:"❌ Kamu sudah trial script ini.",ephemeral:true});

    trials[interaction.user.id][script] = {
      robloxId,
      expire: Date.now() + (3*24*60*60*1000)
    };

    saveJSON("./trial.json",trials);

    return interaction.reply({content:"✅ Trial aktif 3 hari.",ephemeral:true});
  }

  /* ===== BUY ===== */
  if (interaction.isButton() && interaction.customId === "buy") {

    const counter = getJSON("./ticketCount.json");
    counter.count += 1;
    saveJSON("./ticketCount.json",counter);

    const ticketName = `ticket-${String(counter.count).padStart(4,"0")}`;

    const ticket = await interaction.guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY,
      permissionOverwrites:[
        {id:interaction.guild.id,deny:[PermissionsBitField.Flags.ViewChannel]},
        {id:interaction.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages]},
        {id:OWNER_ID,allow:[PermissionsBitField.Flags.ViewChannel]}
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(`💳 ${ticketName}`)
      .setColor("#00ffcc")
      .setDescription(`
💎 VIP SYSTEM — Rp 150.000  
💎 SYNC DANCE — Rp 100.000  

🏦 BNI  
1932421659  
a.n MUHAMMAD TEGAR PURNAMAWANSYAH  

Kirim format:

ID ROBLOX: 12345678  
SCRIPT: VIP / SYNC
`);

    await ticket.send({embeds:[embed]});

    const qrisPath = path.join(__dirname,"Assets","qris.png");
    if(fs.existsSync(qrisPath))
      await ticket.send({files:[qrisPath]});

    return interaction.reply({content:`✅ Ticket dibuat: ${ticket}`,ephemeral:true});
  }

  /* ===== SUCCESS ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === "success") {

    if(interaction.user.id !== OWNER_ID)
      return interaction.reply({content:"❌ Hanya owner.",ephemeral:true});

    const messages = await interaction.channel.messages.fetch({limit:20});

    let robloxId=null;
    let scriptType=null;

    messages.forEach(msg=>{
      if(msg.content.includes("ID ROBLOX:"))
        robloxId = msg.content.split("ID ROBLOX:")[1]?.trim();
      if(msg.content.includes("SCRIPT:"))
        scriptType = msg.content.split("SCRIPT:")[1]?.trim().toLowerCase();
    });

    if(!robloxId || !scriptType)
      return interaction.reply({content:"❌ Format tidak ditemukan.",ephemeral:true});

    const licenseKey = `${scriptType.toUpperCase()}-${uuidv4()}`;

    const licenses = getJSON("./licenses.json");
    licenses[robloxId] = { script:scriptType, license:licenseKey, permanent:true };
    saveJSON("./licenses.json",licenses);

    const fileName = scriptType==="vip" ? "vipsystem.rbxm" : "syncdance.rbxm";
    const filePath = path.join(__dirname,"Files",fileName);

    const userId = interaction.channel.permissionOverwrites.cache.find(p=>p.type===1 && p.id!==OWNER_ID)?.id;
    const member = await interaction.guild.members.fetch(userId);

    await member.send(`🎉 Pembayaran berhasil!\n🔑 License Permanent:\n${licenseKey}`);
    if(fs.existsSync(filePath)) await member.send({files:[filePath]});

    await interaction.reply("✅ Script & license dikirim.");
  }

});

client.login(TOKEN);