import { getStudentInfoEmbed } from '../utils/embeds.js';
import { commands } from '../utils/strings.js';
import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

const name = 'profile';

export const data = new SlashCommandBuilder()
  .setName(name)
  .setDescription(commands[name])
  .addUserOption((option) =>
    option.setName('user').setDescription('Корисник').setRequired(false),
  )
  .setDMPermission(false);

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const member = interaction.guild?.members.cache.get(
    (interaction.options.getUser('user') ?? interaction.user).id,
  );
  const embed = getStudentInfoEmbed(member);
  await interaction.editReply({ embeds: [embed] });
};
