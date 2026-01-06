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
        polling: true
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

// Функция главного меню
function showMainMenu(chatId, message = '🚀 VortexRobux – твой мгновенный путь к богатству в Roblox!\n💎 Купи Robux быстро, безопасно и дешево!\n⚡ Мгновенная доставка | 🔒 Безопасные платежи | 🛡 Гарантия\n👉 Выбирай действие ниже:') {
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
}

// Функция меню выбора Robux
function showRobuxMenu(chatId) {
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
}

// Функция для кнопки отмены
function showCancelMenu(chatId) {
    const opts = {
        reply_markup: {
            keyboard: [
                [{ text: '❌ Отменить заказ' }, { text: '🆘 Поддержка' }]
            ],
            resize_keyboard: true
        }
    };
    return opts;
}

// Функция для отправки заказа продавцу с кнопкой выполнения
function sendOrderToSeller(orderId, orderData) {
    const orderMessage = `🛒 **НОВЫЙ ЗАКАЗ #${orderId}**\n\n` +
                       `👤 Покупатель: ${orderData.username}\n` +
                       `🆔 ID: ${orderData.userId}\n` +
                       `🎮 Roblox ник/ссылка: ${orderData.nickname}\n` +
                       `💰 Заказано: ${orderData.amount} Robux\n` +
                       `💸 Сумма геймпасса: ${orderData.gamepassAmount} Robux\n` +
                       `📝 *Расчет: ${orderData.amount} + 30% = ${orderData.gamepassAmount} Robux*\n` +
                       `⏰ Время: ${new Date().toLocaleString('ru-RU')}`;
    
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '✅ Заказ выполнен', callback_data: `complete_${orderId}` }]
            ]
        },
        parse_mode: 'Markdown'
    };
    
    bot.sendMessage(SELLER_CHAT_ID, orderMessage, opts);
}

// Обработка нажатий на inline-кнопки (для продавца)
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data.startsWith('complete_')) {
        const orderId = data.split('_')[1];
        const order = orders[orderId];
        
        if (order) {
            // Отправляем уведомление покупателю
            const completionMessage = `✅ **Ваш заказ #${orderId} выполнен!**\n\n` +
                                   `💰 Вы получили: ${order.amount} Robux\n` +
                                   `🎮 Спасибо за покупку! Если возникнут проблемы, обратитесь в поддержку.\n\n` +
                                   `🆘 Поддержка: @yokada_8007`;
            
            bot.sendMessage(order.userId, completionMessage, {
                reply_markup: {
                    keyboard: [
                        [{ text: '🛒 Купить еще Robux' }],
                        [{ text: '🆘 Поддержка' }]
                    ],
                    resize_keyboard: true
                },
                parse_mode: 'Markdown'
            });
            
            // Обновляем сообщение у продавца
            const originalText = query.message.text;
            const updatedText = originalText + `\n\n✅ **ВЫПОЛНЕНО** ${new Date().toLocaleString('ru-RU')}`;
            
            bot.editMessageText(updatedText, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'Markdown'
            });
            
            // Удаляем заказ из памяти
            delete orders[orderId];
            
            // Отвечаем на callback
            bot.answerCallbackQuery(query.id, { text: 'Заказ отмечен как выполненный' });
        }
    }
});

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
    let activeOrderId = null;
    for (const [orderId, order] of Object.entries(orders)) {
        if (order.userId === chatId && order.status === 'active') {
            activeOrderId = orderId;
            break;
        }
    }
    
    if (activeOrderId) {
        delete orders[activeOrderId];
        bot.sendMessage(chatId, '✅ Заказ успешно отменен.');
        showMainMenu(chatId, '❌ Заказ отменен. Вы вернулись в главное меню.');
    } else {
        bot.sendMessage(chatId, '❌ У вас нет активного заказа для отмены.');
        showMainMenu(chatId);
    }
});

