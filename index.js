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
            autoStart: true
        }
    });
    console.log('✅ Бот подключен к Telegram!');
} catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    process.exit(1);
}

const SELLER_CHAT_ID = '1772429926';
const orders = {};
let orderCounter = 1;

const prices = {
    '100': 100, '200': 200, '300': 300, '400': 400, '500': 500,
    '600': 600, '700': 700, '800': 800, '900': 900, '1000': 1000
};

bot.on('polling_error', (error) => {
    console.log('⚠️ Ошибка polling:', error.message);
});

// Функция главного меню
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
        console.log('Ошибка в showMainMenu:', e.message);
    }
}

// Меню выбора Robux
function showRobuxMenu(chatId) {
    try {
        const opts = {
            reply_markup: {
                keyboard: [
                    [{ text: '100 Robux' }, { text: '200 Robux' }],
                    [{ text: '300 Robux' }, { text: '400 Robux' }],
                    [{ text: '500 Robux' }, { text: '600 Robux' }],
                    [{ text: '700 Robux' }, { text: '800 Robux' }],
                    [{ text: '900 Robux' }, { text: '1000 Robux' }],
                    [{ text: '◀️ Назад в главное меню' }, { text: '🆘 Поддержка' }]
                ],
                resize_keyboard: true
            }
        };
        bot.sendMessage(chatId, '💰 Выберите количество Robux для покупки:', opts);
    } catch (e) {
        console.log('Ошибка в showRobuxMenu:', e.message);
    }
}

// Команда /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    console.log(`📨 /start от ${chatId}`);
    showMainMenu(chatId);
});

// Команда /cancel
bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    
    // Находим активный заказ пользователя
    let activeOrder = null;
    for (const [orderId, order] of Object.entries(orders)) {
        if (order.buyerId === chatId && (order.status === 'pending' || order.status === 'awaiting_nickname')) {
            activeOrder = { orderId, order };
            break;
        }
    }
    
    if (activeOrder) {
        cancelOrder(activeOrder.orderId, 'buyer');
        showMainMenu(chatId, '❌ Заказ успешно отменен. Вы вернулись в главное меню.');
    } else {
        showMainMenu(chatId, '❌ У вас нет активного заказа для отмены.');
    }
});

// Функция отмены заказа
function cancelOrder(orderId, cancelledBy) {
    try {
        const order = orders[orderId];
        if (!order) return;
        
        orders[orderId].status = 'cancelled';
        
        // Уведомляем покупателя
        const buyerMessage = `❌ **Ваш заказ #${orderId} отменен**\n\n` +
                           `📋 Детали заказа:\n` +
                           `• Количество: ${order.amount} Robux\n` +
                           `• Отменен: ${cancelledBy === 'buyer' ? 'вами' : 'продавцом'}\n\n` +
                           `Если это ошибка, обратитесь в поддержку: @yokada_8007`;
        
        bot.sendMessage(order.buyerId, buyerMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    [{ text: '🛒 Купить Robux' }],
                    [{ text: '🆘 Поддержка' }]
                ],
                resize_keyboard: true
            }
        });
        
        // Уведомляем продавца, если он отменяет
        if (cancelledBy === 'seller') {
            bot.sendMessage(SELLER_CHAT_ID, `❌ Заказ #${orderId} отменен вами.`);
        }
    } catch (e) {
        console.log('Ошибка в cancelOrder:', e.message);
    }
}

// Функция завершения заказа
function completeOrder(orderId) {
    try {
        const order = orders[orderId];
        if (!order) return;
        
        orders[orderId].status = 'completed';
        
        // Уведомляем покупателя
        const buyerMessage = `✅ **Ваш заказ #${orderId} выполнен!**\n\n` +
                           `💰 Вы получили: ${order.amount} Robux\n` +
                           `🎮 Спасибо за покупку! Надеемся, вам понравится!\n\n` +
                           `📝 Если возникнут проблемы с получением Robux, обратитесь в поддержку: @yokada_8007`;
        
        bot.sendMessage(order.buyerId, buyerMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    [{ text: '🛒 Купить Robux' }],
                    [{ text: '🆘 Поддержка' }]
                ],
                resize_keyboard: true
            }
        });
    } catch (e) {
        console.log('Ошибка в completeOrder:', e.message);
    }
}

