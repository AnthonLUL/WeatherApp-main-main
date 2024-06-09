const { getCurrentWeather, getWeatherForecast, analyzeForecast, formatForecastDetails, formatDate } = require('../WeatherAPI');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    execute(message, db) {
        if (message.content.startsWith('!weather')) {
            const user = message.author;
            fetchUserWeather(db, message, user);
        }
    }
};

function fetchUserData(userId, db) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM Users WHERE UserID = ?', [userId], (err, row) => {
            if (err) {
                console.error('Error fetching user data:', err);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function fetchUserWeather(db, message, user) {
    try {
        const userData = await fetchUserData(user.id, db);
        if (!userData || !userData.City) {
            message.channel.send('City name is undefined or null for user.');
            return;
        }

        const forecast = await getWeatherForecast(userData.City);

        if (!forecast || !forecast.list || !forecast.list.length) {
            message.channel.send('Unable to retrieve weather forecast data.');
            return;
        }

        const analyzedForecast = analyzeForecast(forecast);

        const embedMessage = createWeatherEmbedMessage(userData, analyzedForecast);
        message.channel.send({ embeds: [embedMessage] });
    } catch (error) {
        console.error('Error fetching weather data for user:', error);
        message.channel.send('There was an error fetching the weather data.');
    }
}

function createWeatherEmbedMessage(userData, analyzedForecast) {
    const embed = new EmbedBuilder()
        .setTitle(`Weather Forecast for ${userData.City}`)
        .setDescription(`Here is the weather forecast for today and the upcoming week for ${userData.City}, ${userData.Country}.`)
        .setColor('#1079b5');

    // Forecast Details
    analyzedForecast.forEach(forecast => {
        embed.addFields(
            { name: formatDate(new Date(forecast.date)), value: formatForecastDetails([forecast]) }
        );
    });

    return embed;
}
