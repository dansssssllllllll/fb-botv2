const axios = require('axios');

module.exports["config"] = {
  name: "autobot",
  aliases: ["fbbot"],
  info: "This command makes your account a bot",
  type: "tools",
  usage: "online [paging] or create [owner_uid] [prefix] [appstate]",
  version: "1.0.0",
  credits: "mark hitsuraan",
  role: 0,
};

module.exports["run"] = async ({ api, chat, event, args, font, global }) => {
  const server = global.host.server[0] + ":" + global.host.port;
  const tin = txt =>
   font.monospace(txt);
  const input = args[0];
  let inputState = args.slice(3).join(" ");
  const inputPrefix = args[2] || "";
  const inputAdmin = args[1] || "";
  const page = parseInt(args[1]) || 0;
  const pageSize = 10;

  if (!input) {
    chat.reply(tin(`Autobot usage:\n\nTo create bot use "Autobot create [owner or admin-uid] [prefix] [appstate]"\n\nTo see active list "Autobot [online] [page_number]"`), event.threadID, event.messageID);
    return;
  }

  if (input === "online") {
    try {
      const checking = await chat.reply(tin("⏳ Checking active session, please wait..."));
      const url = `${server}/info`;
      const response = await axios.get(server);
      const aiList = response.data;

      if (Array.isArray(aiList)) {
        const totalPages = Math.ceil(aiList.length / pageSize);
        const currentPage = Math.min(Math.max(page, 1), totalPages); // Ensure page number is within valid range
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedList = aiList.slice(startIndex, endIndex);

        let message = paginatedList.map((result, index) => {
          const { name, profileUrl, time } = result;
          const days = Math.floor(time / (3600 * 24));
          const hours = Math.floor((time % (3600 * 24)) / 3600);
          const minutes = Math.floor((time % 3600) / 60);
          const seconds = Math.floor(time % 60);
          return `[ ${startIndex + index + 1} ]\n𝗡𝗔𝗠𝗘: ${name}\n𝗨𝗣𝗧𝗜𝗠𝗘: ${days} days ${hours} hours ${minutes} minutes ${seconds} seconds\n\n`;
        }).join('');

        message += `Page ${currentPage} of ${totalPages}\nUse "Autobot online [page_number]" to view other pages.`;
        chat.reply(tin(`List of Active Bots.\n\n${message}`), event.threadID, event.messageID);
      } else {
        chat.reply(tin("Handle error: aiList is not an array"), event.threadID, event.messageID);
      }
    } catch (err) {
      chat.reply(tin(err.message), event.threadID, event.messageID);
    }
  } else if (input === "create") {
    if (event.type === "message_reply" && event.messageReply.body) {
      inputState = event.messageReply.body;
    }
    try {
      const states = JSON.parse(inputState);
      if (states && typeof states === 'object') {
        const making = await chat.reply(tin("⏳ Making your account as a bot, please wait..."));
        const response = await axios.post(`${server}/login`, {
          state: states,
          prefix: inputPrefix,
          admin: inputAdmin,
        });
        const data = response.data;
        if (data.success === 200) {
          making.edit(tin(data.message));
        } else {
          making.edit(tin(data.message));
        }
      } else {
        chat.reply(tin('Under development, not fully stable. I hope you understand. :>'), event.threadID, event.messageID);
      }
    } catch (parseErr) {
      chat.reply(tin(parseErr.message), event.threadID, event.messageID);
    }
  }
};