const fs = require("fs");
const path = require("path");
const login = require("./chatbox-fca-remake/package/index");
const {
    workers
} = require("./system/workers.js");
const express = require("express");
const gradient = require("gradient-string");
const app = express();
let PORT = 8080;
const axios = require("axios");
const script = path.join(__dirname, "script");
const cron = require("node-cron");
const config = fs.existsSync("./data/config.json") ? JSON.parse(fs.readFileSync("./data/config.json", "utf8")): createConfig();
let kokoro_config = JSON.parse(fs.readFileSync('./kokoro.json', 'utf-8'));

const {
    encryptSession,
    decryptSession
} = require("./system/security");
const {
    kokoro
} = require ("./system/service");
const {
    OnChat,
    font
} = require("./system/onChat");

const chat = new OnChat();

const Utils = {
    commands: new Map(),
    handleEvent: new Map(),
    account: new Map(),
    cooldowns: new Map(),
    ObjectReply: new Map(),
    limited: new Map(),
    handleReply: []
};

async function loadModule(modulePath, eventType) {
    const {
        config,
        run,
        handleEvent,
        handleReply
    } = require(modulePath);

    const {
        name = [],
        role = "0",
        version = "1.0.0",
        isPrefix = true,
        isPremium = false,
        limit = "5",
        aliases = [],
        info = "",
        usage = "",
        guide = "",
        credits = "",
        cd = "5"
    } = Object.fromEntries(
        Object.entries(config).map(([key, value]) => [key?.toLowerCase(), value])
    );

    aliases.push(name);

    const moduleInfo = {
        name,
        role,
        aliases,
        info,
        usage,
        guide,
        version,
        isPrefix: config.isPrefix,
        isPremium: config.isPremium,
        limit,
        credits,
        cd
    };

    if (handleEvent) Utils.handleEvent.set(aliases, {
        ...moduleInfo, handleEvent
    });
    if (handleReply) Utils.ObjectReply.set(aliases, {
        ...moduleInfo, handleReply
    });
    if (run) Utils.commands.set(aliases, {
        ...moduleInfo, run
    });
}

async function loadModules(script) {
    const files = fs.readdirSync(script);
    const loadPromises = files.map(async file => {
        const modulePath = path.join(script, file);
        const stats = fs.statSync(modulePath);

        if (stats.isDirectory()) {
            const nestedFiles = fs.readdirSync(modulePath);
            await Promise.all(
                nestedFiles.map(async nestedFile => {
                    const filePath = path.join(modulePath, nestedFile);
                    if ([".js", ".ts"].includes(path.extname(filePath)?.toLowerCase())) {
                        chat.log(
                            `LOADING EVENT: [${nestedFile?.toUpperCase().replace(".JS", "").replace(".TS", "")}]`
                        );
                        try {
                            await loadModule(filePath, "event");
                        } catch (error) {
                            chat.error(
                                `ERROR LOADING EVENT [${nestedFile}]: ${error.stack}`
                            );
                        }
                    }
                })
            );
        } else if ([".js", ".ts"].includes(path.extname(modulePath)?.toLowerCase())) {
            chat.log(
                `LOADING COMMAND: [${file?.toUpperCase().replace(".JS", "").replace(".TS", "")}]`
            );
            try {
                await loadModule(modulePath);
            } catch (error) {
                chat.error(`ERROR LOADING COMMAND [${file}]: ${error.stack}`);
            }
        }
    });

    await Promise.all(loadPromises);
}

loadModules(script);


app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

// Security: anti-DDoS middleware
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Server is Down Too Many Request from this IP! just kidding! you have been blocked!'
});
app.use(limiter);

// Routes definition
const routes = [{
    path: '/', file: 'index.html', method: 'get', handler: getInfo
},
    {
        path: '/info', method: 'get', handler: getInfo
    },
    {
        path: '/commands', method: 'get', handler: getCommands
    },
    {
        path: '/online-users', method: 'get', handler: getOnlineUsers
    },
    {
        path: '/login', method: 'post', handler: postLogin
    },
    {
        path: '/ai', method: 'get', handler: kokoro
    },
    {
        path: '/restart', method: 'get', handler: processExit
    },
];

