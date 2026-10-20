
import pool from '../../confiq/db.js';
import sendPushNotifications from '../../utils/sendPushNotification.js';

// SAB users ko
export const sendToAllUsers = async (req, res) => {
    try {
        const { title, body, image, data } = req.body;


        if (req.user?.role?.toLowerCase() !== "admin") {
            return res.status(403).json({
                success: false,
                message: "You don't have authority"
            });
        }

        if (!title || !body) {
            return res.status(400).json({ message: 'Title aur body dono chahiye' });
        }

        const [allTokens] = await pool.query("SELECT token FROM pushtoken")

        const tokenList = allTokens.map((t) => t.token);


        console.log(tokenList, "QAZWXSWEDRCFTGYHUBJIHGFDXSA");


        if (tokenList.length === 0) {
            return res.status(400).json({ message: 'Koi bhi user push token registered nahi hai' });
        }

        const notificationData = { ...(data || {}) };
        if (image) {
            notificationData.image = image;
        }

        const tickets = await sendPushNotifications(tokenList, title, body, notificationData);

        return res.status(200).json({
            message: `Notification ${tokenList.length} users ko bheji gayi`,
            tickets,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// EK specific user ko
export const sendToSingleUser = async (req, res) => {
    try {
        const { userId, title, body, image, data } = req.body;
        console.log("ASDFGHJKL", req.user.role);


        if (req.user?.role?.toLowerCase() !== "admin") {
            return res.status(403).json({ success: false, message: "You don't have authority" });
        }

        if (!userId || !title || !body) {
            return res.status(400).json({ message: 'userId, title aur body zaroori hai' });
        }



        const [userTokens] = await pool.query("SELECT token FROM pushtoken WHERE userId=?", [userId])


        const tokenList = userTokens.map((t) => t.token);

        if (tokenList.length === 0) {
            return res.status(400).json({ message: 'Is user ka koi push token registered nahi hai' });
        }

        // 🔍 TEST KARNE KE LIYE: Dekho yahan console mein kya mil raha hai
        console.log("Incoming Image URL:", image);
        console.log("Incoming Data Object:", data);

        // Agar user ne direct "image" field di hai ya "data.image" diya hai, dono handle honge
        const notificationData = { ...(data || {}) };
        if (image) {
            notificationData.image = image;
        }


        // const tickets = await sendPushNotifications(tokenList, title, body);
        const tickets = await sendPushNotifications(tokenList, title, body, notificationData);


        return res.status(200).json({
            message: 'Notification is user ko bhej di gayi',
            sentData: notificationData, // Response mein dikhega ki kya data gaya
            tickets
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};




export const sendNotificationToUser = async ({
    userId,
    title,
    body,
    image,
    data
}) => {
    const [userTokens] = await pool.query(
        "SELECT token FROM pushtoken WHERE userId=?",
        [userId]
    );

    const tokenList = userTokens.map((t) => t.token);

    if (tokenList.length === 0) {
        throw new Error("Is user ka koi push token registered nahi hai");
    }

    const notificationData = { ...(data || {}) };

    if (image) {
        notificationData.image = image;
    }

    const tickets = await sendPushNotifications(
        tokenList,
        title,
        body,
        notificationData
    );

    return {
        notificationData,
        tickets
    };
};