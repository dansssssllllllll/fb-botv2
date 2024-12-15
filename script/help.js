module.exports["config"] = {
    name: 'help',
    version: '1.0.0',
    role: 0,
    isPrefix: false,
    type: "guide",
    aliases: ['info',
        'menu'],
    info: "Beginner's guide",
    usage: "[page-number/commandname/all]",
    credits: 'Developer',
};

module.exports["run"] = async ({
    api, event, Utils, prefix, args, chat, font
}) => {
    var mono = txt => font.thin(txt);
    const input = args.join(' ').trim()?.toLowerCase();
    const allCommands = [...Utils.commands.values()];
    const perPage = 50;
    const totalCommands = allCommands.length;

    if (!input) {
        let helpMessage = font.bold(`📚 | CMD LIST: 〔${prefix || 'NO PREFIX'}〕\n`);
        helpMessage += font.bold(`TOTAL COMMANDS: ${totalCommands}\n\n`);

        const firstPageCommands = allCommands.slice(0, perPage);
        firstPageCommands.forEach((command, index) => {
            const {
                name, info, usage
            } = command;
            helpMessage += `\t${index + 1}. ${name} ${usage ? `${usage}`: ''}\n`;
        });

        /*  helpMessage += `\n• To see all commands, use '${prefix || ''}HELP ALL'\n`;*/
        helpMessage += `\n• To see another page, use "HELP" [page-number]'\n`;
        helpMessage += `• For more information use "HELP" [cmd name]"\n\n`;
        helpMessage += font.bold(`NOTE: NOT FOR SALE!`) + "\n- This bot is intended to be provided free of charge. The sale of any aspect of our service is strictly prohibited. If you encounter any instances of this bot being sold or any bugs, please contact us at lkpanio25@gmail.com. We also accept donations via GCash in any amount to help maintain the bot's availability 24/7. Thank you for your support.";
        await chat.reply(mono(helpMessage) + font.bold("\nPROJECT MAINTAINER: ") + "https://www.facebook.com/haji.atomyc2727" + font.bold("\nAUTOBOT LINK: ") + "https://tinyurl.com/2cojhmk2" + font.bold("\nGCASH NUMBER: ") + "09468377615");
        const url_array = [
            "https://files.catbox.moe/b5csz8.gif",
            "https://files.catbox.moe/3irbyb.gif",
            "https://files.catbox.moe/sh85xf.gif",
            "https://files.catbox.moe/0q7egf.gif",
            "https://files.catbox.moe/s7c7ka.gif",
            "https://files.catbox.moe/kfnbg5.gif",
            "https://files.catbox.moe/u9cd8m.gif",
            "https://files.catbox.moe/7qab3k.gif"
        ];
        const url = await chat.stream(url_array[Math.floor(Math.random() * url_array.length)]);
        if (url) {
            chat.reply({
                attachment: url
            });
        }
    }/* else if (input === 'all') {
    let helpMessage = font.bold(`📚 | CMD LIST 〔${prefix || 'NO PREFIX'}〕\n`);
    helpMessage += `TOTAL COMMANDS: ${totalCommands}\n\n`;

    allCommands.forEach((command, index) => {
      const { name, info, usage } = command;
      helpMessage += `\t${index + 1}. ${name} ${usage ? `${usage}` : ''}\n`;
    });
    helpMessage += `\n• For more information use "HELP [cmd name]"`;

    let ireply = await chat.reply(mono(helpMessage));
    ireply.unsend(120000);
  }*/ else if (!isNaN(input)) {
        const page = parseInt(input);
        const totalPages = Math.ceil(totalCommands / perPage);

        if (page < 1 || page > totalPages) {
            let ireply = await chat.reply(mono(`INVALID PAGE NUMBER. PLEASE SPECIFY PAGE 1 UP TO ${totalPages}.`));
            ireply.unsend(5000);
            return;
        }

        const startIndex = (page - 1) * perPage;
        const endIndex = Math.min(startIndex + perPage, totalCommands);
        const commandsOnPage = allCommands.slice(startIndex, endIndex);

        let helpMessage = font.bold(`📚 | CMD LIST ${page}-${totalPages}\n`);
        helpMessage += font.bold(`TOTAL COMMANDS: ${totalCommands}\n\n`);

        commandsOnPage.forEach((command, index) => {
            const {
                name, info, usage
            } = command;
            helpMessage += `\t${startIndex + index + 1}. ${name} ${usage ? `${usage}`: ''}\n`;
        });

        helpMessage += `\n• To see another page, use 'HELP [page-number]'\n`;
        helpMessage += `• For more information use "HELP [cmd name]"`;
        let ireply = await chat.reply(mono(helpMessage));
        ireply.unsend(60000);
    } else {
        const selectedCommand = allCommands.find(command => {
            const aliases = command?.aliases || [];
            return command.name?.toLowerCase() === input || aliases?.includes(input);
        });

        if (selectedCommand) {
            const {
                name,
                version,
                role,
                aliases = [],
                info,
                usage,
                isPrefix,
                guide,
                credits,
                cd
            } = selectedCommand;

            const nameMessage = name ? `NAME: ${name}\n`: '';
            const versionMessage = version ? `VERSION: ${version}\n`: '';
            const roleMessage = role !== undefined ? (role === 0 ? 'ROLE: User': (role === 1 ? 'ROLE: Bot-admin owner': (role === 2 ? 'ROLE: Group admins': (role === 3 ? 'ROLE: Super admins/moderators': '')))): '';
            const aliasesMessage = aliases.length ? `\nALIASES: ${aliases.join(', ')}\n`: '';
            const prefixMessage = isPrefix
            ? `PREFIX: Required to use ${prefix || ''}\n`: 'PREFIX: Not Required\n';
            const descriptionMessage = info ? `INFO: ${info}\n`: '';
            const usageMessage = usage ? `USAGE: ${usage}\n`: '';
            const guideMessage = guide ? `GUIDE: ${guide}\n`: '';
            const creditsMessage = credits ? `CREDITS: ${credits}\n`: '';
            const cooldownMessage = cd ? `COOLDOWN: ${cd} second(s)\n`: '';

            const message = `COMMAND DETAILS\n\n` + nameMessage + versionMessage + roleMessage + aliasesMessage + prefixMessage + descriptionMessage + usageMessage + guideMessage + creditsMessage + cooldownMessage;
            let ireply = await chat.reply(mono(message));
            ireply.unsend(40000);
        } else {
            let ireply = await chat.reply(mono(`COMMAND '${input}' NOT FOUND. USE 'HELP' TO SEE ALL COMMANDS`));
            ireply.unsend(10000);
        }
    }
};


module.exports["handleEvent"] = async ({
    api, event, prefix, chat, font
}) => {
    const {
        threadID,
        messageID,
        body
    } = event;
    try {

        const message = prefix ? `PREFIX > ["${prefix}"]`: `KOKORO AI SYSTEM > ["NO PREFIX"]`;

        const url_array = [
            "https://files.catbox.moe/gv8exy.gif",
            "https://files.catbox.moe/7wtf0h.gif"
        ];
        const url = await chat.stream(url_array[Math.floor(Math.random() * url_array.length)]);

        if (["prefix", "system"].includes(body?.toLowerCase())) {
            let ireply = await chat.reply({
                body: font.thin(message), attachment: url
            });
        }
    } catch (error) {
        console.error(error.message);
    };
}
