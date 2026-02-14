import axios from 'axios';

export default async function handler(req, res) {
    const CHANNEL_ID = 'YOUR_VOUCHES_CHANNEL_ID'; // Put your ID here
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN; // Put token in Vercel Env Variables

    try {
        const response = await axios.get(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=10`, {
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`
            }
        });

        const vouches = response.data.map(msg => ({
            username: msg.author.username,
            avatar: msg.author.avatar 
                ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
                : 'logo.png', // Fallback to your logo
            content: msg.content,
            timestamp: msg.timestamp
        }));

        return res.status(200).json(vouches);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch vouches" });
    }
}
