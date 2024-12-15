const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "sharecmd",//update
  aliases: ["cmdshare"],
  usage: "[filename.js] [optional: UID or link fb profile]",
  info: "Share a JavaScript command file with an optional target user or thread ID.",
  guide: "sharecmd [filename.js] [optional: UID or link fb profile] to share the JavaScript command file. Example: `sharecmd mycommand.js` or `sharecmd mycommand.js 123456789`.",
  type: "sharing",
  credits: "Kenneth Panio",
  version: "1.0.0",
  role: 3,
};

module.exports["run"] = async ({ chat, args, font, event }) => {
  if (args.length < 1 || args.length > 2) {
    return chat.reply(font.monospace('Invalid command format. Use `sharecmd [filename.js] [optional: UID or link fb profile]`.'));
  }

  const fileName = args[0];
  const filePath = path.join(__dirname, fileName);

  try {
    if (!fileName.endsWith('.js')) {
      return chat.reply(font.monospace('Invalid file extension. Please provide a .js file.'));
    }

    if (!fs.existsSync(filePath)) {
      return chat.reply(font.monospace(`File ${fileName} does not exist.`));
    }

    const cacheFolderPath = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheFolderPath)) {
      fs.mkdirSync(cacheFolderPath);
    }
    const txtFilePath = path.join(cacheFolderPath, `${fileName.replace('.js', '.txt')}`);

    fs.copyFileSync(filePath, txtFilePath);

    const fileStream = fs.createReadStream(txtFilePath);

    if (args.length === 2) {
      const target = args[1];

      const facebookLinkRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?(\d+)|@(\d+)|facebook\.com\/([a-zA-Z0-9.]+)/i;
      const isFacebookLink = facebookLinkRegex.test(target);

      let uid;
      if (isFacebookLink) {
        uid = await chat.uid(target);
      } else {
        uid = target;
      }

      await chat.reply({ body: font.monospace("Shared CMD From: " + event.senderID), attachment: fileStream }, uid);
      await chat.reply("Successfully Shared CMD to: " + uid)
    } else {
      
      await chat.reply({ body: font.monospace("Shared CMD"), attachment: fileStream });
    }

    fileStream.close();

    fs.unlinkSync(txtFilePath);

  } catch (error) {
    chat.reply(font.monospace(`Can't Send Attachment bot is restricted. Can't use this feature.`));
  }
};
