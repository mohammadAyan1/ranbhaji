import { Expo } from 'expo-server-sdk';   // ✅ sahi

const expo = new Expo();

async function sendPushNotifications(tokens, title, body, data = {}) {
    const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

    const messages = validTokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data, // Yahan data object pass hoga jiske andar image hoga
        // Image ke liye 'richContent' object use karo (Expo SDK)
        richContent: data?.image ? { image: data.image } : undefined,
        // Optional iOS ke liye mutable content enable karo taaki iOS native app image fetch kar sake (agar extension setup ho)
        mutableContent: true,
        channelId: 'default',
    }));

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error('Push send error:', error);
        }
    }

    return tickets;
}

export default sendPushNotifications;