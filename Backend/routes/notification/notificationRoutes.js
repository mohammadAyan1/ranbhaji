
import express from "express"
import { sendToAllUsers, sendToSingleUser } from "../../controllers/notification/notificationController.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/auth.middleware.js";
const notificationRouter = express.Router()

// notificationRouter.post('/save-push-token', requiredAuth, savePushToken);
notificationRouter.post('/send-all', requireAuth, requireRole(["admin"]), sendToAllUsers);
notificationRouter.post('/send-one', requireAuth, requireRole(["admin"]), sendToSingleUser);

// module.exports = router;
export default notificationRouter