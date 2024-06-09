const axios = require('axios');
const { openCageApiKey } = require('../config.json');

module.exports = {
    name: 'messageCreate',
    execute(message, db) {
        if (message.content.startsWith('!setlocation')) {
            const argsString = message.content.slice('!setlocation'.length).trim();
            const args = argsString.split(',').map(arg => arg.trim());

            let city, state, country;

            if (args.length === 2) {
                [city, country] = args;
            } else if (args.length === 3) {
                [city, state, country] = args;
            } else {
                message.channel.send('Please provide a city and country, or city, state, and country.');
                return;
            }

            const userId = message.author.id;
            const username = message.author.username;

            //console.log('UserID:', userId);
            //console.log('Username:', username);
            //console.log('City:', city);
            //console.log('State:', state);
            //console.log('Country:', country);

            // Validate the location using the OpenCage API
            const query = `${city}, ${state ? state + ', ' : ''}${country}`;
            console.log('Querying OpenCage API with:', query);
            axios.get(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${openCageApiKey}`)
                .then(response => {
                    const data = response.data;
                    console.log('OpenCage API response:', data);

                    // Check if the response contains valid results
                    if (data.results.length === 0) {
                        message.channel.send('The provided location is not valid. Please provide a valid city and country.');
                        return;
                    }

                    // Check if there's a high confidence level for the provided query
                    const highConfidenceResult = data.results.find(result => result.confidence <= 4);
                    if (!highConfidenceResult) {
                        message.channel.send('The provided location is not valid. Please provide a valid city and country.');
                        return;
                    }

                    // Check if the user already exists in the database
                    db.get('SELECT * FROM Users WHERE UserID = ?', [userId], (err, row) => {
                        if (err) {
                            console.error('Error checking user existence:', err);
                            message.channel.send('An error occurred while checking user existence.');
                            return;
                        }

                        if (row) {
                            // User already exists
                            message.channel.send(`You already have a location set: ${row.City}, ${row.Country}. You can update your location with !updatelocation.`);
                        } else {
                            // User does not exist, insert their location
                            db.run('INSERT INTO Users (UserID, Username, City, State, Country) VALUES (?, ?, ?, ?, ?)', 
                                [userId, username, city, state, country],
                                (err) => {
                                    if (err) {
                                        console.error('Error storing location in database:', err);
                                        message.channel.send('An error occurred while storing your location.');
                                    } else {
                                        message.channel.send(`Your location has been set to ${city}, ${state ? state + ', ' : ''}${country}.`);
                                    }
                                }
                            );
                        }
                    });
                })
                .catch(error => {
                    console.error('Error validating location:', error);
                    message.channel.send('An error occurred while validating the location. Please try again later.');
                });
        }
    }
};
