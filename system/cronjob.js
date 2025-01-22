const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = async ({ api, font }) => {
    // Helper to format text in thinspace if font is available
    const thin = (txt) => font.thin ? font.thin(txt) : txt;

    let threads;
    let pendingThreads;
    try {
        threads = await api.getThreadList(5, null, ['INBOX']);
        pendingThreads = [
            ...(await api.getThreadList(1, null, ['PENDING'])),
            ...(await api.getThreadList(1, null, ['OTHER']))
        ];
    } catch (error) {
        console.error("Error fetching thread list:", error);
        return;
    }

    const configPath = path.resolve(__dirname, '../kokoro.json');
    let config;
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (!config || typeof config !== 'object') {
            throw new Error("Invalid configuration file.");
        }
    } catch (error) {
        console.error("Error reading config file:", error);
        return;
    }

    const timezone = config.timezone || "UTC";

    // Greetings messages based on time of day
    const greetings = {
        morning: ["Good morning! Have a great day!", "Rise and shine! Good morning!"],
        afternoon: ["Good afternoon! Keep up the great work!", "Time to eat something!"],
        evening: ["Good evening! Relax and enjoy your evening!", "Evening! Hope you had a productive day!"],
        night: ["Good night! Rest well!", "Tulog na kayo!"]
    };

    // Get a random greeting for a specific time of day
    function greetRandom(timeOfDay) {
        const greetingsList = greetings[timeOfDay] || [];
        return greetingsList.length > 0
            ? greetingsList[Math.floor(Math.random() * greetingsList.length)]
            : "Hello!";
    }

    // Send greetings to threads
    async function greetThreads(timeOfDay) {
        try {
            const msgTxt = greetRandom(timeOfDay);
            if (!threads || !Array.isArray(threads)) {
                throw new Error("Invalid thread list.");
            }
            for (const thread of threads) {
                if (thread.isGroup) {
                    await api.sendMessage(thin(msgTxt), thread.threadID);
                }
            }
        } catch (error) {
            console.error("Error greeting threads:", error);
        }
    }

    // Task: Restart the system
    async function restart() {
        process.exit(0);
    }

    // Task: Clear chat
    async function clearChat() {
        try {
            if (!threads || !Array.isArray(threads)) {
                throw new Error("Invalid thread list.");
            }
            for (const thread of threads) {
                if (!thread.isGroup) {
                    await api.deleteThread(thread.threadID);
                }
            }
        } catch (error) {
            console.error("Error clearing chat:", error);
        }
    }


    async function acceptPending() {
        try {
            if (!pendingThreads || !Array.isArray(pendingThreads)) {
                throw new Error("Invalid pending thread list.");
            }
            for (const thread of pendingThreads) {
                await api.sendMessage(thin('📨 Automatically approved by our system.'), thread.threadID);
            }
        } catch (error) {
            console.error("Error accepting pending threads:", error);
        }
    }


    async function motivation() {
        try {
            const response = await axios.get("https://raw.githubusercontent.com/JamesFT/Database-Quotes-JSON/master/quotes.json");
            const quotes = response.data;
            if (!Array.isArray(quotes) || quotes.length === 0) {
                throw new Error("Invalid quotes data received.");
            }
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            const quote = `"${randomQuote.quoteText}"\n\n— ${randomQuote.quoteAuthor || "Anonymous"}`;
            await api.createPost(thin(quote));
        } catch (error) {
            console.error("Error posting motivation:", error);
        }
    }

    const scheduleGreetings = (timeOfDay, hours) => {
        if (!greetings[timeOfDay]) {
            console.error(`Invalid time of day: ${timeOfDay}`);
            return;
        }
        hours.forEach((hour) => {
            cron.schedule(`0 ${hour} * * *`, () => greetThreads(timeOfDay), { timezone });
        });
    };


    if (!config.cronJobs || typeof config.cronJobs !== 'object') {
        console.error("Invalid or missing cron jobs configuration.");
        return;
    }

    Object.entries(config.cronJobs).forEach(([key, job]) => {
        if (!job.enabled) return;

        if (key.endsWith('Greetings')) {
            const timeOfDay = key.replace('Greetings', '').toLowerCase();
            scheduleGreetings(timeOfDay, job.hours || []);
        } else {
            const taskMap = {
                restart,
                clearChat,
                acceptPending,
                motivation
            };
            const task = taskMap[key];
            if (task) {
                cron.schedule(job.cronExpression, task, { timezone });
            } else {
                console.error(`Unknown task: ${key}`);
            }
        }
    });
};
