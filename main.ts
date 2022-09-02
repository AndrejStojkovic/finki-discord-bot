import { readdirSync } from 'node:fs';
import { REST } from '@discordjs/rest';
import {
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type GuildMemberRoleManager,
  type Role,
  type TextChannel,
  type UserContextMenuCommandInteraction,
  channelMention,
  ChannelType,
  Collection,
  EmbedBuilder,
  inlineCode,
  roleMention,
  Routes,
  userMention
} from 'discord.js';
import { client } from './src/client.js';
import {
  getFromBotConfig,
  getFromRoleConfig
} from './src/config.js';
import { logger } from './src/logger.js';

const [applicationID, token] = [getFromBotConfig('applicationID'), getFromBotConfig('token')];

if (applicationID === undefined || applicationID === '') {
  throw new Error('Missing application ID or token');
}

if (token === undefined || token === '') {
  throw new Error('Missing token');
}

const rest = new REST().setToken(token);

const files = readdirSync('./dist/commands').filter((file) => file.endsWith('.js'));
const commands = new Collection<string, Command>();
const commandsJSON: string[] = [];

for (const file of files) {
  const command: Command = await import(`./commands/${file}`);
  commands.set(command.data.name, command);
  commandsJSON.push(command.data.toJSON());

  logger.debug(`Command: ${command.data.name}`);
}

try {
  await rest.put(Routes.applicationCommands(applicationID), { body: commandsJSON });
  logger.debug('Successfully registered application commands');
} catch (error) {
  throw new Error(`Failed to register application commands\n${error}`);
}

let logChannel: TextChannel;
let colorRoles: Role[] = [];
let yearRoles: Role[] = [];
let programRoles: Role[] = [];

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    logger.debug(`Interaction ${interaction.id} is chat input command`);
    await handleChatInputCommand(interaction);
  } else if (interaction.isButton()) {
    logger.debug(`Interaction ${interaction.id} is button`);
    await handleButton(interaction);
  } else if (interaction.isUserContextMenuCommand()) {
    logger.debug(`Interaction ${interaction.id} is user context menu command`);
    await handleUserContextMenuCommand(interaction);
  } else {
    logger.warn(`Unknown interaction ${interaction.id}: ${interaction.toJSON()}`);
  }
});

client.once('ready', async () => {
  logger.info('Bot is ready');

  const channel = client.channels.cache.get(getFromBotConfig('logChannel'));

  if (channel === undefined || channel?.type !== ChannelType.GuildText) {
    throw new Error('The log channel must be a guild text channel');
  }

  logChannel = channel;
});

try {
  await client.login(token);
  logger.info('Bot logged in');
} catch (error) {
  throw new Error(`Bot failed to login\n${error}`);
}

async function handleChatInputCommand (interaction: ChatInputCommandInteraction): Promise<void> {
  const command = commands.get(interaction.commandName);

  if (command === undefined) {
    logger.warn(`No command was found for the chat command ${interaction.id}: ${interaction.commandName}`);
    return;
  }

  logger.debug(`Received chat input command interaction ${interaction.id} from ${interaction.user.tag}: ${interaction}`);
  logger.info(`[Chat] ${interaction.user.tag}: ${interaction} [${interaction.channel?.type === ChannelType.GuildText ? 'Guild' : 'DM'}]`);

  try {
    await interaction.deferReply();
    await command.execute(interaction);
    logger.debug(`Handled interaction ${interaction.id} from ${interaction.user.id}: ${interaction}`);
  } catch (error) {
    logger.error(`Failed to handle interaction\n${error}`);
  }

  if (interaction.channel !== null && interaction.channel.type === ChannelType.GuildText) {
    const embed = new EmbedBuilder()
      .setColor(getFromBotConfig('color'))
      .setTitle('Chat Input Command')
      .setAuthor({
        // @ts-expect-error This should never happen, since it's a member
        iconURL: interaction.member.displayAvatarURL(),
        name: interaction.user.tag
      })
      .addFields(
        {
          name: 'Author',
          value: userMention(interaction.user.id)
        },
        {
          name: 'Command',
          value: inlineCode(interaction.toString())
        },
        {
          name: 'Channel',
          value: channelMention(interaction.channel.id)
        }
      )
      .setFooter({ text: interaction.id })
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error(`Failed to send log for interaction ${interaction.id}\n${error}`);
    }
  }
}

