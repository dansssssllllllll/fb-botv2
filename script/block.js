module.exports["config"] = {
    name: "block",
    info: "Fully block a user from Facebook.",
    isPrefix: true,
    usage: "[mention/uid/profilelink or reply to user]",
    role: 1,
};

module.exports["run"] = async ({ chat, font, event, args }) => {
    try {
        let uid = args[0];

        const fbregex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?(\d+)|@(\d+)|facebook\.com\/([a-zA-Z0-9.]+)/i;
        if (fbregex.test(uid)) {
            uid = await chat.uid(uid);
        } else if (event.mentions.length > 0) {
            uid = event.mentions[0];
        }

        if (event.type === "message_reply") {
            uid = event.messageReply?.senderID;
        }

        if (!uid) {
            return chat.reply(font.thin("Please provide a UID, mention, profile link, or reply to the user you want to block!"));
        }

        if (uid !== chat.botID) {
            await chat.block(uid, 'fb');
            chat.reply(font.thin(`Successfully blocked userID: ${uid}`));
        } else if (uid === chat.botID()) {
            chat.reply(font.thin("Blocking the bot itself is not allowed!"));
        }
    } catch (e) {
        chat.reply(font.thin(e.message));
    }
};