// Обработка всех сообщений
bot.on('message', (msg) => {
    try {
        const chatId = msg.chat.id;
        const text = msg.text;
        
        if (!text) return;
        
        console.log(`📩 Сообщение от ${chatId}: ${text}`);
        
        // ========== КНОПКА ПОДДЕРЖКИ (РАБОТАЕТ ВСЕГДА) ==========
        if (text === '🆘 Поддержка') {
            const supportMessage = '🆘 **Поддержка по невыполненным заказам**\n\n' +
                                 'Если ваш заказ не был выполнен или у вас возникли вопросы, напишите напрямую:\n' +
                                 '👤 **@yokada_8007**\n\n' +
                                 'Опишите проблему и укажите ваш ID заказа или имя пользователя.\n' +
                                 'Мы ответим в течение 24 часов!';
            
            bot.sendMessage(chatId, supportMessage, { parse_mode: 'Markdown' });
            return;
        }
        
        // ========== КНОПКА "КУПИТЬ ROBUX" ==========
        if (text === '🛒 Купить Robux') {
            showRobuxMenu(chatId);
            return;
        }
        
        // ========== КНОПКА "НАЗАД В ГЛАВНОЕ МЕНЮ" ==========
        if (text === '◀️ Назад в главное меню') {
            showMainMenu(chatId, 'Вы вернулись в главное меню.');
            return;
        }
        
        // ========== ОБРАБОТКА ВЫБОРА КОЛИЧЕСТВА ROBUX ==========
        if (text.includes('Robux')) {
            const amountMatch = text.match(/(\d+)\s*Robux/);
            if (amountMatch) {
                const amount = amountMatch[1];
                if (prices[amount]) {
                    const gamepassAmount = Math.round(prices[amount] * 1.3);
                    
                    // Создаем новый заказ
                    const orderId = orderCounter++;
                    orders[orderId] = {
                        orderId: orderId,
                        buyerId: chatId,
                        buyerName: msg.from.username ? `@${msg.from.username}` : `${msg.from.first_name} ${msg.from.last_name || ''}`,
                        amount: amount,
                        gamepassAmount: gamepassAmount,
                        status: 'awaiting_nickname',
                        date: new Date().toLocaleString('ru-RU')
                    };
                    
                    const gamepassMessage = `⚠️ **ВАЖНАЯ ИНФОРМАЦИЯ!**\n\n` +
                                          `Вы выбрали **${amount} Robux**.\n\n` +
                                          `🔹 **ШАГ 1:** Создайте геймпасс в Roblox\n` +
                                          `🔹 **ШАГ 2:** Установите цену геймпасса: **${gamepassAmount} Robux**\n` +
                                          `🔹 **ШАГ 3:** Отправьте мне **ссылку на ваш геймпасс** или **никнейм в Roblox**\n\n` +
                                          `📝 *Расчет геймпасса: ${amount} Robux (заказ) + 30% (комиссия Roblox) = ${gamepassAmount} Robux*\n\n` +
                                          `❌ Для отмены заказа используйте /cancel или напишите "отмена"`;
                    
                    bot.sendMessage(chatId, gamepassMessage, { 
                        parse_mode: 'Markdown'
                    });
                } else {
                    bot.sendMessage(chatId, '❌ Неверное количество Robux. Пожалуйста, выберите из списка.');
                    showRobuxMenu(chatId);
                }
            }
            return;
        }
        
        // ========== ОБРАБОТКА ВВОДА НИКНЕЙМА ==========
        // Ищем заказ в статусе awaiting_nickname для этого пользователя
        let awaitingOrderId = null;
        let awaitingOrder = null;
        
        for (const [orderId, order] of Object.entries(orders)) {
            if (order.buyerId === chatId && order.status === 'awaiting_nickname') {
                awaitingOrderId = orderId;
                awaitingOrder = order;
                break;
            }
        }
        
        if (awaitingOrder && awaitingOrderId) {
            const nickname = text.trim();
            
            // Проверяем, не хочет ли пользователь отменить заказ
            if (text.toLowerCase() === 'отмена' || text === '/cancel') {
                cancelOrder(awaitingOrderId, 'buyer');
                showMainMenu(chatId, '❌ Заказ отменен. Вы вернулись в главное меню.');
                return;
            }
            
            // Обновляем заказ
            orders[awaitingOrderId] = {
                ...awaitingOrder,
                robloxNickname: nickname,
                status: 'pending'
            };
            
            // Отправляем подтверждение покупателю
            const confirmation = `✅ **Заказ оформлен!**\n\n` +
                               `📋 **Детали вашего заказа:**\n\n` +
                               `🆔 Номер заказа: #${awaitingOrderId}\n` +
                               `💰 Количество: ${awaitingOrder.amount} Robux\n` +
                               `🎮 Ваш ник/ссылка: ${nickname}\n` +
                               `💎 Сумма геймпасса: ${awaitingOrder.gamepassAmount} Robux\n\n` +
                               `⚠️ **ВАЖНО:** Выставьте геймпасс в Roblox за **${awaitingOrder.gamepassAmount} Robux**\n` +
                               `📝 *Расчет: ${awaitingOrder.amount} Robux (заказ) + 30% (комиссия Roblox) = ${awaitingOrder.gamepassAmount} Robux*\n\n` +
                               `⏳ **Статус:** Ожидает оплаты\n\n` +
                               `💳 **Оплата:** После выставления геймпасса ожидайте, пока продавец свяжется с вами для оплаты.\n\n` +
                               `📞 **Поддержка:** @yokada_8007`;
            
            bot.sendMessage(chatId, confirmation, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        [{ text: '🛒 Купить еще Robux' }],
                        [{ text: '🆘 Поддержка' }]
                    ],
                    resize_keyboard: true
                }
            });
            
            // Отправляем заказ продавцу
            sendOrderToSeller(awaitingOrderId, orders[awaitingOrderId]);
        }
    } catch (error) {
        console.error('❌ Ошибка в обработчике сообщений:', error.message);
    }
});

