const axios = require("axios");
const devs = require(__dirname.replace("/script", "") + '/system/api');
//https://kaiz-apis.gleeze.com/api/gpt-4o-pro?q=&uid=

module.exports["config"] = {
  name: "ai",
  version: "4.8",
  role: 0,
  credits: "Markdevs69",
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
  axios.get(`${devs.kaiz}/api/gpt-4o-pro?q=${encodeURIComponent(content)}&uid=${uid}`)
    .then(response => {
      if (response.data.response) {
        const aiResponse = response.data.response.replace(/\*\*(.*?)\*\*/g, (_, text) => fonts.bold(text)).replace(/TOOL_CALL:/g, '');
        const endTime = new Date();
  const time = (endTime - startTime) / 10000;
  const TIMES = fonts.monospace(`${time.toFixed(2)}s`);
        api.sendMessage(`   ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎  ‎${TIMES}\n\n${aiResponse}\n\nCHAT ID: ${uid}`, event.threadID, event.messageID); 
        
      } else {
        api.sendMessage("No response from Meta", event.threadID, event.messageID);
      }
    })
    .catch(error => {
      console.error("🤖 Error:", error);
      api.sendMessage("An error occurred while processing your request, Please try again later.", event.threadID, event.messageID);
    });
};