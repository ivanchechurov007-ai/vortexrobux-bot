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

function showMainMenu(chatId, message = '🚀 VortexRobux – твой мгновенный путь к богатству в Roblox!\n💎 Купи Robux быстро, безопасно и дешево!\n⚡ Мгновенная доставка | 🔒 Безопасные платежи | 🛡 Гарантия\n👉 Выбирай товар ниже и погрузись в игру с новыми возможностями!') {
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

bot.onText(/\/start/, (msg) => {
    console.log(`📨 /start от ${msg.chat.id}`);
    const chatId = msg.chat.id;
    showMainMenu(chatId);
});

bot.onText(/\/support/, async (msg) => {
    const chatId = msg.chat.id;
    const supportMessage = '🆘 Поддержка по невыполненным заказам\n\nЕсли ваш заказ не был выполнен, напишите напрямую:\n👤 @yokada_8007\n\nОпишите проблему и укажите ваш ID заказа.';
    await bot.sendMessage(chatId, supportMessage).catch(e => console.log('Ошибка поддержки:', e.message));
});

bot.onText(/\/cancel/, async (msg) => {
    const chatId = msg.chat.id;
    if (waitingForNickname[chatId]) {
        delete waitingForNickname[chatId];
        delete userOrders[chatId];
        await bot.sendMessage(chatId, '✅ Заказ успешно отменен.').catch(e => console.log('Ошибка отмены:', e.message));
        showMainMenu(chatId);
    } else {
        await bot.sendMessage(chatId, '❌ У вас нет активного заказа для отмены.').catch(e => console.log('Ошибка:', e.message));
    }
});

bot.on('message', async (msg) => {
    try {
        const chatId = msg.chat.id;
        const text = msg.text;
        if (!text) return;
        
        if (text === '🆘 Поддержка') {
            console.log(`🆘 Кнопка поддержки нажата ${chatId}`);
            const supportMessage = '🆘 Поддержка по невыполненным заказам\n\nЕсли ваш заказ не был выполнен, напишите напрямую:\n👤 @yokada_8007\n\nОпишите проблему и укажите ваш ID заказа.';
            await bot.sendMessage(chatId, supportMessage).catch(e => console.log('Ошибка:', e.message));
            return;
        }
        
        if (text === '🏠 Главное меню') {
            delete waitingForNickname[chatId];
            delete userOrders[chatId];
            showMainMenu(chatId, 'Вы вернулись в главное меню!');
            return;
        }
        
        if (text === '❌ Отменить заказ') {
            if (waitingForNickname[chatId]) {
                delete waitingForNickname[chatId];
                delete userOrders[chatId];
                await bot.sendMessage(chatId, '✅ Заказ успешно отменен.').catch(e => console.log('Ошибка:', e.message));
                showMainMenu(chatId);
            } else {
                await bot.sendMessage(chatId, '❌ У вас нет активного заказа для отмены.').catch(e => console.log('Ошибка:', e.message));
            }
            return;
        }
        
        if (text === '🛒 Купить Robux' && !waitingForNickname[chatId]) {
            const buttons = [];
            const amounts = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'];
            for (let i = 0; i < amounts.length; i += 2) {
                const row = [];
                row.push({
                    text: `${amounts[i]} Robux - ${prices[amounts[i]]} руб.`,
                    callback_data: amounts[i]
                });
                if (i + 1 < amounts.length) {
                    row.push({
                        text: `${amounts[i + 1]} Robux - ${prices[amounts[i + 1]]} руб.`,
                        callback_data: amounts[i + 1]
                    });
                }
                buttons.push(row);
            }
            const opts = { 
                reply_markup: { inline_keyboard: buttons }
            };
            await bot.sendMessage(chatId, '🛒 VortexRobux\n\nМгновенная покупка Robux по лучшей цене! 💰\nНажми и закажи за пару минут! ⏱️', opts).catch(e => console.log('Ошибка:', e.message));
            return;
        }
        
        if (waitingForNickname[chatId] && text !== '🛒 Купить Robux' && !text.startsWith('/') && text !== '❌ Отменить заказ' && text !== '🆘 Поддержка' && text !== '🏠 Главное меню') {
            console.log(`📝 Получен ник ${text} от ${chatId}`);
            const nickname = text;
            const amount = waitingForNickname[chatId].amount;
            const price = prices[amount];
            const userMessage = `✅ Заказ оформлен!\n\nСпасибо за покупку в VortexRobux! 💙\nТвои Robux уже в пути! Ожидай доставку в течение нескольких минут. 📨\n\nДетали заказа:\n👤 Ник в Roblox: ${nickname}\n🎮 Количество Robux: ${amount}\n💰 Сумма к оплате: ${price} руб.\n\nРеквизиты для оплаты:\n🏦 Банк: Сбербанк\n📞 Номер карты: 2202 2084 2717 8570\n\n⚠️ Важно:\n1. Сохраните скриншот чека об оплате\n2. После оплаты отправьте скриншот в этот чат\n3. Доставка начнется сразу после подтверждения оплаты\n\nПо вопросам — нажми кнопку «🆘 Поддержка»! 👨‍💻`;
            const keyboardOpts = {
                reply_markup: {
                    keyboard: [
                        [{ text: '❌ Отменить заказ' }, { text: '🏠 Главное меню' }],
                        [{ text: '🆘 Поддержка' }]
                    ],
                    resize_keyboard: true
                }
            };
            await bot.sendMessage(chatId, userMessage, keyboardOpts).catch(e => console.log('Ошибка покупателю:', e.message));
            
            const adminMessage = `🛒 НОВЫЙ ЗАКАЗ!\n\nНик в Roblox: ${nickname}\nПакет: ${amount} Robux\nСумма: ${price} руб.\nID покупателя: ${chatId}\nВремя: ${new Date().toLocaleString('ru-RU')}\n\nЧат с покупателем: tg://user?id=${chatId}`;
            const adminKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📨 Написать покупателю', url: `tg://user?id=${chatId}` },
                            { text: '✅ Заказ выполнен', callback_data: `completed_${chatId}_${nickname}` }
                        ]
                    ]
                }
            };
            
            console.log(`📤 Отправляю заказ продавцу ${SELLER_CHAT_ID}`);
            await bot.sendMessage(SELLER_CHAT_ID, adminMessage, adminKeyboard).catch(e => console.log('❌ Ошибка отправки продавцу:', e.message));
            
            delete waitingForNickname[chatId];
            delete userOrders[chatId];
        }
    } catch (error) {
        console.error('Ошибка обработки сообщения:', error.message);
    }
});

