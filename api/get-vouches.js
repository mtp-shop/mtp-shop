import axios from 'axios';

export default async function handler(req, res) {
    const CHANNEL_ID = '1316537153500745809'; 
    // This line tells Vercel: "Go find the secret value I saved under this name"
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; 

    if (!BOT_TOKEN) {
        return res.status(500).json({ error: "BOT_TOKEN is missing in Vercel" });
    }

    try {
        const response = await axios.get(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=9`, {
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`
            }
        });

        const vouches = response.data
            .filter(msg => msg.content.length > 2) 
            .map(msg => ({
                username: msg.author.global_name || msg.author.username,
                avatar: msg.author.avatar 
                    ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
                    : 'https://tpstemple.shop/logo.png', 
                content: msg.content,
                timestamp: msg.timestamp
            }));

        return res.status(200).json(vouches);
    } catch (error) {
        console.error("Discord Error:", error.response ? error.response.data : error.message);
        return res.status(500).json({ error: "Failed to connect to Discord" });
    }
}
