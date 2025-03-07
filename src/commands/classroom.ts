import { getClassrooms } from '../utils/config.js';
import { getClassroomEmbed } from '../utils/embeds.js';
import { commands } from '../utils/strings.js';
import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

const name = 'classroom';

export const data = new SlashCommandBuilder()
  .setName(name)
  .setDescription(commands[name])
  .addStringOption((option) =>
    option
      .setName('classroom')
      .setDescription('Просторија')
      .setRequired(true)
      .setAutocomplete(true),
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const classroom = interaction.options.getString('classroom', true);
  const [classroomName, classroomLocation] = classroom.split(' ');
  const information = getClassrooms().find(
    (cl) =>
      cl.classroom.toString().toLowerCase() === classroomName?.toLowerCase() &&
      cl.location.toString().toLowerCase() ===
        classroomLocation?.slice(1, -1).toLowerCase(),
  );

  if (information === undefined) {
    const classrooms = getClassrooms().filter(
      (cl) =>
        cl.classroom.toString().toLowerCase() === classroomName?.toLowerCase(),
    );

    const embeds = classrooms.map((cl) => getClassroomEmbed(cl));
    await interaction.editReply({
      embeds,
      ...(embeds.length > 1
        ? {
            content: `Внимание: просторијата ${classroom} постои на повеќе факултети.`,
          }
        : {}),
    });
    return;
  }

  const embed = getClassroomEmbed(information);
  await interaction.editReply({ embeds: [embed] });
};
