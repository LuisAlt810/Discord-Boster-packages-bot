const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Role IDs
const ROLE_IDS = {
  booster: '1377244608379224084',
  giveaway: '1400074979680321547',
  red: '1400073351917080638',
  purple: '1400073679521579061',
  green: '1400073556485865472',
  dark: '1400073747846795344',
  blue: '1400073437904502996',
};

// Special user allowed to pick roles regardless of booster role
const ALLOWED_USER_ID = '1370394029665030295';

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Auto-assign booster & giveaway roles when someone boosts
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    if (!oldMember.premiumSince && newMember.premiumSince) {
      await newMember.roles.add([ROLE_IDS.booster, ROLE_IDS.giveaway]);
      console.log(`Assigned booster & giveaway roles to ${newMember.user.tag}`);
    }
  } catch (err) {
    console.error('Error assigning boost roles:', err);
  }
});

// !perksSend command to send role picker buttons
client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;

  const prefix = '!';
  if (!message.content.startsWith(`${prefix}perksSend`)) return;

  const args = message.content.trim().split(/ +/g);
  if (args.length < 2) {
    return message.reply({ content: 'Usage: `!perksSend <#channel|channel_id>`', ephemeral: true });
  }

  // Resolve channel
  const target = args[1];
  let channel;
  if (message.mentions.channels.size) {
    channel = message.mentions.channels.first();
  } else {
    channel = message.guild.channels.cache.get(target);
  }
  if (!channel) {
    return message.reply({ content: 'Channel not found. Make sure to mention or use a valid ID.', ephemeral: true });
  }

  // Build buttons with matching colors
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('role_red')
        .setLabel('🔴 Red')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('role_purple')
        .setLabel('🟣 Purple')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('role_green')
        .setLabel('🟢 Green')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('role_dark')
        .setLabel('⚫ Dark')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('role_blue')
        .setLabel('🔵 Blue')
        .setStyle(ButtonStyle.Primary),
    );

  await channel.send({
    content: '**🎉 Pick Your Color Role!**',
    components: [row],
  });

  return message.reply({ content: `Perks message sent in ${channel}.`, ephemeral: true });
});

// Button interaction handler with user and booster role check
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  const { customId, member, user } = interaction;

  // Only allow if user is special allowed user OR has booster role
  if (user.id !== ALLOWED_USER_ID && !member.roles.cache.has(ROLE_IDS.booster)) {
    return interaction.reply({
      content: '❌ Only Booster role holders or the special user can pick these color roles!',
      ephemeral: true,
    });
  }

  const roleMap = {
    role_red: ROLE_IDS.red,
    role_purple: ROLE_IDS.purple,
    role_green: ROLE_IDS.green,
    role_dark: ROLE_IDS.dark,
    role_blue: ROLE_IDS.blue,
  };

  const roleId = roleMap[customId];
  if (!roleId) return;

  try {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      await interaction.reply({ content: '❌ Role removed.', ephemeral: true });
    } else {
      await member.roles.add(roleId);
      await interaction.reply({ content: '✅ Role added!', ephemeral: true });
    }
  } catch (err) {
    console.error('Error toggling role:', err);
    await interaction.reply({
      content: 'There was an error while assigning the role.',
      ephemeral: true,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
