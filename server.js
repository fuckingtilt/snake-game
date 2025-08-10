// --- Підключаємо необхідні бібліотеки ---
const express = require('express'); // Каркас для створення сервера
const cors = require('cors');     // Дозволяє грі спілкуватися з сервером
const fs = require('fs');         // Для роботи з файлами (нашою базою даних)

// --- Налаштування сервера ---
const app = express();
const PORT = 3000; // Порт, на якому буде працювати сервер
const DB_FILE = './database.json'; // Шлях до нашої бази даних

// --- Додаємо "посередників" ---
app.use(cors()); // Включаємо CORS
app.use(express.json()); // Дозволяємо серверу розуміти дані у форматі JSON

// --- Функція для читання даних з файлу ---
function readDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        return { scores: [], coins: [] };
    }
    const data = fs.readFileSync(DB_FILE);
    return JSON.parse(data);
}

// --- Функція для запису даних у файл ---
function writeDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- ГОЛОВНА ЛОГІКА СЕРВЕРА ---

// 1. Коли гра хоче отримати таблиці лідерів
app.get('/leaderboard', (req, res) => {
    console.log('Запит на отримання лідербордів');
    const db = readDatabase();
    res.json(db); // Відправляємо дані з бази у відповідь
});

// 2. Коли гра відправляє новий результат
app.post('/leaderboard', (req, res) => {
    const { name, score, coins } = req.body;
    console.log(`Отримано новий результат: Ім'я - ${name}, Рахунок - ${score}, Монети - ${coins}`);

    const db = readDatabase();

    // --- Оновлюємо таблицю за очками ---
    const scoreIndex = db.scores.findIndex(p => p.name === name);
    if (scoreIndex !== -1) {
        // Якщо гравець вже є, оновлюємо, тільки якщо новий рахунок кращий
        if (score > db.scores[scoreIndex].score) {
            db.scores[scoreIndex].score = score;
        }
    } else {
        db.scores.push({ name, score });
    }

    // --- Оновлюємо таблицю за монетами ---
    const coinIndex = db.coins.findIndex(p => p.name === name);
    if (coinIndex !== -1) {
        // Завжди оновлюємо загальну кількість монет
        db.coins[coinIndex].coins = coins;
    } else {
        db.coins.push({ name, coins });
    }

    // Сортуємо та обрізаємо до 10 найкращих
    db.scores.sort((a, b) => b.score - a.score);
    db.coins.sort((a, b) => b.coins - a.coins);
    db.scores = db.scores.slice(0, 10);
    db.coins = db.coins.slice(0, 10);

    writeDatabase(db); // Зберігаємо оновлені дані

    res.status(200).json({ message: 'Результат збережено' });
});


// --- Запуск сервера ---
app.listen(PORT, () => {
    console.log(`Сервер гри запущено на http://localhost:${PORT}`);
});