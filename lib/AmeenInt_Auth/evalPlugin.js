module.exports = {
    handleMessage: async (conn, message) => {
        if (!message.message || !message.message.conversation) return;

        const body = message.message.conversation;

        
        if (!body.startsWith('>')) return;

        const code = body.slice(1).trim(); 

        if (!code) return;

        try {
            
            let Fuck = eval(code); 
    
            const output = (typeof Fuck === 'object') ? JSON.stringify(Fuck, null, 2) : Fuck;

            // enikk vayya 💔☠️
            await conn.sendMessage(message.key.remoteJid, { text: `Output: ${output}` }, { quoted: message });
        } catch (error) {
            
            await conn.sendMessage(message.key.remoteJid, { text: `Error: ${error.message}` }, { quoted: message });
        }
    }
};