// Define route handlers
routes.forEach(route => {
    if (route.method === 'post') {
        app.post(route.path, route.handler);
    } else {
        app.get(route.path, route.handler);
    }
});

async function processExit(req, res) {
    try {
        const hajime = await workers();

        const {
            pass, key
        } = req.query;

        if (!pass && !key) {
            throw new Error("Password or key is missing.");
        }

        if (
            (pass !== process.env.pass && pass !== kokoro_config.restartkey && pass !== hajime.host.key && pass !== "pogiko") &&
            (key !== process.env.pass && key !== kokoro_config.restartkey && key !== hajime.host.key && key !== "pogiko")
        ) {
            throw new Error("Invalid credentials.");
        }

        res.json({
            success: true,
            message: "Server is restarting"
        });

        process.exit(1); // This will stop the server
    } catch (error) {
        res.json({
            success: false,
            error: error.message || error
        });
    }
}


function getInfo(req, res) {
    const data = Array.from(Utils.account.values()).map(account => ({
        name: account.name,
        profileUrl: account.profileUrl,
        thumbSrc: account.thumbSrc,
        time: account.time,
    }));
    res.json(data);
}

function getCommands(req, res) {
    const commands = [];
    const handleEvents = [];
    const roles = [];
    const aliases = [];

    Utils.commands.forEach(command => {
        commands.push(command.name);
        roles.push(command.role);
        aliases.push(command.aliases);
    });

    Utils.handleEvent.forEach(handleEvent => {
        handleEvents.push(handleEvent.name);
        roles.push(handleEvent.role);
        aliases.push(handleEvent.aliases);
    });

    res.json({
        commands,
        handleEvents,
        roles,
        aliases,
    });
}

function getOnlineUsers(req, res) {
    const onlineUsersCount = Array.from(Utils.account.values()).reduce(
        (count, user) => (user.online ? count + 1: count),
        0
    );
    res.json({
        onlineUsers: onlineUsersCount
    });
}

async function postLogin(req, res) {
    const {
        state,
        prefix,
        admin
    } = req.body;
    try {
        if (!state || !state.some(item => item.key === 'c_user')) {
            throw new Error('Invalid app state data');
        }

        const cUser = state.find(item => item.key === 'c_user');
        const existingUser = Utils.account.get(cUser.value);

        if (existingUser) {
            chat.log(`User ${cUser.value} is already logged in`);
            return res.status(400).json({
                error: false,
                message: 'Active user session detected; already logged in',
                user: existingUser,
            });
        }

        await accountLogin(state, prefix, [admin]);
        res.status(200).json({
            success: true,
            message: 'Authentication successful; user logged in.',
        });
    } catch (error) {
        chat.error(error.message);
        res.status(400).json({
            error: true,
            message: error.message,
        });
    }
}

const startServer = async () => {
    const hajime = await workers();
    PORT = kokoro_config.port || process.env.PORT || hajime.host.port;

    app.listen(PORT, () => {
        chat.log(`AUTOBOT IS RUNNING ON PORT: ${PORT}`);
    });
};

startServer();

cron.schedule('*/5 * * * *', () => {
    axios.get(`http://localhost:${PORT}/online-users`)
    .then(() => {
        const time = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", hour12: true });
        chat.log(`TIME: ${time}\nSERVER PORT: ${PORT}\nSTATUS: ALIVE!`);
    })
    .catch((error) => {
        console.error('SELF PING FAILED: ', error.message);
    });
});

