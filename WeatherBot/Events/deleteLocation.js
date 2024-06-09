// Events/deleteLocation.js
module.exports = {
    name: 'messageCreate',
    execute(message, db) {
        if (message.content.startsWith('!deletelocation')) {
            const userId = message.author.id;

            // Delete the user's location from the database
            db.run('DELETE FROM Users WHERE userId = ?', [userId], (err) => {
                if (err) {
                    console.error('Error deleting location from database:', err);
                    message.channel.send('An error occurred while deleting your location.');
                } else {
                    message.channel.send('Your location has been deleted from the database.');
                }
            });
        }
    }
};
