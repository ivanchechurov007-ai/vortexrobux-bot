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
const ADMIN_ID = '1772429926'; // Ваш ID для статистики

// Цены 1 к 1 (1 Robux = 1 рубль)
const prices = {
    '100': 100, '200': 200, '300': 300, '400': 400, '500': 500,
    '600': 600, '700': 700, '800': 800, '900': 900, '1000': 1000,
    '1500': 1500, '2000': 2000, '3000': 3000, '5000': 5000
};

// Хранение данных
const orders = {};
const userStats = {};
const orderHistory = {};
let orderCounter = 1000;

// Генерация уникального ID заказа
function generateOrderId() {
    return `ROB${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// Главное меню
function showMainMenu(chatId, message = '🚀 VortexRobux – твой мгновенный путь к богатству в Roblox!\n💎 Купи Robux быстро, безопасно и дешево!\n⚡ Мгновенная доставка | 🔒 Безопасные платежи | 🛡 Гарантия\n👉 Выбирай действие ниже:') {
    const opts = {
        reply_markup: {
            keyboard: [
                [{ text: '🛒 Купить Robux' }],
                [{ text: '📦 Мои заказы' }, { text: '🏆 Статистика' }],
                [{ text: '🆘 Поддержка' }, { text: 'ℹ️ О магазине' }]
            ],
            resize_keyboard: true
        }
    };
    bot.sendMessage(chatId, message, opts);
}

// Меню выбора Robux
function showRobuxMenu(chatId) {
    const opts = {
        reply_markup: {
            keyboard: [
                [{ text: '100 Robux - 100₽' }, { text: '200 Robux - 200₽' }],
                [{ text: '300 Robux - 300₽' }, { text: '400 Robux - 400₽' }],
                [{ text: '500 Robux - 500₽' }, { text: '600 Robux - 600₽' }],
                [{ text: '700 Robux - 700₽' }, { text: '800 Robux - 800₽' }],
                [{ text: '900 Robux - 900₽' }, { text: '1000 Robux - 1000₽' }],
                [{ text: '1500 Robux - 1500₽' }, { text: '2000 Robux - 2000₽' }],
                [{ text: '📋 Быстрый заказ' }, { text: '🔄 Повторить заказ' }],
                [{ text: '◀️ Главное меню' }, { text: '🆘 Поддержка' }]
            ],
            resize_keyboard: true
        }
    };
    bot.sendMessage(chatId, '💰 Выберите количество Robux (цена 1:1):', opts);
}

// ==================== ИСТОРИЯ ЗАКАЗОВ ====================

function showOrderHistory(chatId) {
    if (!orderHistory[chatId] || orderHistory[chatId].length === 0) {
        bot.sendMessage(chatId, '📭 У вас еще нет заказов.\nНажмите "🛒 Купить Robux" чтобы сделать первый заказ!');
        return;
    }

    const userOrders = orderHistory[chatId].slice(-10).reverse(); // Последние 10 заказов
    
    let message = '📋 **История ваших заказов:**\n\n';
    
    userOrders.forEach((order, index) => {
        const statusIcons = {
            'completed': '✅',
            'paid': '💰',
            'pending': '⏳',
            'cancelled': '❌'
        };
        
        const statusText = {
            'completed': 'Выполнен',
            'paid': 'Оплачен',
            'pending': 'В обработке',
            'cancelled': 'Отменен'
        };
        
        message += `${index + 1}. ${statusIcons[order.status] || '📝'} **Заказ #${order.orderId}**\n`;
        message += ` • ${order.amount} Robux (${order.price} ₽)\n`;
        message += ` • Статус: ${statusText[order.status] || order.status}\n`;
        message += ` • Дата: ${order.date}\n\n`;
    });
    
    const opts = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🔄 Обновить', callback_data: 'refresh_history' },
                    { text: '📊 Статистика', callback_data: 'show_stats' }
                ],
                [
                    { text: '🛒 Новый заказ', callback_data: 'new_order' }
                ]
            ]
        }
    };
    
    bot.sendMessage(chatId, message, opts);
}

// ==================== СТАТИСТИКА ====================