// Обработка всех сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (!text) return;
    
    console.log(`📩 Сообщение от ${chatId}: ${text}`);
    
    // Обработка кнопки "🛒 Купить Robux"
    if (text === '🛒 Купить Robux') {
        showRobuxMenu(chatId);
        return;
    }
    
    // Обработка кнопки "🆘 Поддержка" - ВСЕГДА РАБОТАЕТ
    if (text === '🆘 Поддержка') {
        const supportMessage = '🆘 **Поддержка по невыполненным заказам**\n\n' +
                             'Если ваш заказ не был выполнен, напишите напрямую:\n' +
                             '👤 **@yokada_8007**\n\n' +
                             'Опишите проблему и укажите ваш ID заказа или имя пользователя.\n' +
                             'Мы ответим в течение 24 часов!';
        
        bot.sendMessage(chatId, supportMessage, { parse_mode: 'Markdown' });
        return;
    }
    
    // Обработка кнопки "◀️ Назад в главное меню"
    if (text === '◀️ Назад в главное меню') {
        showMainMenu(chatId, 'Вы вернулись в главное меню.');
        return;
    }
    
    // Обработка кнопки "❌ Отменить заказ"
    if (text === '❌ Отменить заказ') {
        // Находим активный заказ пользователя
        let activeOrderId = null;
        for (const [orderId, order] of Object.entries(orders)) {
            if (order.userId === chatId && order.status === 'active') {
                activeOrderId = orderId;
                break;
            }
        }
        
        if (activeOrderId) {
            delete orders[activeOrderId];
            bot.sendMessage(chatId, '✅ Заказ успешно отменен.');
            showMainMenu(chatId, '❌ Заказ отменен. Вы вернулись в главное меню.');
        } else {
            bot.sendMessage(chatId, '❌ У вас нет активного заказа для отмены.');
            showMainMenu(chatId);
        }
        return;
    }
    
    // Обработка выбора количества Robux
    if (text.includes('Robux')) {
        const amountMatch = text.match(/(\d+)\s*Robux/);
        if (amountMatch) {
            const amount = amountMatch[1];
            if (prices[amount]) {
                const gamepassAmount = Math.round(prices[amount] * 1.3);
                
                // Сохраняем временные данные
                const tempOrder = {
                    userId: chatId,
                    amount: amount,
                    gamepassAmount: gamepassAmount,
                    username: msg.from.username ? `@${msg.from.username}` : `${msg.from.first_name} ${msg.from.last_name || ''}`,
                    status: 'selecting'
                };
                
                // Находим свободный ID
                let orderId;
                do {
                    orderId = orderCounter++;
                } while (orders[orderId]);
                
                orders[orderId] = tempOrder;
                
                // Отправляем сообщение с инструкцией по геймпассу
                const gamepassMessage = `⚠️ **ВАЖНАЯ ИНФОРМАЦИЯ!**\n\n` +
                                      `Вы выбрали **${amount} Robux**.\n\n` +
                                      `🔹 **ШАГ 1:** Создайте геймпасс в Roblox\n` +
                                      `🔹 **ШАГ 2:** Установите цену геймпасса: **${gamepassAmount} Robux**\n` +
                                      `🔹 **ШАГ 3:** Отправьте мне **ссылку на ваш геймпасс** или **никнейм в Roblox**\n\n` +
                                      `📝 *Сумма геймпасса = ${amount} (заказ) + 30% (комиссия Roblox) = ${gamepassAmount} Robux*\n\n` +
                                      `❌ Для отмены заказа используйте кнопку ниже`;
                
                bot.sendMessage(chatId, gamepassMessage, { 
                    parse_mode: 'Markdown',
                    reply_markup: showCancelMenu(chatId).reply_markup
                });
            } else {
                bot.sendMessage(chatId, '❌ Неверное количество Robux. Пожалуйста, выберите из списка.');
                showRobuxMenu(chatId);
            }
        }
        return;
    }
    
    // Обработка ввода никнейма/ссылки на геймпасс
    // Проверяем, есть ли у пользователя заказ в состоянии "selecting"
    let activeOrderId = null;
    let activeOrder = null;
    
    for (const [orderId, order] of Object.entries(orders)) {
        if (order.userId === chatId && order.status === 'selecting') {
            activeOrderId = orderId;
            activeOrder = order;
            break;
        }
    }
    
    if (activeOrder && activeOrderId) {
        const nickname = text.trim();
        
        // Обновляем заказ
        orders[activeOrderId] = {
            ...activeOrder,
            nickname: nickname,
            status: 'active'
        };
        
        // Отправляем подтверждение покупателю
        const confirmation = `✅ **Заказ оформлен!**\n\n` +
                           `📋 Детали заказа:\n` +
                           `• Номер заказа: #${activeOrderId}\n` +
                           `• Количество: ${activeOrder.amount} Robux\n` +
                           `• Ваш ник/ссылка: ${nickname}\n` +
                           `• Сумма для геймпасса: ${activeOrder.gamepassAmount} Robux\n\n` +
                           `⚠️ **ВАЖНО:** Выставьте геймпасс в Roblox за **${activeOrder.gamepassAmount} Robux**\n` +
                           `📝 *Расчет: ${activeOrder.amount} Robux (заказ) + 30% (комиссия Roblox) = ${activeOrder.gamepassAmount} Robux*\n\n` +
                           `💳 **ОПЛАТА:** После выставления геймпасса ожидайте, пока продавец свяжется с вами для оплаты.\n\n` +
                           `🔄 Продавец свяжется с вами в течение 15 минут.\n` +
                           `⏳ Если заказ не выполнен в течение 24 часов, обратитесь в поддержку.\n\n` +
                           `🆘 Поддержка: @yokada_8007`;
        
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
        
        // Отправляем заказ продавцу с кнопкой выполнения
        sendOrderToSeller(activeOrderId, orders[activeOrderId]);
    }
});

// Обработка ошибок
bot.on('polling_error', (error) => {
    console.log('⚠️ Ошибка polling:', error.message);
});

console.log('🤖 Бот запущен и готов к работе!');