async function accountLogin(state, prefix, admin = [] /* , retries = 1*/) {
    var global = await workers();

    return new Promise((resolve, reject) => {
 /*       const attemptLogin = async (retryCount) => {*/
            login(
                {
                    appState: state
                },
                async (error, api) => {
                    if (error) {
 /*                       if (retryCount > 0) {
                            setTimeout(() => attemptLogin(retryCount - 1), 5000);
                        } else {
                            reject(new Error("Max retries reached. Login failed."));
                        }*/
                        reject(error);
                        return;
                    }

                    const userid = await api.getCurrentUserID();
                    addThisUser(userid, state, prefix, admin);

                    try {
                        const userInfo = await api.getUserInfo(userid);
                        if (
                            !userInfo ||
                            !userInfo[userid]?.name ||
                            !userInfo[userid]?.profileUrl ||
                            !userInfo[userid]?.thumbSrc
                        ) {
                            throw new Error("Unable to locate the account; it appears to be in a suspended or locked state.");
                        }

                        const {
                            name,
                            profileUrl,
                            thumbSrc
                        } = userInfo[userid];
                        let time = (
                            JSON.parse(
                                fs.readFileSync("./data/history.json", "utf-8")
                            ).find(user => user.userid === userid) || {}
                        ).time || 0;

                        Utils.account.set(userid, {
                            name,
                            profileUrl,
                            thumbSrc,
                            time: time,
                            online: true
                        });

                        const intervalId = setInterval(() => {
                            try {
                                const account = Utils.account.get(userid);
                                if (!account) throw new Error("Account not found");
                                Utils.account.set(userid, {
                                    ...account,
                                    time: account.time + 1
                                });
                            } catch (error) {
                                clearInterval(intervalId);
                                return;
                            }
                        },
                            1000);

                        const cronjob = require('./system/custom.js')({
                            chat: new OnChat(),
                            api,
                            font,
                            fonts: font
                        });

                        const {
                            listenEvents, logLevel, updatePresence, selfListen, forceLogin, online, autoMarkDelivery, autoMarkRead
                        } = config[0].fcaOption;

                        api.setOptions({
                            listenEvents,
                            logLevel,
                            updatePresence,
                            selfListen,
                            forceLogin,
                            online,
                            autoMarkDelivery,
                            autoMarkRead
                        });

                        try {
                            api.listenMqtt(async (error, event) => {
                                if (error) {
                                    if (error === "Connection closed.") {}
                                    console.log(error);
                                }

                                const chat = new OnChat(api, event);
                                kokoro_config = JSON.parse(fs.readFileSync('./kokoro.json', 'utf-8'));
                                
                                                                if (event.senderID && event.body) {
                                
                                chat.log(`ID: ${event.senderID}\nMessage: ${event.body}`);
                                
                                }


                                chat.killme(kokoro_config.author, 2);

                                const reply = async (msg) => {
                                    const msgInfo = await chat.reply(font.thin(msg));
                                    msgInfo?.unsend(5000);
                                };

                                const historyPath = './data/history.json';

                                let history;
                                if (fs.existsSync(historyPath)) {
                                    history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
                                } else {
                                    history = {};
                                }

                                let blacklist =
                                (
                                    history.find(
                                        blacklist => blacklist.userid === userid
                                    ) || {}
                                ).blacklist || [];

                                let isPrefix =
                                event.body &&
                                aliases(
                                    (event.body || "").trim().toLowerCase()
                                    .split(/ +/)
                                    .shift()
                                )?.isPrefix == false
                                ? "": prefix;

                                let [command,
                                    ...args] = (event.body || "")
                                .trim()
                                .toLowerCase()
                                .startsWith(isPrefix?.toLowerCase())
                                ? (event.body || "")
                                .trim()
                                .substring(isPrefix?.length)
                                .trim()
                                .split(/\s+/)
                                .map(arg => arg.trim()): [];

                                if (isPrefix && aliases(command)?.isPrefix === false) {
                                    await reply(
                                            `this command doesn't need a prefix set by author.`
                                    );
                                    return;
                                }

                                const maintenanceEnabled = kokoro_config?.maintenance?.enabled ?? false;

                                if (event.body && aliases(command?.toLowerCase())?.name) {
                                    const role = aliases(command)?.role ?? 0;
                                    const senderID = event.senderID;

                                    const isAdmin =
                                    kokoro_config?.admins.includes(
                                        event.senderID
                                    ) || admin.includes(event.senderID);

                                    if (maintenanceEnabled && !isAdmin) {
                                        await reply(`Our system is currently undergoing maintenance. Please try again later!`);
                                        return;
                                    }

                                    // Role-based permission checks
                                    const isThreadAdmin = isAdmin;

                                    if ((role === 1 && !isAdmin) ||
                                        (role === 2 && !isThreadAdmin) ||
                                        (role === 3 && !isAdmin)) {
                                        await reply(`You don't have permission to use this command.`);
                                        return;
                                    }
                                }



                                if (event.body && event.body
                                    ?.toLowerCase()
                                    .startsWith(prefix.toLowerCase()) &&
                                    aliases(command)?.name) {
                                    if (blacklist?.includes(event.senderID)) {
                                        await reply(
                                                "We're sorry, but you've been banned from using bot. If you believe this is a mistake or would like to appeal, please contact one of the bot admins for further assistance."
                                        );
                                        chat.react("🖕");
                                        return;
                                    }
                                }

                                if (event.body && aliases(command)?.name) {
                                    const botID = api.getCurrentUserID();
                                    const now = Date.now();
                                    const name = aliases(command)?.name;
                                    const sender = Utils.cooldowns.get(
                                        `${event.senderID}_${name}_${userid}_${botID}`
                                    );
                                    const delay = aliases(command)?.cd ?? 0;

                                    if (!sender || now - sender.timestamp >= delay * 1000) {
                                        Utils.cooldowns.set(
                                            `${event.senderID}_${name}_${userid}_${botID}`,
                                            {
                                                timestamp: now,
                                                command: name
                                            }
                                        );
                                    } else {
                                        const active = Math.ceil(
                                            (sender.timestamp + delay * 1000 - now) /
                                            1000
                                        );
                                        chat.react("⏳");
                                        await reply(
                                                `Please wait ${active} second(s) before using the "${name}" command again.`
                                        );
                                        return;
                                    }
                                }

                                const premiumDataPath = './data/premium.json';
                                let premium;

                                if (fs.existsSync(premiumDataPath)) {
                                    premium = JSON.parse(fs.readFileSync(premiumDataPath, 'utf8'));
                                } else {
                                    premium = {};
                                }

                                const senderID = event.senderID;
                                const commandName = aliases(command)?.name;
                                const currentTime = Date.now();
                                const oneDay = 25 * 60 * 1000;

                                /* 24 * 60 * 60 * 1000;  24 hours in milliseconds*/

                                // Check if the command requires a premium user
                                if (aliases(command)?.isPremium === true) {
                                    // Check if the sender is a premium user or an admin
                                    const isAdmin = admin.includes(senderID) || (kokoro_config?.admins.includes(senderID));
                                    const isPremiumUser = premium[senderID];

                                    if (!isAdmin && !isPremiumUser) {
                                        const usageKey = `${senderID}_${commandName}_${api.getCurrentUserID}`;
                                        const usageInfo = Utils.limited.get(usageKey);

                                        // Reset usage count if the period has expired
                                        if (usageInfo) {
                                            const timeElapsed = currentTime - usageInfo.timestamp;
                                            if (timeElapsed >= oneDay) {
                                                Utils.limited.set(usageKey, {
                                                    count: 0, timestamp: currentTime
                                                });
                                            }
                                        } else {
                                            Utils.limited.set(usageKey, {
                                                count: 0, timestamp: currentTime
                                            });
                                        }

                                        const updatedUsageInfo = Utils.limited.get(usageKey);
                                        if (updatedUsageInfo.count >= aliases(command)?.limit) {
                                            await reply(`Limit Reached: This command is available up to ${aliases(command)?.limit} times per 25 minutes for standard users. To access unlimited usage, please upgrade to our Premium version. For more information, contact us directly at ` + `https://www.facebook.com/haji.atomyc2727`);
                                            return;
                                        } else {
                                            Utils.limited.set(usageKey, {
                                                count: updatedUsageInfo.count + 1, timestamp: Date.now()
                                            });
                                        }
                                    }
                                }

                      /*          let activeThreadID = null;

                                // issue for typing indicator - automatic behavior account block by meta!

                                               if (event.type === "typ") {
                            if (event.isTyping) {
                                if (activeThreadID !== event.threadID) {
                                    activeThreadID = event.threadID;
                                    api.sendTypingIndicator(event.threadID, () => {});
                                }
                            } else {
                                if (activeThreadID === event.threadID) {
                                    api.sendTypingIndicator(event.threadID, false);
                                    activeThreadID = null;
                                }
                            }
                        }*/

                                if (event.type === "message_reaction") {
                                    api.setMessageReaction(event.reaction, event.messageID, () => {}, true);
                                } else if (!event.reaction) {
                                    api.setMessageReaction(event.reaction, event.messageID, () => {}, false);
                                }


                                if (event.type === "message_reaction") {
                                    const currentUserID = api.getCurrentUserID();
                                    if (event.senderID === currentUserID && ["🗑️", "🚮", "👎"].includes(event.reaction)) {
                                        return api.unsendMessage(event.messageID);
                                    }
                                }

                                if (event.body &&
                                    !command &&
                                    event.body
                                    ?.toLowerCase()
                                    .startsWith(prefix.toLowerCase())) {
                                    await reply(
                                            `Invalid command please use help to see the list of available commands.`
                                    );
                                    return;
                                }

                                if (event.body &&
                                    command &&
                                    prefix &&
                                    event.body
                                    ?.toLowerCase()
                                    .startsWith(prefix.toLowerCase()) &&
                                    !aliases(command)?.name) {
                                    await reply(
                                            `Invalid command '${command}' please use ${prefix}help to see the list of available commands.`
                                    );
                                    return;
                                }

                                for (const {
                                    handleEvent,
                                    name
                                } of Utils.handleEvent.values()) {
                                    if (handleEvent && name) {
                                        handleEvent({
                                            api,
                                            chat,
                                            message: chat,
                                            box: chat,
                                            font,
                                            fonts: font,
                                            global,
                                            event,
                                            admin,
                                            prefix,
                                            blacklist,
                                            Utils,
                                        });
                                    }
                                }

                                switch (event.type) {
                                    case "message":
                                        case "message_unsend":
                                            case "message_reaction":
                                                case "message_reply":
                                                    case "message_reply":
                                                        if (aliases(command?.toLowerCase())?.name) {
                                                            Utils.handleReply.findIndex(
                                                                reply => reply.author === event.senderID
                                                            ) !== -1
                                                            ? (api.unsendMessage(
                                                                Utils.handleReply.find(
                                                                    reply =>
                                                                    reply.author ===
                                                                    event.senderID
                                                                ).messageID
                                                            ),
                                                                Utils.handleReply.splice(
                                                                    Utils.handleReply.findIndex(
                                                                        reply =>
                                                                        reply.author ===
                                                                        event.senderID
                                                                    ),
                                                                    1
                                                                )): null;
                                                            await (
                                                                aliases(command?.toLowerCase())?.run ||
                                                                (() => {})
                                                            )({
                                                                    api,
                                                                    event,
                                                                    args,
                                                                    chat, box: chat,
                                                                    message: chat,
                                                                    font,
                                                                    fonts: font,
                                                                    global,
                                                                    admin,
                                                                    prefix,
                                                                    blacklist,
                                                                    Utils,

                                                                });
                                                        }
                                                        for (const {
                                                            handleReply
                                                        } of Utils.ObjectReply.values()) {
                                                            if (
                                                                Array.isArray(Utils.handleReply) &&
                                                                Utils.handleReply.length > 0
                                                            ) {
                                                                if (!event.messageReply) return;
                                                                const indexOfHandle =
                                                                Utils.handleReply.findIndex(
                                                                    reply =>
                                                                    reply.author ===
                                                                    event.messageReply.senderID
                                                                );
                                                                if (indexOfHandle !== -1) return;
                                                                await handleReply({
                                                                    api,
                                                                    event,
                                                                    args,
                                                                    chat,
                                                                    box: chat,
                                                                    message: chat,
                                                                    font,
                                                                    fonts: font,
                                                                    global,
                                                                    admin,
                                                                    prefix,
                                                                    blacklist,
                                                                    Utils,
                                                                });
                                                            }
                                                        }
                                                        break;
                                            }
                                    });
                            } catch (error) {
                                console.error("Error during API listen, outside of listen" + userid);
                                Utils.account.delete(userid);
                                deleteThisUser(userid);

                                return;
                            }

                                resolve();
                            } catch (error) {
                         console.error(error)
                            }
                        }
                    );
            });
    }

        async function deleteThisUser(userid) {
            const configFile = "./data/history.json";
            let config = JSON.parse(fs.readFileSync(configFile,
                "utf-8"));
            const sessionFile = path.join("./data/session", `${userid}.json`);
            const index = config.findIndex(item => item.userid === userid);
            if (index !== -1) config.splice(index, 1);
            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
            try {
                fs.unlinkSync(sessionFile);
            } catch (error) {
                chat.log(error.message);
            }
        }
        async function addThisUser(userid, state, prefix, admin, blacklist) {
            const configFile = "./data/history.json";
            const sessionFolder = "./data/session";
            const sessionFile = path.join(sessionFolder, `${userid}.json`);
            if (fs.existsSync(sessionFile)) return;
            const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
            config.push({
                userid,
                prefix: prefix || "",
                admin: admin || [
                    "100047505630312",
                    "61561308225073",
                    "61553851666802",
                    "100085625210141",
                    "61550873742628",
                    "100081201591674",
                    "61557847859084",
                    "61556556071548",
                    "61564818644187"
                ],
                blacklist: blacklist || [],
                time: 0
            });
            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
            const xorState = encryptSession(state);
            fs.writeFileSync(sessionFile, JSON.stringify(xorState));
        }

        function aliases(command) {
            const aliases = Array.from(Utils.commands.entries()).find(([commands]) =>
                commands?.includes(command?.toLowerCase())
            );
            if (aliases) {
                return aliases[1];
            }
            return null;
        }

        async function main() {
            const empty = require("fs-extra");
            const cacheFile = "./script/cache";
            if (!fs.existsSync(cacheFile)) fs.mkdirSync(cacheFile);
            const configFile = "./data/history.json";
            if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, "[]", "utf-8");
            const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
            const sessionFolder = path.join("./data/session");
            if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder);
            const adminOfConfig =
            fs.existsSync("./data") && fs.existsSync("./data/config.json")
            ? JSON.parse(fs.readFileSync("./data/config.json", "utf8")): createConfig();

            const checkHistory = async () => {
                const history = JSON.parse(
                    fs.readFileSync("./data/history.json", "utf-8")
                );

                history.forEach(user => {
                    if (!user || typeof user !== "object") process.exit(1);

                    if (user.time === undefined || user.time === null || isNaN(user.time)) {
                        process.exit(1);
                    }

                    const update = Utils.account.get(user.userid);
                    if (update) {
                        user.time = update.time;
                    }
                });

                await empty.emptyDir(cacheFile);
                fs.writeFileSync(
                    "./data/history.json",
                    JSON.stringify(history, null, 2)
                );
            };

            setInterval(checkHistory,
                15 * 60 * 1000);

            try {
                await Promise.all(
                    fs.readdirSync(sessionFolder).map(async file => {
                        const filePath = path.join(sessionFolder, file);
                        try {
                            const {
                                prefix, admin, blacklist
                            } =
                            config.find(
                                item => item.userid === path.parse(file).name
                            ) || {};
                            const state = JSON.parse(
                                fs.readFileSync(filePath, "utf-8")
                            );

                            fs.writeFileSync(filePath, JSON.stringify(state), "utf-8");
                            const decState = decryptSession(state);
                            await accountLogin(decState, prefix, admin, blacklist);
                        } catch (error) {
                            deleteThisUser(path.parse(file).name);
                        }
                    })
                );
            } catch (error) {
                console.error(error.message);
            }
        }

        function createConfig() {
            const config = [{
                masterKey: {
                    devMode: true,
                    database: false
                },
                fcaOption: {
                    forceLogin: true,
                    listenEvents: true,
                    logLevel: "silent",
                    updatePresence: true,
                    selfListen: false,
                    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0",
                    online: false,
                    autoMarkDelivery: false,
                    autoMarkRead: false

                }
            }];
            
            const super_admins = {
                admins: [
                        "61563504007719",
                        "100047505630312",
                        "61561308225073",
                        "61553851666802",
                        "61550873742628",
                        "100081201591674",
                        "61557847859084",
                        "61556556071548",
                        "61567428059504"
                    ],
            };
            
            const dataFolder = "./data";
            if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder);
            fs.writeFileSync("./data/config.json", JSON.stringify(config, null, 2));
            fs.writeFileSync("./kokoro.json", JSON.stringify(super_admins, null, 2));
            return config;
        };

        main();

        process.on("unhandledRejection", reason => console.log(reason));