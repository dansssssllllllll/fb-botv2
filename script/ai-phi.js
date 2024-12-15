const axios = require("axios");
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "phi",
  isPrefix: false,
  aliases: ["phi2", "phi-2", "Microsoft-ai"],
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with PHI-2 AI. Multi-variations model.",
  usage: "[prompt]",
  guide: "phi How does nuclear fusion work?",
  cd: 6
};

const conversationHistories = {};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
  var { url, key, models } = global.api.workers;
  
  var openchat_model = models.openchat[3];
  var name = openchat_model.split('/').pop().toUpperCase();
  
  var mono = txt => font.monospace(txt);
  const { threadID, senderID } = event;
  const query = args.join(" ");

  if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
    conversationHistories[senderID] = [];
    chat.reply(mono("Conversation history cleared."));
    return;
  }

  if (!query) {
    chat.reply(mono("Please provide a question!"));
    return;
  }

  const answering = await chat.reply(mono("🕐 | Answering..."));

  conversationHistories[senderID] = conversationHistories[senderID] || [];
  conversationHistories[senderID].push({ role: "user", content: query });

  const getResponse = async () => {
    return axios.post(url + openchat_model, {
      messages: conversationHistories[senderID]
    }, {
      headers: {
        'Authorization': 'Bearer ' + atob(key),
        'Content-Type': 'application/json',
        'User-Agent': randomUseragent.getRandom()
      }
    });
  };

  const maxRetries = 3;
  let attempts = 0;
  let success = false;
  let answer = "Under Maintenance!\n\nPlease use other models get started with 'help'";

  while (attempts < maxRetries && !success) {
    try {
      const response = await getResponse();
      answer = response.data.result.response;
      success = true;
    } catch (error) {
      attempts++;
      if (attempts < maxRetries) {
        await answering.edit(mono(`No response from Phi-2 AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      } else {
         answering.edit(mono("No response from Phi-2 AI. Please try again later: " + error.message));
        return;
      }
    }
  }

  if (success) {
    conversationHistories[senderID].push({ role: "assistant", content: answer });

    const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
    const line = "\n" + '━'.repeat(18) + "\n";
    
    answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
    
    const message = font.bold(" 🤖 | " + name) + line + answer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.`);

    await answering.edit(message);

    if (codeBlocks.length > 0) {
      const allCode = codeBlocks.map(block => block.replace(/```/g, '').trim()).join('\n\n\n');
      const cacheFolderPath = path.join(__dirname, "cache");

      if (!fs.existsSync(cacheFolderPath)) {
        fs.mkdirSync(cacheFolderPath);
      }

      const uniqueFileName = `code_snippet_${Math.floor(Math.random() * 1e6)}.txt`;
      const filePath = path.join(cacheFolderPath, uniqueFileName);

      fs.writeFileSync(filePath, allCode, 'utf8');

      const fileStream = fs.createReadStream(filePath);
      await chat.reply({ attachment: fileStream });

      fs.unlinkSync(filePath);
    }
  }
};
