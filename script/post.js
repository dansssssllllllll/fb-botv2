const axios = require('axios');

module.exports["config"] = {
    name: "post",
    version: "1.0.0",
    role: 1,
    credits: "kennethpanio",
    info: "Post multiple pictures using bot",
    type: "utility",
    usage: "[reply with attachment or provide URL in args]",
    guide: "reply with an image attachment with caption or provide the caption directly",
    cd: 10,
};

module.exports["run"] = async ({ chat, event, args, font, prefix }) => {
    const mono = txt => font.monospace(txt);

    if (event.type !== "message_reply" && args.length === 0) {
        return chat.reply(mono("Please reply to an image you want to post or provide a text directly."));
    }

    let imageUrls = [];
    let caption = args.join(" ");


    if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {

        imageUrls = event.messageReply.attachments.map(attachment => attachment.url);
    } else if (event.messageReply && event.messageReply.body) {
        caption = event.messageReply.body;
    }


    if (imageUrls.length > 0) {
        const imageStreams = await chat.stream(imageUrls);
        chat.post({ body: caption || '', attachment: imageStreams });
    } else if (caption) {
        chat.post(caption);
    }

    return chat.reply(mono("Successfully posted content!"));
};