function showUserStats(chatId) {
    if (!userStats[chatId]) {
        userStats[chatId] = {
            totalOrders: 0,
            totalSpent: 0,
            totalRobux: 0,
            lastOrderDate: null
        };
    }
    
    const stats = userStats[chatId];
    const message = `🏆 **Ваша статистика:**\n\n` +
                   `📊 Всего заказов: ${stats.totalOrders}\n` +
                   `💰 Потрачено всего: ${stats.totalSpent} ₽\n` +
                   `💎 Получено Robux: ${stats.totalRobux}\n` +
                   `📅 Последний заказ: ${stats.lastOrderDate || 'еще не было'}\n\n` +
                   `🎯 Средний чек: ${stats.totalOrders > 0 ? Math.round(stats.totalSpent / stats.totalOrders) : 0} ₽`;
    
    const opts = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📈 Лидеры', callback_data: 'show_leaders' },
                    { text: '🏅 Мои достижения', callback_data: 'show_achievements' }
                ],
                [
                    { text: '🔄 Обновить', callback_data: 'refresh_stats' }
                ]
            ]
        }
    };
    
    bot.sendMessage(chatId, message, opts);
}

// ==================== БЫСТРЫЙ ЗАКАЗ ====================

function quickOrder(chatId, lastOrder = null) {
    const quickAmounts = [100, 500, 1000, 2000];
    
    let message = '⚡ **Быстрый заказ:**\nВыберите количество Robux:';
    
    if (lastOrder) {
        message += `\n\n🔄 Последний заказ: ${lastOrder.amount} Robux`;
    }
    
    const keyboard = quickAmounts.map(amount => {
        return [{ text: `${amount} Robux - ${amount}₽`, callback_data: `quick_${amount}` }];
    });
    
    keyboard.push([{ text: '◀️ Назад', callback_data: 'back_to_menu' }]);
    
    const opts = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
    
    bot.sendMessage(chatId, message, opts);
}

// ==================== КОМАНДЫ БОТА ====================

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    console.log(`📨 /start от ${chatId}`);
    showMainMenu(chatId);
});

bot.onText(/\/stats/, (msg) => {
    showUserStats(msg.chat.id);
});

bot.onText(/\/history/, (msg) => {
    showOrderHistory(msg.chat.id);
});

bot.onText(/\/admin/, (msg) => {
    if (msg.chat.id.toString() === ADMIN_ID) {
        const totalOrders = Object.keys(orders).length;
        const activeOrders = Object.values(orders).filter(o => o.status === 'pending' || o.status === 'paid').length;
        
        let totalRevenue = 0;
        Object.values(orderHistory).forEach(userOrders => {
            userOrders.forEach(order => {
                if (order.status === 'completed' || order.status === 'paid') {
                    totalRevenue += order.price;
                }
            });
        });
        
        const message = `👑 **Админ-панель**\n\n` +
                       `📊 Всего заказов: ${totalOrders}\n` +
                       `⏳ Активных: ${activeOrders}\n` +
                       `💰 Выручка: ${totalRevenue} ₽\n` +
                       `👥 Пользователей: ${Object.keys(orderHistory).length}`;
        
        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📋 Активные заказы', callback_data: 'admin_active' },
                        { text: '💰 Финансы', callback_data: 'admin_finance' }
                    ],
                    [
                        { text: '📢 Рассылка', callback_data: 'admin_broadcast' },
                        { text: '⚙️ Настройки', callback_data: 'admin_settings' }
                    ]
                ]
            }
        };
        
        bot.sendMessage(ADMIN_ID, message, opts);
    }
});

