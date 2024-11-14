import { createServer } from 'http'
import { readFile } from 'fs/promises'
import WebSocket, { WebSocketServer } from 'ws'
import { join } from 'path'
import { fileURLToPath } from 'url'
const PORT = 8080
const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')
const FRONTEND_PATH = join(__dirname, '..', 'frontend', 'index.html')

const server = createServer(async (req, res) => {
  if (req.url === '/') {
    const html = await readFile(FRONTEND_PATH, 'utf-8')
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

const wss = new WebSocketServer({ server })
console.log('WebSocket server created')

wss.on('connection', (ws) => {
  console.log('Client connected')
  sendMetrics(ws)
  ws.on('error', console.error)
  ws.on('close', () => {
    console.log('Client disconnected')
  })
})
async function sendMetrics(ws) {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(metrics))
    }
  } catch (error) {
    console.error('Error collecting metrics:', error)
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Frontend path: ${FRONTEND_PATH}`)
})

setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      sendMetrics(client)
    }
  })
}, 1000)
