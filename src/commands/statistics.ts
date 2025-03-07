import { splitMessage } from '../utils/functions.js';
import { getRoles } from '../utils/roles.js';
import { commands } from '../utils/strings.js';
import {
  type ChatInputCommandInteraction,
  roleMention,
  SlashCommandBuilder,
  userMention,
} from 'discord.js';

const name = 'statistics';

export const data = new SlashCommandBuilder()
  .setName(name)
  .setDescription('Color')
  .addSubcommand((command) =>
    command.setName('color').setDescription(commands['statistics color']),
  )
  .addSubcommand((command) =>
    command.setName('program').setDescription(commands['statistics program']),
  )
  .addSubcommand((command) =>
    command.setName('year').setDescription(commands['statistics year']),
  )
  .addSubcommand((command) =>
    command.setName('course').setDescription(commands['statistics course']),
  )
  .addSubcommand((command) =>
    command
      .setName('notification')
      .setDescription(commands['statistics notification']),
  )
  .addSubcommand((command) =>
    command.setName('server').setDescription(commands['statistics server']),
  )
  .setDMPermission(false);

export const execute = async (interaction: ChatInputCommandInteraction) => {
  if (interaction.guild === null) {
    return;
  }

  await interaction.guild.members.fetch();

  const subcommand = interaction.options.getSubcommand(true);

  if (
    subcommand === 'color' ||
    subcommand === 'program' ||
    subcommand === 'year' ||
    subcommand === 'course' ||
    subcommand === 'notification'
  ) {
    const roles = getRoles(
      interaction.guild,
      subcommand === 'course' ? 'courses' : subcommand,
    );
    const output = roles
      .sort((a, b) => b.members.size - a.members.size)
      .map((role) => `${roleMention(role.id)}: ${role.members.size}`);

    if (subcommand === 'course') {
      let followUp = false;

      for (const message of splitMessage(output.join('\n'))) {
        if (followUp) {
          await interaction.followUp({
            allowedMentions: { parse: [] },
            content: message,
          });
        } else {
          await interaction.editReply({
            allowedMentions: { parse: [] },
            content: message,
          });
        }

        followUp = true;
      }

      return;
    }

    await interaction.editReply({
      allowedMentions: { parse: [] },
      content: output.join('\n'),
    });
  } else {
    const output = [];

    output.push(`Име: ${interaction.guild?.name}`);
    output.push(
      `Сопственик: ${
        interaction.guild === null
          ? '-'
          : userMention(interaction.guild?.ownerId)
      }`,
    );
    output.push(`Членови: ${interaction.guild?.memberCount}`);
    await interaction.guild?.channels.fetch();
    output.push(`Канали: ${interaction.guild?.channels.cache.size}`);
    output.push(
      `Канали (без нишки): ${
        interaction.guild?.channels.cache.filter(
          (channel) => !channel.isThread(),
        ).size
      } / 500`,
    );
    await interaction.guild?.roles.fetch();
    output.push(`Улоги: ${interaction.guild?.roles.cache.size} / 250`);
    await interaction.guild?.emojis.fetch();
    output.push(`Емоџиња: ${interaction.guild?.emojis.cache.size} / 50`);
    await interaction.guild?.stickers.fetch();
    output.push(`Стикери: ${interaction.guild?.stickers.cache.size} / 5`);
    await interaction.guild?.invites.fetch();
    output.push(`Покани: ${interaction.guild?.invites.cache.size}`);

    await interaction.editReply({
      allowedMentions: { parse: [] },
      content: output.join('\n'),
    });
  }
};