// Отправка заказа продавцу с кнопками
function sendOrderToSeller(orderId, orderData) {
    try {
        const buyerLink = orderData.buyerName.startsWith('@') 
            ? `[${orderData.buyerName}](tg://user?id=${orderData.buyerId})`
            : orderData.buyerName;
        
        const orderMessage = `🛒 **НОВЫЙ ЗАКАЗ #${orderId}**\n\n` +
                           `👤 **Покупатель:** ${buyerLink}\n` +
                           `🆔 **ID:** ${orderData.buyerId}\n` +
                           `🎮 **Roblox ник/ссылка:** ${orderData.robloxNickname}\n` +
                           `💰 **Заказано:** ${orderData.amount} Robux\n` +
                           `💎 **Сумма геймпасса:** ${orderData.gamepassAmount} Robux\n` +
                           `📝 *Расчет: ${orderData.amount} + 30% = ${orderData.gamepassAmount} Robux*\n` +
                           `⏰ **Время:** ${orderData.date}\n` +
                           `📊 **Статус:** Ожидает оплаты`;
        
        // Создаем inline-клавиатуру для продавца
        const keyboard = [
            [
                {
                    text: '📞 Написать покупателю',
                    url: `tg://user?id=${orderData.buyerId}`
                }
            ],
            [
                {
                    text: '❌ Отменить заказ',
                    callback_data: `seller_cancel_${orderId}`
                },
                {
                    text: '✅ Выполнил заказ',
                    callback_data: `seller_complete_${orderId}`
                }
            ]
        ];
        
        const opts = {
            reply_markup: {
                inline_keyboard: keyboard
            },
            parse_mode: 'Markdown'
        };
        
        bot.sendMessage(SELLER_CHAT_ID, orderMessage, opts);
    } catch (e) {
        console.log('Ошибка в sendOrderToSeller:', e.message);
    }
}

// Обработка callback-query (нажатий на inline-кнопки продавца)
bot.on('callback_query', (callbackQuery) => {
    try {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        
        // Проверяем, что это сообщение от продавца
        if (chatId.toString() !== SELLER_CHAT_ID) {
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Эта функция доступна только продавцу!' });
            return;
        }
        
        if (data.startsWith('seller_cancel_')) {
            const orderId = data.split('_')[2];
            cancelOrder(orderId, 'seller');
            
            // Обновляем сообщение у продавца
            const originalText = callbackQuery.message.text;
            const updatedText = originalText.replace('📊 **Статус:** Ожидает оплаты', '📊 **Статус:** ❌ Отменен продавцом');
            
            bot.editMessageText(updatedText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            });
            
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Заказ отменен!' });
        }
        
        if (data.startsWith('seller_complete_')) {
            const orderId = data.split('_')[2];
            completeOrder(orderId);
            
            // Обновляем сообщение у продавца
            const originalText = callbackQuery.message.text;
            const updatedText = originalText.replace('📊 **Статус:** Ожидает оплаты', '📊 **Статус:** ✅ Выполнен');
            
            bot.editMessageText(updatedText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            });
            
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Заказ отмечен как выполненный!' });
        }
    } catch (e) {
        console.log('Ошибка в callback_query:', e.message);
    }
});

console.log('🤖 Бот запущен и готов к работе!');
