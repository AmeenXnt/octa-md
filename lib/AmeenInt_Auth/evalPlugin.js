module.exports = {
    handleMessage: async (conn, message) => {
        if (!message.message || !message.message.conversation) return;

        const body = message.message.conversation;

        // Check if the message starts with '>'
        if (!body.startsWith('>')) return;

        const code = body.slice(1).trim(); // Remove the '>' prefix

        if (!code) return;

        try {
            // Use `eval` to execute the code
            const result = eval(code);

            // Format the output
            const output = (typeof result === 'object') ? JSON.stringify(result, null, 2) : result;

            // Send the result back
            await conn.sendMessage(message.key.remoteJid, { text: `Output: ${output}` }, { quoted: message });
        } catch (error) {
            // Send the error message if execution fails
            await conn.sendMessage(message.key.remoteJid, { text: `Error: ${error.message}` }, { quoted: message });
        }
    }
};