bot.on('callback_query', async (query) => {
    try {
        const chatId = query.message.chat.id;
        const data = query.data;
        if (data.startsWith('completed_')) {
            const parts = data.split('_');
            const buyerId = parts[1];
            const nickname = parts[2];
            await bot.sendMessage(buyerId, `🎉 Ваш заказ выполнен!\n\nRobux для аккаунта ${nickname} были успешно отправлены.\nСпасибо за покупку в VortexRobux! Приятной игры! 🎮`).catch(e => console.log('Ошибка:', e.message));
            await bot.editMessageText(`✅ ЗАКАЗ ВЫПОЛНЕН\n\nПокупатель: ${nickname}\nID: ${buyerId}\nВремя выполнения: ${new Date().toLocaleString('ru-RU')}`, {
                chat_id: chatId,
                message_id: query.message.message_id
            }).catch(e => console.log('Ошибка:', e.message));
            await bot.answerCallbackQuery(query.id, { text: 'Покупатель уведомлен о выполнении заказа!' });
            return;
        }
        const amount = data;
        if (!userOrders[chatId]) userOrders[chatId] = {};
        userOrders[chatId].amount = amount;
        waitingForNickname[chatId] = { amount: amount };
        await bot.deleteMessage(chatId, query.message.message_id).catch(e => console.log('Ошибка удаления:', e.message));
        const keyboardOpts = {
            reply_markup: {
                keyboard: [
                    [{ text: '❌ Отменить заказ' }, { text: '🏠 Главное меню' }]
                ],
                resize_keyboard: true
            }
        };
        await bot.sendMessage(chatId, `Вы выбрали ${amount} Robux за ${prices[amount]} руб.\n\nТеперь введите ваш никнейм в Roblox:\n\nТочь-в-точь как в игре, без ошибок!`, keyboardOpts).catch(e => console.log('Ошибка:', e.message));
    } catch (error) {
        console.error('Ошибка callback:', error.message);
    }
});

console.log('================================');
console.log('🤖 VORTEXROBUX ЗАПУЩЕН НА RENDER!');
console.log('🌐 Веб-сервер работает на порту:', PORT);
console.log('👑 Продавец ID:', SELLER_CHAT_ID);
console.log('================================');