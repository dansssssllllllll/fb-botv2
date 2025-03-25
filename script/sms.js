const axios = require("axios");

module.exports["config"] = {
  name: "sms",
  aliases: ["lbcsms", "lbcexpress"],
  isPrefix: false,
  version: "1.0.1",
  credits: "Kenneth Panio",
  role: 0,
  type: "utility",
  info: "Send SMS to a specified PH number.",
  usage: "sms [number] [message]",
  guide: "sms 09123456789 Hello, this is a test message!",
  cd: 10,
};

module.exports["run"] = async ({ chat, args, font, global, event }) => {
  
  const mono = (txt) => font.monospace(txt);

  
  if (args.length < 2) {
    chat.reply(mono("❗ Usage: sms [number] [message]"));
    return;
  }

  let number = args[0];
  const message = args.slice(1).join(" ");

  
  if (number.startsWith("+63")) {
    number = number.slice(3);
  } else if (number.startsWith("63")) {
    number = number.slice(2);
  } else if (number.startsWith("0")) {
    number = number.slice(1);
  }

  if (!/^\d{10}$/.test(number)) {
    chat.reply(mono("❗ Invalid PH phone number. Must be 10 digits starting with 09."));
    return;
  }

  const sending = await chat.reply(mono("🕐 Sending SMS..."));
  
  try {
  
  const response = await axios.get(`https://haji-mix.up.railway.app/api/lbcsms?text=${encodeURIComponent(message)}&number=${number}&from=${"https://facebook.com/" + event.senderID}`);

    sending.edit(mono(response.data.message));
  } catch (error) {
      if (error.response.status === 429) {
         return sending.edit(mono(`You're sending the same message in short amount of time please slow down a bit!`));
      }
    sending.edit(mono(error.response.data.error || error.message));
  }
};
