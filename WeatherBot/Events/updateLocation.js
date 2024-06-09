// Events/updateLocation.js
const axios = require('axios');
const { openCageApiKey } = require('../config.json');

module.exports = {
    name: 'messageCreate',
    execute(message, db) {
        if (message.content.startsWith('!updatelocation')) {
            const argsString = message.content.slice('!updatelocation'.length).trim();
            let args = argsString.split(',').map(arg => arg.trim());

            // Check if the first argument is a mention
            const mentionRegex = /<@!?(\d+)>/;
            if (mentionRegex.test(args[0])) {
                args.shift(); // Remove the mention from the arguments array
            }

            let newCity, newState, newCountry;

            if (args.length === 2) {
                [newCity, newCountry] = args;
            } else if (args.length === 3) {
                [newCity, newState, newCountry] = args;
            } else {
                message.channel.send('Please provide a new city and country, or new city, state, and country.');
                return;
            }

            const userId = message.author.id;

            // Check if the message author is an admin
            const isAdmin = message.member.permissions.has('ADMINISTRATOR');

            // Validate the location using the OpenCage API
            const query = `${newCity}, ${newState ? newState + ', ' : ''}${newCountry}`;
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
                    const highConfidenceResult = data.results.find(result => result.confidence <= 5);
                    if (!highConfidenceResult) {
                        message.channel.send('The provided location is not valid. Please provide a valid city and country.');
                        return;
                    }

                    

                    if (isAdmin) {
                        // Check if a user is mentioned
                        const mentionedUser = message.mentions.users.first();
                        if (mentionedUser) {
                            const mentionedUserId = mentionedUser.id;
                            db.run('UPDATE Users SET city = ?, state = ?, country = ? WHERE userId = ?', 
                                [newCity, newState, newCountry, mentionedUserId], 
                                (err) => {
                                    if (err) {
                                        console.error('Error updating location in database:', err);
                                        message.channel.send('An error occurred while updating the user\'s location.');
                                    } else {
                                        message.channel.send(`User's location has been updated to ${newCity}, ${newState ? newState + ', ' : ''}${newCountry}.`);
                                    }
                                }
                            );
                        } else {
                            // Update the location of the message author
                            db.run('UPDATE Users SET city = ?, state = ?, country = ? WHERE userId = ?', 
                                [newCity, newState, newCountry, userId], 
                                (err) => {
                                    if (err) {
                                        console.error('Error updating location in database:', err);
                                        message.channel.send('An error occurred while updating your location.');
                                    } else {
                                        message.channel.send(`Your location has been updated to ${newCity}, ${newState ? newState + ', ' : ''}${newCountry}.`);
                                    }
                                }
                            );
                        }
                    } else {
                        // Handle non-administrator case
                        message.channel.send('You need to be an administrator to update locations.');
                    }
                    
                    
                })
                .catch(error => {
                    console.error('Error validating location:', error);
                    message.channel.send('An error occurred while validating the location. Please try again later.');
                });
        }
    }
};
