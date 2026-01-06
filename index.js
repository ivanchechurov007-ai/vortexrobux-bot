const PORT = process.env.PORT || 3000;
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('✅ VortexRobux Bot is running! Telegram: @VortexRobuxBot');
});
server.listen(PORT, () => {
    console.log(`🌐 Сервер запущен на порту ${PORT}`);
});

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

console.log('🔍 Запускаю бота...');
const token = process.env.BOT_TOKEN || '7074066187:AAE4hvTwT2ZsvMoyuePKyJIzAQyoLEaNmOk';

let bot;
try {
    bot = new TelegramBot(token, { 
        polling: {
            interval: 300,
            timeout: 10,
            autoStart: true
        }
    });
    console.log('✅ Бот подключен к Telegram!');
} catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    process.exit(1);
}

const SELLER_CHAT_ID = '1772429926';
const userOrders = {};
const waitingForNickname = {};
const prices = {
    '100': 100, '200': 200, '300': 300, '400': 400, '500': 500,
    '600': 600, '700': 700, '800': 800, '900': 900, '1000': 1000
};

bot.on('polling_error', (error) => {
    console.log('⚠️ Ошибка polling:', error.message);
    console.log('🔄 Перезапускаю polling...');
    bot.startPolling();
});

function showMainMenu(chatId, message = '🚀 VortexRobux – твой мгновенный путь к богатству в Roblox!\n💎 Купи Robux быстро, безопасно и дешево!\n⚡ Мгновенная доставка | 🔒 Безопасные платежи | 🛡 Гарантия\n👉 Выбирай действие ниже:') {
    try {
        const opts = {
            reply_markup: {
                keyboard: [
                    [{ text: '🛒 Купить Robux' }],
                    [{ text: '🆘 Поддержка' }]
                ],
                resize_keyboard: true
            }
        };
        bot.sendMessage(chatId, message, opts);
    } catch (e) {
        console.log('Ошибка showMainMenu:', e.message);
    }
}

function showRobuxMenu(chatId, message = '💰 Выберите количество Robux для покупки:') {
    try {
        const keyboard = [
            [{ text: '100 Robux' }, { text: '200 Robux' }],
            [{ text: '300 Robux' }, { text: '400 Robux' }],
            [{ text: '500 Robux' }, { text: '600 Robux' }],
            [{ text: '700 Robux' }, { text: '800 Robux' }],
            [{ text: '900 Robux' }, { text: '1000 Robux' }],
            [{ text: '◀️ Назад в главное меню' }, { text: '🆘 Поддержка' }]
        ];
        
        const opts = {
            reply_markup: {
                keyboard: keyboard,
                resize_keyboard: true
            }
        };
        bot.sendMessage(chatId, message, opts);
    } catch (e) {
        console.log('Ошибка showRobuxMenu:', e.message);
    }
}

bot.onText(/\/start/, (msg) => {
    console.log(`📨 /start от ${msg.chat.id}`);
    const chatId = msg.chat.id;
    showMainMenu(chatId);
});

bot.onText(/\/cancel/, async (msg) => {
    const chatId = msg.chat.id;
    if (waitingForNickname[chatId] || userOrders[chatId]) {
        delete waitingForNickname[chatId];
        delete userOrders[chatId];
        await bot.sendMessage(chatId, '✅ Заказ успешно отменен.');
        showMainMenu(chatId, '❌ Заказ отменен. Вы вернулись в главное меню.');
    } else {
        await bot.sendMessage(chatId, '❌ У вас нет активного заказа для отмены.');
        showMainMenu(chatId);
    }
});