// ==================== ОБРАБОТКА СООБЩЕНИЙ ====================

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    if (!text) return;
    
    console.log(`📩 Сообщение от ${chatId}: ${text}`);
    
    // 🆘 Поддержка (работает всегда)
    if (text === '🆘 Поддержка') {
        const supportMessage = '🆘 **Поддержка VortexRobux**\n\n' +
                             '📞 Техническая поддержка: @yokada_8007\n' +
                             '⏰ Рабочее время: 24/7\n' +
                             '⏳ Время ответа: до 15 минут\n\n' +
                             '📋 При обращении укажите:\n' +
                             '• Номер заказа (если есть)\n' +
                             '• Ваш ID: `' + chatId + '`\n' +
                             '• Описание проблемы';
        
        bot.sendMessage(chatId, supportMessage, { parse_mode: 'Markdown' });
        return;
    }
    
    // ℹ️ О магазине
    if (text === 'ℹ️ О магазине') {
        const aboutMessage = '🏪 **VortexRobux**\n\n' +
                           '🌟 **Преимущества:**\n' +
                           '• ⚡ Мгновенная доставка\n' +
                           '• 🔒 Безопасные платежи\n' +
                           '• 🛡 Гарантия возврата\n' +
                           '• 👑 Лучшие цены 1:1\n\n' +
                           '📊 **Статистика магазина:**\n' +
                           '• 🎮 1000+ довольных игроков\n' +
                           '• 💎 50000+ проданных Robux\n' +
                           '• ⭐ 99% положительных отзывов\n\n' +
                           '💌 **Контакты:** @yokada_8007';
        
        bot.sendMessage(chatId, aboutMessage, { parse_mode: 'Markdown' });
        return;
    }
    
    // 📦 Мои заказы
    if (text === '📦 Мои заказы') {
        showOrderHistory(chatId);
        return;
    }
    
    // 🏆 Статистика
    if (text === '🏆 Статистика') {
        showUserStats(chatId);
        return;
    }
    
    // 🛒 Купить Robux
    if (text === '🛒 Купить Robux') {
        showRobuxMenu(chatId);
        return;
    }
    
    // 📋 Быстрый заказ
    if (text === '📋 Быстрый заказ') {
        const lastOrder = orderHistory[chatId] ? orderHistory[chatId][orderHistory[chatId].length - 1] : null;
        quickOrder(chatId, lastOrder);
        return;
    }
    
    // 🔄 Повторить заказ
    if (text === '🔄 Повторить заказ') {
        if (!orderHistory[chatId] || orderHistory[chatId].length === 0) {
            bot.sendMessage(chatId, '📭 У вас нет предыдущих заказов для повторения.');
            return;
        }
        
        const lastOrder = orderHistory[chatId][orderHistory[chatId].length - 1];
        const message = `🔄 **Повторить заказ**\n\n` +
                       `Последний заказ: #${lastOrder.orderId}\n` +
                       `Количество: ${lastOrder.amount} Robux\n` +
                       `Сумма: ${lastOrder.price} ₽\n\n` +
                       `Создать такой же заказ?`;
        
        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Да, повторить', callback_data: `repeat_${lastOrder.orderId}` },
                        { text: '❌ Нет', callback_data: 'cancel_repeat' }
                    ]
                ]
            }
        };
        
        bot.sendMessage(chatId, message, opts);
        return;
    }
    
    // ◀️ Главное меню
    if (text === '◀️ Главное меню') {
        showMainMenu(chatId);
        return;
    }
    
    // Выбор количества Robux из списка
    if (text.includes('Robux') && !orders[chatId]) {
        const amountMatch = text.match(/(\d+)\s*Robux/);
        if (amountMatch) {
            const amount = amountMatch[1];
            if (prices[amount]) {
                const gamepassAmount = Math.round(prices[amount] * 1.3);
                const orderId = generateOrderId();
                
                orders[chatId] = {
                    orderId: orderId,
                    buyerId: chatId,
                    buyerName: msg.from.username ? `@${msg.from.username}` : `${msg.from.first_name} ${msg.from.last_name || ''}`,
                    amount: amount,
                    price: prices[amount],
                    gamepassAmount: gamepassAmount,
                    status: 'awaiting_nickname',
                    date: new Date().toLocaleString('ru-RU'),
                    step: 'select_amount'
                };
                
                const gamepassMessage = `⚠️ **ВАЖНАЯ ИНФОРМАЦИЯ!**\n\n` +
                                      `Вы выбрали **${amount} Robux** за **${prices[amount]} ₽**\n\n` +
                                      `🔹 **ШАГ 1:** Создайте геймпасс в Roblox\n` +
                                      `🔹 **ШАГ 2:** Установите цену геймпасса: **${gamepassAmount} Robux**\n` +
                                      `🔹 **ШАГ 3:** Отправьте мне **ссылку на ваш геймпасс** или **никнейм в Roblox**\n\n` +
                                      `📝 *Сумма геймпасса = ${amount} (заказ) + 30% = ${gamepassAmount} RobUX*\n\n` +
                                      `❌ Для отмены напишите "отмена"`;
                
                bot.sendMessage(chatId, gamepassMessage, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, '❌ Неверное количество Robux. Пожалуйста, выберите из списка.');
            }
        }
        return;
    }
    
    // Ввод никнейма после выбора количества
    if (orders[chatId] && orders[chatId].status === 'awaiting_nickname') {
        const nickname = text.trim();
        
        if (text.toLowerCase() === 'отмена') {
            delete orders[chatId];
            showMainMenu(chatId, '❌ Заказ отменен.');
            return;
        }
        
        // Обновляем заказ
        orders[chatId].robloxNickname = nickname;
        orders[chatId].status = 'pending';
        orders[chatId].step = 'completed';
        
        // Добавляем в историю
        if (!orderHistory[chatId]) {
            orderHistory[chatId] = [];
        }
        orderHistory[chatId].push({
            ...orders[chatId],
            historyDate: new Date().toISOString()
        });
        
        // Обновляем статистику пользователя
        if (!userStats[chatId]) {
            userStats[chatId] = {
                totalOrders: 0,
                totalSpent: 0,
                totalRobux: 0,
                lastOrderDate: null
            };
        }
        userStats[chatId].totalOrders++;
        userStats[chatId].totalSpent += orders[chatId].price;
        userStats[chatId].totalRobux += parseInt(orders[chatId].amount);
        userStats[chatId].lastOrderDate = orders[chatId].date;
        
        // Сообщение покупателю
        const confirmation = `✅ **Заказ оформлен!**\n\n` +
                           `📋 **Детали заказа:**\n\n` +
                           `🆔 **Номер заказа:** ${orders[chatId].orderId}\n` +
                           `💰 **Сумма:** ${orders[chatId].price} ₽\n` +
                           `🎮 **Ваш ник:** ${nickname}\n` +
                           `💎 **Robux:** ${orders[chatId].amount}\n\n` +
                           `📞 **Для оплаты и получения реквизитов свяжитесь с продавцом:** @yokada_8007\n\n` +
                           `⏳ **Статус:** Ожидает оплаты\n\n` +
                           `💬 После оплаты нажмите "✅ Я оплатил" в меню заказов`;
        
        const opts = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📞 Написать продавцу', url: 'https://t.me/yokada_8007' },
                        { text: '✅ Я оплатил', callback_data: `paid_${orders[chatId].orderId}` }
                    ],
                    [
                        { text: '📦 Мои заказы', callback_data: 'my_orders' },
                        { text: '🆘 Поддержка', callback_data: 'need_help' }
                    ]
                ]
            }
        };
        
        bot.sendMessage(chatId, confirmation, opts);
        
        // Отправляем заказ продавцу
        sendOrderToSeller(orders[chatId]);
        
        // Очищаем временные данные
        delete orders[chatId];
    }
});