async function handleButton (interaction: ButtonInteraction): Promise<void> {
  const [command, ...args] = interaction.customId.split(':');

  logger.info(`[Button] ${interaction.user.tag}: ${interaction.customId} [${interaction.channel?.type === ChannelType.GuildText ? 'Guild' : 'DM'}]`);

  if (command === 'color') {
    await handleColorButton(interaction, args);
  } else if (command === 'year') {
    await handleYearButton(interaction, args);
  } else if (command === 'activity') {
    await handleActivityButton(interaction, args);
  } else if (command === 'subject') {
    await handleSubjectButton(interaction, args);
  } else if (command === 'program') {
    await handleProgramButton(interaction, args);
  } else {
    logger.warn(`Unknown button interaction ${interaction.id}: ${interaction.customId}`);
  }
}

async function handleUserContextMenuCommand (interaction: UserContextMenuCommandInteraction): Promise<void> {
  const command = commands.get(interaction.commandName);

  if (command === undefined) {
    logger.warn(`No command was found for the user context menu command ${interaction.id}: ${interaction.commandName}`);
    return;
  }

  logger.info(`[User Context Menu] ${interaction.user.tag}: ${interaction.commandName} [${interaction.channel?.type === ChannelType.GuildText ? 'Guild' : 'DM'}]`);

  try {
    await interaction.deferReply();
    await command.execute(interaction);
    logger.debug(`Handled interaction ${interaction.id} from ${interaction.user.id}: ${interaction.commandName} ${interaction.targetId}`);
  } catch (error) {
    logger.error(`Failed to handle interaction\n${error}`);
  }

  if (interaction.channel !== null && interaction.channel.type === ChannelType.GuildText) {
    const embed = new EmbedBuilder()
      .setColor(getFromBotConfig('color'))
      .setTitle('User Context Menu')
      .setAuthor({
        // @ts-expect-error The member cannot be null
        iconURL: interaction.member.displayAvatarURL(),
        name: interaction.user.tag
      })
      .addFields(
        {
          name: 'Author',
          value: userMention(interaction.user.id)
        },
        {
          name: 'Command',
          value: inlineCode(interaction.commandName)
        },
        {
          name: 'Channel',
          value: channelMention(interaction.channel.id)
        },
        {
          name: 'Target',
          value: userMention(interaction.targetId)
        }
      )
      .setFooter({ text: interaction.id })
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.warn(`Failed to log user context menu interaction ${interaction.id}: ${interaction.commandName} ${interaction.targetId}\n${error}`);
    }
  }
}

async function handleColorButton (interaction: ButtonInteraction, args: string[]): Promise<void> {
  const guild = interaction.guild;

  if (guild === null) {
    logger.warn(`Received button interaction ${interaction.id}: ${interaction.customId} from ${interaction.user.tag} outside of a guild`);
    return;
  }

  if (colorRoles.length === 0) {
    const roles = getFromRoleConfig('color').map((r) => guild.roles.cache.find((ro) => ro.name === r));

    if (roles === undefined || roles.includes(undefined)) {
      logger.warn(`One or more roles for button interaction ${interaction.id}: ${interaction.customId} were not found`);
      return;
    }

    colorRoles = roles as Role[];
  }

  const role = guild.roles.cache.find((r) => r.name === args[0]);
  const member = interaction.member;

  if (role === undefined) {
    logger.warn(`The role for button interaction ${interaction.id}: ${interaction.customId} was not found `);
    return;
  }

  // @ts-expect-error The member cannot be null
  const memberRoles = member.roles as GuildMemberRoleManager;

  if (memberRoles.cache.has(role.id)) {
    await memberRoles.remove(role);
  } else {
    await memberRoles.remove(colorRoles);
    await memberRoles.add(role);
  }

  try {
    await interaction.deferUpdate();
  } catch (error) {
    logger.warn(`Failed to respond to button interaction ${interaction.id}: ${interaction.customId}\n${error}`);
    return;
  }

  if (interaction.channel !== null && interaction.channel.type === ChannelType.GuildText) {
    const embed = new EmbedBuilder()
      .setColor(getFromBotConfig('color'))
      .setTitle('Button')
      .setAuthor({
        // @ts-expect-error The member cannot be null
        iconURL: interaction.member.displayAvatarURL(),
        name: interaction.user.tag
      })
      .addFields(
        {
          name: 'Author',
          value: userMention(interaction.user.id)
        },
        {
          name: 'Command',
          value: 'Color'
        },
        {
          name: 'Role',
          value: roleMention(role.id)
        }
      )
      .setFooter({ text: interaction.id })
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.warn(`Failed to log button interaction ${interaction.id}: ${interaction.customId}\n${error}`);
    }
  }
}

