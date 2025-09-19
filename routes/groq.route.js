// File: tj-bazaar-chatbot.js
const { Router } = require('express');
const { check } = require('express-validator');
const { validate } = require("../middlewares/validate");
const { chat } = require('../controllers/groq.controller');
const upload = require('../middlewares/multer');

const router = Router();


router.post('/', upload.single("image"), [
    check('prompt').not().isEmpty().withMessage("Nothing in Prompt"),
    check('history').not().isEmpty().withMessage("Nothing in History")
], validate, chat);

module.exports = router;
