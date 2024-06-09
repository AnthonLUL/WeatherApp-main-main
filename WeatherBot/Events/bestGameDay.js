const { getWeatherForecast, analyzeForecast, formatForecastDetails, formatDate } = require('../WeatherAPI');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    execute(message, db) {
        if (message.content.startsWith('!bestgameday')) {
            const taggedUsers = message.mentions.users;
            findWorstGamingDay(db, message, taggedUsers);
        }
    }
};

function fetchUserDataForTaggedUsers(taggedUsers, db) {
    return new Promise((resolve, reject) => {
        const userData = [];
        const promises = [];
        for (const user of taggedUsers.values()) {
            promises.push(new Promise((resolve, reject) => {
                // Fetch user data from the database based on the tagged users
                db.get('SELECT * FROM Users WHERE UserID = ?', [user.id], (err, row) => {
                    if (err) {
                        console.error('Error fetching user data:', err);
                        reject(err);
                    } else {
                        console.log('Fetched user data:', row);
                        userData.push(row);
                        resolve();
                    }
                });
            }));
        }
        Promise.all(promises)
            .then(() => resolve(userData))
            .catch(reject);
    });
}

async function fetchAllUserData(db) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM Users', (err, rows) => {
            if (err) {
                console.error('Error retrieving users from database:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function findWorstGamingDay(db, message, taggedUsers) {
    if (taggedUsers.size > 0) {
        try {
            // Fetch user data only for tagged users
            const userData = await fetchUserDataForTaggedUsers(taggedUsers, db);
            console.log('userData:', userData); // Debug statement

            const userWorstTimes = await fetchUserWorstTimes(userData);
            const aggregatedWorstTimes = aggregateWorstTimes(userWorstTimes);
            const embedMessage = createEmbedMessage(userWorstTimes, aggregatedWorstTimes);
            message.channel.send({ embeds: [embedMessage] });
        } catch (error) {
            console.error('Error fetching user data for tagged users:', error);
        }
    } else {
        try {
            // Fetch user data for all users in the database
            const userData = await fetchAllUserData(db);
            console.log('userData:', userData); // Debug statement

            const userWorstTimes = await fetchUserWorstTimes(userData);
            const aggregatedWorstTimes = aggregateWorstTimes(userWorstTimes);
            const embedMessage = createEmbedMessage(userWorstTimes, aggregatedWorstTimes);
            message.channel.send({ embeds: [embedMessage] });
        } catch (error) {
            console.error('Error fetching all user data:', error);
        }
    }
}

async function fetchUserWorstTimes(userData) {
    const userWorstTimes = [];
    for (const user of userData) {
        try {
            // Check if the city name is not undefined or null
            if (user.City) {
                const forecast = await getWeatherForecast(user.City);
                const worstTimes = analyzeForecast(forecast);
                userWorstTimes.push({ user, worstTimes });
            } else {
                console.error('City name is undefined or null for user:', user);
            }
        } catch (error) {
            console.error('Error fetching forecast for user:', user, error);
        }
    }
    return userWorstTimes;
}

function aggregateWorstTimes(userWorstTimes) {
    const commonWorstDays = {};

    userWorstTimes.forEach(userTime => {
        userTime.worstTimes.forEach(time => {
            const dateKey = formatDate(time.date); // Group by date

            if (!commonWorstDays[dateKey]) {
                commonWorstDays[dateKey] = { count: 0, users: [], condition: time.condition, temp: time.temp };
            }

            commonWorstDays[dateKey].count++;
            commonWorstDays[dateKey].users.push(userTime.user.Username);
        });
    });

    const worstDay = Object.entries(commonWorstDays).reduce((worst, [date, value]) => {
        if (value.count > (worst.count || 0)) {
            return { date, count: value.count, users: value.users, condition: value.condition, temp: value.temp };
        }
        return worst;
    }, {});

    return worstDay;
}

function createEmbedMessage(userWorstTimes, worstDay) {
    const embed = new EmbedBuilder()
        .setTitle('Worst Gaming Day')
        .setDescription(`The best day to game together is on **${worstDay.date}** with ${worstDay.count} people affected and weather condition: ${worstDay.condition}, ${worstDay.temp}°C.`)
        .setColor('#1079b5');

    userWorstTimes.forEach(userTime => {
        const userDetails = `${userTime.user.Username} (${userTime.user.City}, ${userTime.user.Country}):\n`;
        const forecastDetails = formatForecastDetails(userTime.worstTimes);
        embed.addFields({ name: userDetails, value: forecastDetails });
    });

    return embed;
}
