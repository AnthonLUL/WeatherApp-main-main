const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    execute(message) {
        if (message.content.startsWith('!help')) {
            const embedMessage = createHelpEmbedMessage();
            message.channel.send({ embeds: [embedMessage] });
        }
    }
};

function createHelpEmbedMessage() {
    const embed = new EmbedBuilder()
        .setTitle('Bot Commands')
        .setDescription('Here are the available commands and their uses:')
        .setColor('#1079b5')
        .addFields(
            { name: '!weather', value: 'Fetch the current weather and forecast for your registered city.' },
            { name: '!setlocation [city name], [Country]', value: 'Set your default city for weather updates. If your country has states or provinces, include the state after the city name.' },
            { name: '!updatelocation [city name], [Country]', value: 'Update your default city for weather updates. If your country has states or provinces, include the state after the city name.' },
            { name: '!deletelocation', value: 'Deletes your default city.' },
            { name: '!bestgameday', value: 'Evaluate the best day for gaming based on weather conditions. If used without mentioning any users, considers all users in the database. If used with mentioning one or more users, only considers those users.' },
            { name: '!help', value: 'Display this help message.' }
        );

    return embed;
}
