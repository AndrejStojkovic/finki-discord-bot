import { getListLinksEmbed, getListQuestionsEmbed } from '../utils/embeds.js';
import { commands } from '../utils/strings.js';
import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

const name = 'list';

export const data = new SlashCommandBuilder()
  .setName(name)
  .setDescription('List')
  .addSubcommand((command) =>
    command.setName('questions').setDescription(commands['list questions']),
  )
  .addSubcommand((command) =>
    command.setName('links').setDescription(commands['list links']),
  );

const handleListQuestions = async (
  interaction: ChatInputCommandInteraction,
) => {
  const embed = getListQuestionsEmbed();
  await interaction.editReply({ embeds: [embed] });
};

const handleListLinks = async (interaction: ChatInputCommandInteraction) => {
  const embed = getListLinksEmbed();
  await interaction.editReply({ embeds: [embed] });
};

const listHandlers = {
  links: handleListLinks,
  questions: handleListQuestions,
};

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand(true);

  if (Object.keys(listHandlers).includes(subcommand)) {
    await listHandlers[subcommand as keyof typeof listHandlers](interaction);
  }
};
