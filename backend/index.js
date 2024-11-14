import { createServer } from 'http'
import { readFile } from 'fs/promises'
import { cpus, totalmem, freemem, networkInterfaces } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import WebSocket, { WebSocketServer } from 'ws'
import { join } from 'path'
import { fileURLToPath } from 'url'
const execAsync = promisify(exec)
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

async function getCPUUsage() {
  const start = cpus().map((cpu) => cpu.times)
  await new Promise((resolve) => setTimeout(resolve, 100))
  const end = cpus().map((cpu) => cpu.times)

  return end.map((cpu, i) => {
    const startTimes = start[i]
    const endTimes = cpu

    const idle = endTimes.idle - startTimes.idle
    const total = Object.keys(endTimes).reduce(
      (acc, key) => acc + (endTimes[key] - startTimes[key]),
      0
    )

    return {
      core: i,
      usage: Math.min(100, Math.max(0, (1 - idle / total) * 100))
    }
  })
}

async function getMemoryInfo() {
  const total = totalmem()
  const free = freemem()
  const used = total - free

  return {
    total: formatBytes(total),
    free: formatBytes(free),
    used: formatBytes(used),
    percentage: ((used / total) * 100).toFixed(1)
  }
}

async function getNetworkStats() {
  const interfaces = networkInterfaces()
  return Object.entries(interfaces).map(([name, data]) => ({
    name,
    addresses: data.map((addr) => ({
      address: addr.address,
      family: addr.family,
      internal: addr.internal
    }))
  }))
}

async function getTopProcesses() {
  try {
    let cmd
    switch (process.platform) {
      case 'win32':
        cmd = `powershell "Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 | ForEach-Object {
                    $proc = $_
                    [PSCustomObject]@{
                        Name = $proc.ProcessName
                        PID = $proc.Id
                        CPU = if ($proc.CPU) { [math]::Round($proc.CPU, 1) } else { 0 }
                        Memory = [math]::Round($proc.WorkingSet64 / 1MB, 1)
                    } | ConvertTo-Json
                }"`
        break

      case 'linux':
        cmd = `top -b -n 1 -o %CPU | head -n 12 | tail -n 5 | awk '{printf "{\\"pid\\":\\"%s\\",\\"cmd\\":\\"%s\\",\\"cpu\\":\\"%s\\",\\"mem\\":\\"%s\\"}\\n", $1, $12, $9, $10}'`
        break

      case 'darwin':
        cmd = 'ps -arcwwwxo pid,command,%cpu,%mem | head -n 6'
        break

      default:
        throw new Error(`Unsupported platform: ${process.platform}`)
    }

    const { stdout } = await execAsync(cmd)

    return stdout
      .split('\n')
      .slice(1) 
      .filter(Boolean)
      .map((line) => {
        const match = line
          .trim()
          .match(/^\s*(\d+)\s+(.+?)\s+(\d+\.\d+)\s+(\d+\.\d+)\s*$/)
        if (match) {
          const [_, pid, cmd, cpu, mem] = match
          return {
            pid,
            cmd: cmd.trim(),
            cpu: `${parseFloat(cpu).toFixed(1)}%`,
            mem: `${parseFloat(mem).toFixed(1)}%`
          }
        }
        return null
      })
      .filter(Boolean) 
  } catch (error) {
    console.error('Error getting processes:', error)
    return []
  }
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

async function sendMetrics(ws) {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      cpu: await getCPUUsage(),
      memory: await getMemoryInfo(),
      network: await getNetworkStats(),
      processes: await getTopProcesses()
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
