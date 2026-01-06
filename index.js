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
        bot.sendMessage(chatId, message, opts).catch(e => console.log('Ошибка отправки меню:', e.message));
    } catch (e) {
        console.log('Ошибка showMainMenu:', e.message);
    }
}

function showRobuxMenu(chatId, message = '💰 Выберите количество Robux для покупки:') {
    try {
        const keyboard = [];
        const amounts = Object.keys(prices);
        
        for (let i = 0; i < amounts.length; i += 2) {
            const row = [];
            row.push({ text: `${amounts[i]} Robux` });
            if (amounts[i + 1]) {
                row.push({ text: `${amounts[i + 1]} Robux` });
            }
            keyboard.push(row);
        }
        
        keyboard.push([{ text: '◀️ Назад в главное меню' }, { text: '🆘 Поддержка' }]);
        
        const opts = {
            reply_markup: {
                keyboard: keyboard,
                resize_keyboard: true
            }
        };
        bot.sendMessage(chatId, message, opts).catch(e => console.log('Ошибка отправки меню:', e.message));
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
    await cancelOrder(chatId);
});

async function cancelOrder(chatId) {
    if (waitingForNickname[chatId] || userOrders[chatId]) {
        delete waitingForNickname[chatId];
        delete userOrders[chatId];
        await bot.sendMessage(chatId, '✅ Заказ успешно отменен.').catch(e => console.log('Ошибка отмены:', e.message));
        showMainMenu(chatId, '❌ Заказ отменен. Вы вернулись в главное меню.');
    } else {
        await bot.sendMessage(chatId, '❌ У вас нет активного заказа для отмены.').catch(e => console.log('Ошибка:', e.message));
        showMainMenu(chatId);
    }
}

async function sendSupportMessage(chatId) {
    const supportMessage = '🆘 **Поддержка по невыполненным заказам**\n\n' +
                         'Если ваш заказ не был выполнен, напишите напрямую:\n' +
                         '👤 **@yokada_8007**\n\n' +
                         'Опишите проблему и укажите ваш ID заказа или имя пользователя.\n' +
                         'Мы ответим в течение 24 часов!';
    
    await bot.sendMessage(chatId, supportMessage, { parse_mode: 'Markdown' })
        .catch(e => console.log('Ошибка поддержки:', e.message));
}