async function handleYearButton (interaction: ButtonInteraction, args: string[]): Promise<void> {
  const guild = interaction.guild;

  if (guild === null) {
    logger.warn(`Received button interaction ${interaction.id}: ${interaction.customId} from ${interaction.user.tag} outside of a guild`);
    return;
  }

  if (yearRoles.length === 0) {
    const roles = getFromRoleConfig('year').map((r) => guild.roles.cache.find((ro) => ro.name === r));

    if (roles === undefined || roles.includes(undefined)) {
      logger.warn(`One or more roles for button interaction ${interaction.id}: ${interaction.customId} were not found`);
      return;
    }

    yearRoles = roles as Role[];
  }

  const role = guild.roles.cache.find((r) => r.name === args[0]);
  const member = interaction.member;

  if (role === undefined) {
    logger.warn(`The role was not found for interaction ${interaction.id}: ${interaction.customId}`);
    return;
  }

  // @ts-expect-error The member cannot be null
  const memberRoles = member.roles as GuildMemberRoleManager;

  if (memberRoles.cache.has(role.id)) {
    await memberRoles.remove(role);
  } else {
    await memberRoles.remove(yearRoles);
    await memberRoles.add(role);
  }

  try {
    await interaction.deferUpdate();
  } catch (error) {
    logger.warn(`Failed to respond to button interaction ${interaction.id}: ${interaction.customId}\n${error}`);
    return;
  }

  if (interaction.channel !== null && interaction.channel.type === ChannelType.GuildText) {
    const embed = new EmbedBuilder()
      .setColor(getFromBotConfig('color'))
      .setTitle('Button')
      .setAuthor({
        // @ts-expect-error The member cannot be null
        iconURL: interaction.member.displayAvatarURL(),
        name: interaction.user.tag
      })
      .addFields(
        {
          name: 'Author',
          value: userMention(interaction.user.id)
        },
        {
          name: 'Command',
          value: 'Year'
        },
        {
          name: 'Role',
          value: roleMention(role.id)
        }
      )
      .setFooter({ text: interaction.id })
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.warn(`Failed to log button interaction ${interaction.id}: ${interaction.customId}\n${error}`);
    }
  }
}

async function handleActivityButton (interaction: ButtonInteraction, args: string[]): Promise<void> {
  const guild = interaction.guild;

  if (guild === null) {
    logger.warn(`Received button interaction ${interaction.id}: ${interaction.customId} from ${interaction.user.tag} outside of a guild`);
    return;
  }

  const role = guild.roles.cache.find((r) => r.name === args[0]);
  const member = interaction.member;

  if (role === undefined) {
    logger.warn(`The role was not found for interaction ${interaction.id}: ${interaction.customId}`);
    return;
  }

  // @ts-expect-error The member cannot be null
  const memberRoles = member.roles as GuildMemberRoleManager;

  if (memberRoles.cache.has(role.id)) {
    await memberRoles.remove(role);
  } else {
    await memberRoles.add(role);
  }

  try {
    await interaction.deferUpdate();
  } catch (error) {
    logger.warn(`Failed to respond to button interaction ${interaction.id}: ${interaction.customId}\n${error}`);
    return;
  }

  if (interaction.channel !== null && interaction.channel.type === ChannelType.GuildText) {
    const embed = new EmbedBuilder()
      .setColor(getFromBotConfig('color'))
      .setTitle('Button')
      .setAuthor({
        // @ts-expect-error The member cannot be null
        iconURL: interaction.member.displayAvatarURL(),
        name: interaction.user.tag
      })
      .addFields(
        {
          name: 'Author',
          value: userMention(interaction.user.id)
        },
        {
          name: 'Command',
          value: 'Activity'
        },
        {
          name: 'Role',
          value: roleMention(role.id)
        }
      )
      .setFooter({ text: interaction.id })
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.warn(`Failed to log button interaction ${interaction.id}: ${interaction.customId}\n${error}`);
    }
  }
}

