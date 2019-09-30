const TelegramBot = require('node-telegram-bot-api');
const schedule = require('./schedule-to-calendar')
var fs = require('fs');
const drive = require('./google-drive');

const TOKEN_PATH = 'data/telegram-token.json';

const bot = new TelegramBot(JSON.parse(fs.readFileSync(TOKEN_PATH)).token, {
	polling: true,
});


bot.onText(/^(?!\/schedule).*$/, (msg) => {
	bot.sendMessage(msg.chat.id, 'Запрос /schedule номер_группы или /schedule ФИО_преподавателя');
});

bot.onText(/\/schedule (.+)/, async function (msg, match) {
	const name = match[1].trim()

	try {
		const path = await schedule.getSchedule(name);
		const text = 'Расписание для ' + name;

		drive.sendMessage(path, (url) => bot.sendMessage(msg.chat.id, text, {
			reply_markup: JSON.stringify({
				inline_keyboard: [[{ text: 'Скачать', url: url }]]
			})
		}));

	} catch(err) {
		bot.sendMessage(msg.chat.id, err);
	}
});