// ==================== ОТПРАВКА ЗАКАЗА ПРОДАВЦУ ====================

function sendOrderToSeller(orderData) {
    const sellerMessage = `🛒 **НОВЫЙ ЗАКАЗ #${orderData.orderId}**\n\n` +
                        `👤 **Покупатель:** ${orderData.buyerName}\n` +
                        `🆔 **ID:** ${orderData.buyerId}\n` +
                        `📞 **Написать:** [Тык](${`tg://user?id=${orderData.buyerId}`})\n` +
                        `🎮 **Roblox ник:** ${orderData.robloxNickname}\n` +
                        `💰 **Сумма:** ${orderData.price} ₽\n` +
                        `💎 **Robux:** ${orderData.amount}\n` +
                        `📅 **Дата:** ${orderData.date}\n` +
                        `📊 **Статус:** Ожидает оплаты`;
    
    const keyboard = [
        [
            { text: '📞 Написать', url: `tg://user?id=${orderData.buyerId}` },
            { text: '💰 Подтвердить оплату', callback_data: `seller_confirm_${orderData.orderId}` }
        ],
        [
            { text: '✅ Выполнить заказ', callback_data: `seller_complete_${orderData.orderId}` },
            { text: '❌ Отменить', callback_data: `seller_cancel_${orderData.orderId}` }
        ],
        [
            { text: '📊 Статистика покупателя', callback_data: `seller_stats_${orderData.buyerId}` }
        ]
    ];
    
    const opts = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
    
    bot.sendMessage(SELLER_CHAT_ID, sellerMessage, opts);
}