bot.on('message', async (msg) => {
    try {
        const chatId = msg.chat.id;
        const text = msg.text;
        const username = msg.from.username ? `@${msg.from.username}` : `${msg.from.first_name} ${msg.from.last_name || ''}`;
        
        if (!text) return;
        
        console.log(`📩 Сообщение от ${chatId} (${username}): ${text}`);
        
        // Обработка команды поддержки
        if (text === '🆘 Поддержка') {
            await sendSupportMessage(chatId);
            return;
        }
        
        // Если пользователь в режиме ожидания никнейма
        if (waitingForNickname[chatId]) {
            console.log(`🔄 Обработка никнейма от ${chatId}: ${text}`);
            
            // Проверяем, не хочет ли пользователь отменить
            if (text === '❌ Отменить заказ' || text.toLowerCase() === 'отмена' || text.toLowerCase() === 'cancel') {
                await cancelOrder(chatId);
                return;
            }
            
            // Обрабатываем никнейм
            const nickname = text.trim();
            
            // Проверяем, есть ли данные о заказе
            if (!userOrders[chatId]) {
                console.log(`❌ Нет данных о заказе для ${chatId}`);
                await bot.sendMessage(chatId, '❌ Произошла ошибка. Пожалуйста, начните заказ заново.');
                showMainMenu(chatId);
                delete waitingForNickname[chatId];
                return;
            }
            
            // Сохраняем никнейм
            userOrders[chatId].nickname = nickname;
            userOrders[chatId].username = username;
            userOrders[chatId].userId = chatId;
            
            // Отправляем заказ продавцу
            const gamepassAmount = userOrders[chatId].gamepassAmount;
            const orderAmount = userOrders[chatId].amount;
            
            const orderMessage = `🛒 **НОВЫЙ ЗАКАЗ!**\n\n` +
                               `👤 Покупатель: ${username}\n` +
                               `🆔 ID: ${chatId}\n` +
                               `🎮 Roblox ник: ${nickname}\n` +
                               `💰 Заказано: ${orderAmount} Robux\n` +
                               `💸 Сумма геймпасса: ${gamepassAmount} Robux\n` +
                               `📝 *Заказанная сумма: ${orderAmount} + 30% = ${gamepassAmount} Robux*\n` +
                               `⏰ Время: ${new Date().toLocaleString('ru-RU')}`;
            
            console.log(`📤 Отправка заказа продавцу ${SELLER_CHAT_ID}`);
            await bot.sendMessage(SELLER_CHAT_ID, orderMessage, { parse_mode: 'Markdown' })
                .catch(e => console.log('Ошибка отправки продавцу:', e.message));
            
            // Подтверждение пользователю
            const confirmation = `✅ **Заказ принят!**\n\n` +
                               `📋 Детали заказа:\n` +
                               `• Количество: ${orderAmount} Robux\n` +
                               `• Ваш ник: ${nickname}\n` +
                               `• Сумма для геймпасса: ${gamepassAmount} Robux\n\n` +
                               `⚠️ **ВАЖНО:** Выставьте геймпасс в Roblox за **${gamepassAmount} Robux**\n` +
                               `📝 *Расчет: ${orderAmount} Robux (заказ) + 30% (комиссия Roblox) = ${gamepassAmount} Robux*\n\n` +
                               `🔄 Продавец свяжется с вами в течение 15 минут.\n` +
                               `⏳ Если заказ не выполнен в течение 24 часов, обратитесь в поддержку.\n\n` +
                               `🆘 Поддержка: @yokada_8007`;
            
            console.log(`📤 Отправка подтверждения пользователю ${chatId}`);
            await bot.sendMessage(chatId, confirmation, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        [{ text: '🛒 Купить еще Robux' }],
                        [{ text: '🆘 Поддержка' }]
                    ],
                    resize_keyboard: true
                }
            }).catch(e => console.log('Ошибка отправки подтверждения:', e.message));
            
            // Очищаем состояние
            console.log(`🧹 Очистка состояния для ${chatId}`);
            delete waitingForNickname[chatId];
            delete userOrders[chatId];
            
            return;
        }
        
        // Обработка других команд
        if (text === '🛒 Купить Robux') {
            showRobuxMenu(chatId);
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
                        price: prices[amount],
                        gamepassAmount: gamepassAmount
                    };
                    waitingForNickname[chatId] = true;
                    
                    console.log(`📝 Пользователь ${chatId} выбрал ${amount} Robux, сумма геймпасса: ${gamepassAmount}`);
                    
                    const gamepassMessage = `⚠️ **ВАЖНАЯ ИНФОРМАЦИЯ!**\n\n` +
                                          `Вы выбрали **${amount} Robux**.\n\n` +
                                          `🔹 **ШАГ 1:** Создайте геймпасс в Roblox\n` +
                                          `🔹 **ШАГ 2:** Установите цену геймпасса: **${gamepassAmount} Robux**\n` +
                                          `🔹 **ШАГ 3:** Отправьте мне **ссылку на ваш геймпасс** или **никнейм в Roblox**\n\n` +
                                          `📝 *Сумма геймпасса = ${amount} (заказ) + 30% = ${gamepassAmount} Robux*\n\n` +
                                          `❌ Для отмены заказа используйте кнопку ниже`;
                    
                    await bot.sendMessage(chatId, gamepassMessage, { 
                        parse_mode: 'Markdown',
                        reply_markup: {
                            keyboard: [
                                [{ text: '❌ Отменить заказ' }, { text: '🆘 Поддержка' }]
                            ],
                            resize_keyboard: true
                        }
                    }).catch(e => console.log('Ошибка отправки информации о геймпассе:', e.message));
                } else {
                    await bot.sendMessage(chatId, '❌ Неверное количество Robux. Пожалуйста, выберите из списка.')
                        .catch(e => console.log('Ошибка отправки сообщения:', e.message));
                    showRobuxMenu(chatId);
                }
            }
            return;
        }
        
        if (text === '❌ Отменить заказ') {
            await cancelOrder(chatId);
            return;
        }
        
    } catch (error) {
        console.error('❌ Ошибка в обработчике сообщений:', error.message, error.stack);
        
        // В случае ошибки сбрасываем состояние и показываем главное меню
        const chatId = msg.chat.id;
        delete waitingForNickname[chatId];
        delete userOrders[chatId];
        
        await bot.sendMessage(chatId, '❌ Произошла ошибка. Пожалуйста, попробуйте еще раз.')
            .catch(e => console.log('Ошибка отправки сообщения об ошибке:', e.message));
        showMainMenu(chatId);
    }
});

bot.on('polling_error', (error) => {
    console.error('Polling error:', error.code, error.message);
});

console.log('🤖 Бот запущен и ожидает сообщений...');
