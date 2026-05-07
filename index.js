const express = require('express')
const session = require('express-session')
const Database = require('better-sqlite3')
const path = require('path')

const app = express()
const PORT = 3000

const db = new Database('users.db')
db.prepare('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)').run()
const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('demo')
if (!existing) {
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('demo', 'demo')
}

app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))
app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
}))

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login')
  next()
}

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard')
  res.redirect('/login')
})

app.get('/login', (req, res) => {
  res.render('login', { error: null })
})

app.post('/login', (req, res) => {
  const { username, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password)
  if (user) {
    req.session.user = { id: user.id, username: user.username }
    return res.redirect('/dashboard')
  }
  res.render('login', { error: 'Invalid credentials' })
})

app.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/login')
})

app.get('/dashboard', requireAuth, (req, res) => {
  const boards = [
    { name: 'STM32 Black Pill', slug: 'stm32-blackpill' },
    { name: 'Raspberry Pi Pico', slug: 'rpi-pico' },
    { name: 'Raspberry Pi Pico 2', slug: 'rpi-pico-2' },
    { name: 'Raspberry Pi Pico 2 W', slug: 'rpi-pico-2w' },
    { name: 'ESP32 DevKitC', slug: 'esp32-devkitc' },
  ]
  res.render('dashboard', { user: req.session.user, boards })
})

app.get('/pinout/:board', requireAuth, (req, res) => {
  const allowed = ['stm32-blackpill', 'rpi-pico', 'rpi-pico-2', 'rpi-pico-2w', 'esp32-devkitc']
  if (!allowed.includes(req.params.board)) return res.status(404).send('Board not found')
  res.render(`pinouts/${req.params.board}`, { user: req.session.user })
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
