const express = require("express");
const router = express.Router();

const chatController = require("../controllers/chatController");
const chatUpload = require("../middleware/chatUpload");

router.get("/inbox", chatController.getInbox);

router.post("/conversations/ensure", chatController.ensureConversation);

router.get("/conversations/:id", chatController.getConversation);
router.get("/conversations/:id/messages", chatController.getMessages);
router.post("/conversations/:id/messages", chatUpload.single("file"), chatController.sendMessage);

router.post("/conversations/:id/read", chatController.markRead);

module.exports = router;
