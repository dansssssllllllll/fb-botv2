const axios = require("axios");
const devs = require(__dirname.replace("/script", "") + '/system/api');

//https://markdevs-last-api-s7d0.onrender.com/genuines-ai?name=Aristotle&question=hi

module.exports["config"] = {
  name: "ludwig",
  version: "4.8",
  role: 0,
  credits: "Markdevs69",
  aliases: ["Ludwig","LUDWIG"],
  usage: "[prompt]",
  cd: 3,
};

module.exports["run"] = async function ({ api, event, args, fonts }) {
  const startTime = new Date();

  if (args.length === 0) {
    api.sendMessage("Please provide a question first.", event.threadID, event.messageID);
    return;
  }
  const content = args.join(" ");
  const uid = event.senderID;
  const character = "Ludwig van Beethoven";
  axios.get(`${devs.markdevs69}/genuines-ai?name=${character}&question=${encodeURIComponent(content)}`)
    .then(response => {
      if (response.data.result) {
        const aiResponse = response.data.result.replace(/\*\*(.*?)\*\*/g, (_, text) => fonts.bold(text));
        const endTime = new Date();
  const time = (endTime - startTime) / 10000;
  const TIMES = fonts.monospace(`${time.toFixed(2)}s`);
        api.sendMessage(`👤 | 𝗟𝗨𝗗𝗪𝗜𝗚 ‎ ‎ ‎ ‎ ‎    ‎ ‎ ‎  ‎  /‎${TIMES}\n\n${aiResponse}\n\nCHAT ID: ${uid}`, event.threadID, event.messageID); 

      } else {
        api.sendMessage("No response from ai", event.threadID, event.messageID);
      }
    })
    .catch(error => {
      console.error("🤖 Error:", error);
      api.sendMessage("An error occurred while processing your request, Please try again later.", event.threadID, event.messageID);
    });
};