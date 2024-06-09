// Events/guildMemberRemove.js
module.exports = {
    name: 'guildMemberRemove',
    execute(member, db) {
        const userId = member.id;

        // Delete the user's location from the database
        db.run('DELETE FROM Users WHERE userId = ?', [userId], (err) => {
            if (err) {
                console.error('Error deleting location from database:', err);
            } else {
                console.log('Location deleted from database for user:', userId);
            }
        });
    }
};
