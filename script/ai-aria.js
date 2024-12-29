const axios = require('axios');
const crypto = require('crypto');
const randomUseragent = require('random-useragent');

module.exports.config = {
    name: "aria",
    aliases: ["ai"],
    info: "Aria AI",
    usage: "[prompt]",
    credits: "Kenneth Panio",
    version: "1.0.0",
    isPrefix: false,
    cd: 5,
};

async function getAccessToken() {
    const data = new URLSearchParams({
        client_id: 'ofa',
        client_secret: 'I8oKnWWDv68Gr8Z5/Ftv25nK9Vy9CSEW+F0dmGvbamFxqwyaOeBdEOn/ZrQ3Bags',
        grant_type: 'refresh_token',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI4MTY1MTE0NTIiLCJjaWQiOiJvZmEiLCJ2ZXIiOiIyIiwiaWF0IjoxNzI4NjMzNTA1LCJqdGkiOiJYZ0luNWNuSmliMTcyODYzMzUwNSJ9.uJHACRPCwl4JM1_OyC2hSxGXBMILxGdcWJdaLYPmZ9s',
        scope: 'shodan:aria',
    });

    const response = await axios.post('https://oauth2.opera-api.com/oauth2/v1/token/', data, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': randomUseragent.getRandom(ua => ua.browserName === 'Opera'),
        },
    });

    return response.data.access_token;
}

async function queryOperaAPI(query, userId) {
    const token = await getAccessToken();
    const key = crypto.randomBytes(32).toString('base64');

    const payload = {
        query,
        convertational_id: userId,
        stream: true,
        linkify: true,
        linkify_version: 3,
        sia: true,
        supported_commands: [],
        media_attachments: [],
        encryption: {
            key
        },
    };

    const response = await axios.post('https://composer.opera-api.com/api/v1/a-chat', payload, {
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': `Bearer ${token}`,
            'User-Agent': randomUseragent.getRandom(ua => ua.browserName === 'Opera'),
            'x-opera-ui-language': 'en',
            'accept-language': 'en-US',
            'sec-ch-ua': '"OperaMobile";v="86", ";Not A Brand";v="99", "Opera";v="115", "Chromium";v="130"',
            'sec-ch-ua-mobile': '?1',
            'x-opera-timezone': '+08:00',
            origin: 'opera-aria://ui',
            'sec-fetch-site': 'cross-site',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            priority: 'u=1, i',
        },
        responseType: 'stream',
    });

    return new Promise((resolve, reject) => {
        let result = '';
        response.data.on('data', chunk => {
            const match = chunk.toString().match(/"message":"(.*?)"/);
            if (match) {
                .replace(/\\n/g, '\n')
                .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
                .replace(/\\([^\\\s]+)/g, '\n$1').replace(/\\+/g, '');
                result += message;
            }
        });

        response.data.on('end',
            () => {
                resolve(result.trim());
            });

        response.data.on('error',
            err => reject(err));
    });
}

module.exports.run = async ({
    chat, args, font, event
}) => {
    const mono = txt => font.monospace(txt);
    const prompt = args.join(" ");

    if (!prompt) {
        return chat.reply(mono("Please kindly provide your message!"));
    }

    const answering = await chat.reply(mono("Generating response..."));

    try {
        const response = await queryOperaAPI(prompt, event.senderID);
        const formattedAnswer = response.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
        answering.unsend();
        chat.reply(formattedAnswer);
    } catch (error) {
        answering.unsend();
        chat.reply(mono("An error occurred: " + error.message));
    }
};