bot.on('message', async (msg) => {
    try {
        const chatId = msg.chat.id;
        const text = msg.text;
        
        if (!text) return;
        
        console.log(`📩 Сообщение от ${chatId}: ${text}`);
        
        if (text === '🛒 Купить Robux') {
            showRobuxMenu(chatId);
            return;
        }
        
        if (text === '🆘 Поддержка') {
            await bot.sendMessage(chatId, '🆘 **Поддержка по невыполненным заказам**\n\nЕсли ваш заказ не был выполнен, напишите напрямую:\n👤 **@yokada_8007**\n\nОпишите проблему и укажите ваш ID заказа или имя пользователя.\nМы ответим в течение 24 часов!', { parse_mode: 'Markdown' });
            return;
        }
        
        if (text === '◀️ Назад в главное меню') {
            delete waitingForNickname[chatId];
            delete userOrders[chatId];
            showMainMenu(chatId, 'Вы вернулись в главное меню.');
            return;
        }
        
        if (text.includes('Robux') && !waitingForNickname[chatId]) {
            const amountMatch = text.match(/(\d+)\s*Robux/);
            if (amountMatch) {
                const amount = amountMatch[1];
                if (prices[amount]) {
                    const gamepassAmount = Math.round(prices[amount] * 1.3);
                    
                    userOrders[chatId] = {
                        amount: amount,
                        gamepassAmount: gamepassAmount
                    };
                    waitingForNickname[chatId] = true;
                    
                    await bot.sendMessage(chatId, `⚠️ **ВАЖНАЯ ИНФОРМАЦИЯ!**\n\nВы выбрали **${amount} Robux**.\n\n🔹 **ШАГ 1:** Создайте геймпасс в Roblox\n🔹 **ШАГ 2:** Установите цену геймпасса: **${gamepassAmount} Robux**\n🔹 **ШАГ 3:** Отправьте мне **ссылку на ваш геймпасс** или **никнейм в Roblox**\n\n📝 *Сумма геймпасса = ${amount} (заказ) + 30% = ${gamepassAmount} Robux*\n\n❌ Для отмены заказа используйте кнопку ниже`, { 
                        parse_mode: 'Markdown',
                        reply_markup: {
                            keyboard: [
                                [{ text: '❌ Отменить заказ' }, { text: '🆘 Поддержка' }]
                            ],
                            resize_keyboard: true
                        }
                    });
                } else {
                    await bot.sendMessage(chatId, '❌ Неверное количество Robux. Пожалуйста, выберите из списка.');
                    showRobuxMenu(chatId);
                }
            }
            return;
        }
        
        if (text === '❌ Отменить заказ') {
            delete waitingForNickname[chatId];
            delete userOrders[chatId];
            await bot.sendMessage(chatId, '✅ Заказ успешно отменен.');
            showMainMenu(chatId, '❌ Заказ отменен. Вы вернулись в главное меню.');
            return;
        }
        
        if (waitingForNickname[chatId] && userOrders[chatId]) {
            const nickname = text.trim();
            
            if (nickname.toLowerCase() === 'cancel') {
                delete waitingForNickname[chatId];
                delete userOrders[chatId];
                await bot.sendMessage(chatId, '✅ Заказ успешно отменен.');
                showMainMenu(chatId, '❌ Заказ отменен. Вы вернулись в главное меню.');
                return;
            }
            
            const username = msg.from.username ? `@${msg.from.username}` : `${msg.from.first_name} ${msg.from.last_name || ''}`;
            
            const orderMessage = `🛒 **НОВЫЙ ЗАКАЗ!**\n\n👤 Покупатель: ${username}\n🆔 ID: ${chatId}\n🎮 Roblox ник: ${nickname}\n💰 Заказано: ${userOrders[chatId].amount} Robux\n💸 Сумма геймпасса: ${userOrders[chatId].gamepassAmount} Robux\n📝 *Заказанная сумма: ${userOrders[chatId].amount} + 30% = ${userOrders[chatId].gamepassAmount} Robux*\n⏰ Время: ${new Date().toLocaleString('ru-RU')}`;
            
            await bot.sendMessage(SELLER_CHAT_ID, orderMessage, { parse_mode: 'Markdown' });
            
            await bot.sendMessage(chatId, `✅ **Заказ принят!**\n\n📋 Детали заказа:\n• Количество: ${userOrders[chatId].amount} Robux\n• Ваш ник: ${nickname}\n• Сумма для геймпасса: ${userOrders[chatId].gamepassAmount} Robux\n\n⚠️ **ВАЖНО:** Выставьте геймпасс в Roblox за **${userOrders[chatId].gamepassAmount} Robux**\n📝 *Расчет: ${userOrders[chatId].amount} Robux (заказ) + 30% (комиссия Roblox) = ${userOrders[chatId].gamepassAmount} Robux*\n\n🔄 Продавец свяжется с вами в течение 15 минут.\n⏳ Если заказ не выполнен в течение 24 часов, обратитесь в поддержку.\n\n🆘 Поддержка: @yokada_8007`, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        [{ text: '🛒 Купить еще Robux' }],
                        [{ text: '🆘 Поддержка' }]
                    ],
                    resize_keyboard: true
                }
            });
            
            delete waitingForNickname[chatId];
            delete userOrders[chatId];
        }
        
    } catch (error) {
        console.error('❌ Ошибка в обработчике сообщений:', error.message);
    }
});

console.log('🤖 Бот запущен и ожидает сообщений...');