async function handleSubjectButton (interaction: ButtonInteraction, args: string[]): Promise<void> {
  const guild = interaction.guild;

  if (guild === null) {
    logger.warn(`Received button interaction ${interaction.id}: ${interaction.customId} from ${interaction.user.tag} outside of a guild`);
    return;
  }

  const role = guild.roles.cache.find((r) => r.name === args[0]);
  const member = interaction.member;

  if (role === undefined) {
    logger.warn(`The role was not found for interaction ${interaction.id}: ${interaction.customId}`);
    return;
  }

  // @ts-expect-error The member cannot be null
  const memberRoles = member.roles as GuildMemberRoleManager;

  if (memberRoles.cache.has(role.id)) {
    await memberRoles.remove(role);
  } else {
    await memberRoles.add(role);
  }

  try {
    await interaction.deferUpdate();
  } catch (error) {
    logger.warn(`Failed to respond to button interaction ${interaction.id}: ${interaction.customId}\n${error}`);
    return;
  }

  if (interaction.channel !== null && interaction.channel.type === ChannelType.GuildText) {
    const embed = new EmbedBuilder()
      .setColor(getFromBotConfig('color'))
      .setTitle('Button')
      .setAuthor({
        // @ts-expect-error The member cannot be null
        iconURL: interaction.member.displayAvatarURL(),
        name: interaction.user.tag
      })
      .addFields(
        {
          name: 'Author',
          value: userMention(interaction.user.id)
        },
        {
          name: 'Command',
          value: 'Subject'
        },
        {
          name: 'Role',
          value: roleMention(role.id)
        }
      )
      .setFooter({ text: interaction.id })
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.warn(`Failed to log button interaction ${interaction.id}: ${interaction.customId}\n${error}`);
    }
  }
}

async function handleProgramButton (interaction: ButtonInteraction, args: string[]): Promise<void> {
  const guild = interaction.guild;

  if (guild === null) {
    logger.warn(`Received button interaction ${interaction.id}: ${interaction.customId} from ${interaction.user.tag} outside of a guild`);
    return;
  }

  if (programRoles.length === 0) {
    const roles = getFromRoleConfig('program').map((r) => guild.roles.cache.find((ro) => ro.name === r));

    if (roles === undefined || roles.includes(undefined)) {
      logger.warn(`One or more roles for button interaction ${interaction.id}: ${interaction.customId} were not found`);
      return;
    }

    programRoles = roles as Role[];
  }

  const role = guild.roles.cache.find((r) => r.name === args[0]);
  const member = interaction.member;

  if (role === undefined) {
    logger.warn(`The role was not found for interaction ${interaction.id}: ${interaction.customId}`);
    return;
  }

  // @ts-expect-error The member cannot be null
  const memberRoles = member.roles as GuildMemberRoleManager;

  if (memberRoles.cache.has(role.id)) {
    await memberRoles.remove(role);
  } else {
    await memberRoles.remove(programRoles);
    await memberRoles.add(role);
  }

  try {
    await interaction.deferUpdate();
  } catch (error) {
    logger.warn(`Failed to respond to button interaction ${interaction.id}: ${interaction.customId}\n${error}`);
    return;
  }

  if (interaction.channel !== null && interaction.channel.type === ChannelType.GuildText) {
    const embed = new EmbedBuilder()
      .setColor(getFromBotConfig('color'))
      .setTitle('Button')
      .setAuthor({
        // @ts-expect-error The member cannot be null
        iconURL: interaction.member.displayAvatarURL(),
        name: interaction.user.tag
      })
      .addFields(
        {
          name: 'Author',
          value: userMention(interaction.user.id)
        },
        {
          name: 'Command',
          value: 'Program'
        },
        {
          name: 'Role',
          value: roleMention(role.id)
        }
      )
      .setFooter({ text: interaction.id })
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.warn(`Failed to log button interaction ${interaction.id}: ${interaction.customId}\n${error}`);
    }
  }
}