// ==================== ОБРАБОТКА CALLBACK-QUERY ====================

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;
    
    try {
        // 🔄 Обновить историю
        if (data === 'refresh_history') {
            bot.answerCallbackQuery(callbackQuery.id, { text: '🔄 Обновляю...' });
            showOrderHistory(userId);
            return;
        }
        
        // 📊 Показать статистику
        if (data === 'show_stats') {
            bot.answerCallbackQuery(callbackQuery.id, { text: '📊 Загружаю статистику...' });
            showUserStats(userId);
            return;
        }
        
        // 🛒 Новый заказ
        if (data === 'new_order') {
            bot.answerCallbackQuery(callbackQuery.id, { text: '🛒 Переход к покупкам...' });
            showRobuxMenu(userId);
            return;
        }
        
        // 📈 Лидеры
        if (data === 'show_leaders') {
            const allStats = Object.entries(userStats);
            const sortedStats = allStats.sort((a, b) => b[1].totalSpent - a[1].totalSpent).slice(0, 10);
            
            let message = '🏆 **Топ-10 покупателей:**\n\n';
            sortedStats.forEach(([userId, stats], index) => {
                message += `${index + 1}. ${stats.totalSpent} ₽ (${stats.totalRobux} Robux)\n`;
            });
            
            bot.answerCallbackQuery(callbackQuery.id);
            bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            return;
        }
        
        // 🏅 Достижения
        if (data === 'show_achievements') {
            const stats = userStats[userId] || { totalSpent: 0, totalOrders: 0 };
            const achievements = [];
            
            if (stats.totalSpent >= 1000) achievements.push('💰 Первая тысяча');
            if (stats.totalSpent >= 5000) achievements.push('💎 Платиновый клиент');
            if (stats.totalOrders >= 5) achievements.push('🎯 Постоянный покупатель');
            if (stats.totalOrders >= 10) achievements.push('👑 ВИП клиент');
            
            const message = achievements.length > 0 
                ? `🏅 **Ваши достижения:**\n\n${achievements.join('\n')}`
                : '🎯 Пока нет достижений. Совершайте покупки чтобы получить их!';
            
            bot.answerCallbackQuery(callbackQuery.id);
            bot.sendMessage(userId, message);
            return;
        }
        
        // 🔄 Обновить статистику
        if (data === 'refresh_stats') {
            bot.answerCallbackQuery(callbackQuery.id, { text: '🔄 Обновляю...' });
            showUserStats(userId);
            return;
        }
        
        // ⚡ Быстрый заказ
        if (data.startsWith('quick_')) {
            const amount = data.split('_')[1];
            const price = prices[amount];
            
            bot.answerCallbackQuery(callbackQuery.id, { text: `⚡ Создаю заказ на ${amount} Robux...` });
            
            const orderId = generateOrderId();
            orders[userId] = {
                orderId: orderId,
                buyerId: userId,
                buyerName: callbackQuery.from.username ? `@${callbackQuery.from.username}` : callbackQuery.from.first_name,
                amount: amount,
                price: price,
                gamepassAmount: Math.round(price * 1.3),
                status: 'awaiting_nickname',
                date: new Date().toLocaleString('ru-RU')
            };
            
            const message = `⚡ **Быстрый заказ:** ${amount} Robux\n\n` +
                          `Введите ваш никнейм в Roblox:`;
            
            bot.sendMessage(userId, message);
            return;
        }
        
        // ◀️ Назад в меню
        if (data === 'back_to_menu') {
            bot.answerCallbackQuery(callbackQuery.id, { text: '◀️ Возвращаюсь...' });
            showMainMenu(userId);
            return;
        }
        
        // 🔄 Повторить заказ
        if (data.startsWith('repeat_')) {
            const orderId = data.split('_')[1];
            const userOrders = orderHistory[userId] || [];
            const targetOrder = userOrders.find(o => o.orderId === orderId);
            
            if (targetOrder) {
                bot.answerCallbackQuery(callbackQuery.id, { text: '🔄 Повторяю заказ...' });
                
                orders[userId] = {
                    ...targetOrder,
                    orderId: generateOrderId(),
                    status: 'awaiting_nickname',
                    date: new Date().toLocaleString('ru-RU')
                };
                
                const message = `🔄 **Повтор заказа #${orderId}**\n\n` +
                              `Количество: ${targetOrder.amount} Robux\n` +
                              `Сумма: ${targetOrder.price} ₽\n\n` +
                              `Введите ваш никнейм в Roblox:`;
                
                bot.sendMessage(userId, message);
            }
            return;
        }
        
        // ❌ Отмена повторения
        if (data === 'cancel_repeat') {
            bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Отменено' });
            showMainMenu(userId);
            return;
        }
        
        // ✅ Я оплатил (покупатель)
        if (data.startsWith('paid_')) {
            const orderId = data.split('_')[1];
            
            bot.answerCallbackQuery(callbackQuery.id, { 
                text: '✅ Уведомление отправлено продавцу' 
            });
            
            // Уведомляем продавца
            bot.sendMessage(SELLER_CHAT_ID, 
                `⚠️ **Покупатель утверждает, что оплатил заказ**\n` +
                `Заказ #${orderId}\n` +
                `Проверьте поступление средств.`,
                { parse_mode: 'Markdown' }
            );
            
            // Обновляем статус в истории
            const userOrders = orderHistory[userId] || [];
            const orderIndex = userOrders.findIndex(o => o.orderId === orderId);
            if (orderIndex !== -1) {
                userOrders[orderIndex].status = 'paid';
            }
            
            bot.sendMessage(userId, 
                '✅ Продавец получил уведомление об оплате.\n' +
                'Ожидайте подтверждения и выполнения заказа.'
            );
            return;
        }
        
        // 📦 Мои заказы (из кнопки)
        if (data === 'my_orders') {
            bot.answerCallbackQuery(callbackQuery.id);
            showOrderHistory(userId);
            return;
        }
        
        // 🆘 Нужна помощь
        if (data === 'need_help') {
            bot.answerCallbackQuery(callbackQuery.id, { text: '🆘 Открываю поддержку...' });
            
            const supportMessage = '🆘 **Нужна помощь с заказом?**\n\n' +
                                 'Напишите напрямую продавцу:\n' +
                                 '📞 @yokada_8007\n\n' +
                                 'Укажите номер вашего заказа.';
            
            bot.sendMessage(userId, supportMessage);
            return;
        }
        
        // ========== ДЛЯ ПРОДАВЦА ==========
        if (chatId.toString() === SELLER_CHAT_ID) {
            // ✅ Подтвердить оплату
            if (data.startsWith('seller_confirm_')) {
                const orderId = data.split('_')[2];
                
                // Ищем заказ по всем пользователям
                let targetUserId = null;
                let targetOrder = null;
                
                for (const [userId, userOrders] of Object.entries(orderHistory)) {
                    const foundOrder = userOrders.find(o => o.orderId === orderId);
                    if (foundOrder) {
                        targetUserId = userId;
                        targetOrder = foundOrder;
                        break;
                    }
                }
                
                if (targetOrder && targetUserId) {
                    // Обновляем статус
                    targetOrder.status = 'paid';
                    
                    // Уведомляем покупателя
                    bot.sendMessage(targetUserId,
                        `✅ **Оплата подтверждена!**\n\n` +
                        `Заказ #${orderId} успешно оплачен.\n` +
                        `Продавец приступил к выполнению.\n\n` +
                        `⏳ Ожидайте зачисления Robux (5-15 минут)`
                    );
                    
                    // Обновляем сообщение продавца
                    const updatedText = callbackQuery.message.text.replace(
                        '📊 **Статус:** Ожидает оплаты',
                        '📊 **Статус:** ✅ Оплачен'
                    );
                    
                    bot.editMessageText(updatedText, {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown'
                    });
                    
                    bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Оплата подтверждена' });
                }
                return;
            }
            
            // ✅ Выполнить заказ
            if (data.startsWith('seller_complete_')) {
                const orderId = data.split('_')[2];
                
                // Ищем заказ
                let targetUserId = null;
                let targetOrder = null;
                
                for (const [userId, userOrders] of Object.entries(orderHistory)) {
                    const foundOrder = userOrders.find(o => o.orderId === orderId);
                    if (foundOrder) {
                        targetUserId = userId;
                        targetOrder = foundOrder;
                        break;
                    }
                }
                
                if (targetOrder && targetUserId) {
                    // Обновляем статус
                    targetOrder.status = 'completed';
                    
                    // Уведомляем покупателя
                    bot.sendMessage(targetUserId,
                        `🎉 **Заказ выполнен!**\n\n` +
                        `✅ Заказ #${orderId} успешно выполнен!\n` +
                        `💰 Вы получили: ${targetOrder.amount} Robux\n\n` +
                        `🎮 Приятной игры! Если возникнут проблемы, обратитесь в поддержку.\n` +
                        `📞 Поддержка: @yokada_8007\n\n` +
                        `🛒 Ждем вас снова!`
                    );
                    
                    // Обновляем сообщение продавца
                    const updatedText = callbackQuery.message.text.replace(
                        /📊 \*\*Статус:\*\* .+/,
                        '📊 **Статус:** ✅ Выполнен'
                    ) + `\n\n⏰ Выполнено: ${new Date().toLocaleString('ru-RU')}`;
                    
                    bot.editMessageText(updatedText, {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown'
                    });
                    
                    bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Заказ выполнен' });
                }
                return;
            }
            
            // ❌ Отменить заказ (продавец)
            if (data.startsWith('seller_cancel_')) {
                const orderId = data.split('_')[2];
                
                // Ищем заказ
                let targetUserId = null;
                let targetOrder = null;
                
                for (const [userId, userOrders] of Object.entries(orderHistory)) {
                    const foundOrder = userOrders.find(o => o.orderId === orderId);
                    if (foundOrder) {
                        targetUserId = userId;
                        targetOrder = foundOrder;
                        break;
                    }
                }
                
                if (targetOrder && targetUserId) {
                    // Обновляем статус
                    targetOrder.status = 'cancelled';
                    
                    // Уведомляем покупателя
                    bot.sendMessage(targetUserId,
                        `❌ **Заказ отменен**\n\n` +
                        `Заказ #${orderId} отменен продавцом.\n\n` +
                        `Если это ошибка, обратитесь в поддержку:\n` +
                        `📞 @yokada_8007`
                    );
                    
                    // Обновляем сообщение продавца
                    const updatedText = callbackQuery.message.text.replace(
                        /📊 \*\*Статус:\*\* .+/,
                        '📊 **Статус:** ❌ Отменен'
                    );
                    
                    bot.editMessageText(updatedText, {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown'
                    });
                    
                    bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Заказ отменен' });
                }
                return;
            }
            
            // 📊 Статистика покупателя
            if (data.startsWith('seller_stats_')) {
                const buyerId = data.split('_')[2];
                const stats = userStats[buyerId];
                
                if (stats) {
                    const message = `📊 **Статистика покупателя ${buyerId}:**\n\n` +
                                   `📦 Всего заказов: ${stats.totalOrders}\n` +
                                   `💰 Потрачено: ${stats.totalSpent} ₽\n` +
                                   `💎 Robux: ${stats.totalRobux}\n` +
                                   `📅 Последний заказ: ${stats.lastOrderDate || 'нет'}`;
                    
                    bot.answerCallbackQuery(callbackQuery.id);
                    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                } else {
                    bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Нет данных о покупателе' });
                }
                return;
            }
            
            // 👑 Админ-панель функции
            if (data === 'admin_active') {
                const activeOrders = [];
                
                for (const [userId, userOrders] of Object.entries(orderHistory)) {
                    const active = userOrders.filter(o => o.status === 'pending' || o.status === 'paid');
                    activeOrders.push(...active);
                }
                
                const message = activeOrders.length > 0
                    ? `📋 **Активные заказы (${activeOrders.length}):**\n\n` +
                      activeOrders.map((o, i) => 
                          `${i+1}. #${o.orderId} - ${o.amount} Robux (${o.status})`
                      ).join('\n')
                    : '📭 Нет активных заказов';
                
                bot.answerCallbackQuery(callbackQuery.id);
                bot.sendMessage(chatId, message);
                return;
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка в callback_query:', error.message);
        bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Произошла ошибка' });
    }
});

// ==================== ОБРАБОТКА ОШИБОК ====================

bot.on('polling_error', (error) => {
    console.log('⚠️ Ошибка polling:', error.message);
});

// ==================== ПЕРИОДИЧЕСКИЕ ЗАДАЧИ ====================

// Очистка старых заказов каждые 24 часа
setInterval(() => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    for (const userId in orders) {
        const order = orders[userId];
        if (order && order.timestamp && (now - order.timestamp) > twentyFourHours) {
            delete orders[userId];
        }
    }
}, 24 * 60 * 60 * 1000);

// ==================== ЗАПУСК БОТА ====================

console.log('🤖 Бот запущен и готов к работе!');
console.log('📊 Система настроена для Render');
console.log('💰 Цены: 1 Robux = 1 рубль');
console.log('📈 Доступные функции:');
console.log(' • История заказов');
console.log(' • Статистика пользователей');
console.log(' • Быстрый заказ');
console.log(' • Повтор заказа');
console.log(' • Топ покупателей');
console.log(' • Админ-панель');
console.log(' • Поддержка 24/7');
