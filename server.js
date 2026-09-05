import http from 'node:http'
import { spawn } from 'node:child_process'

const isWindows = process.platform === 'win32'
const attendanceRoot = process.env.ATTENDANCE_PROJECT_DIR || '/Users/d87/Downloads/Projects/Attendance(Java)/AFL/AFLV(0.1)'
const inventoryRoot = process.env.INVENTORY_PROJECT_DIR || '/Users/d87/Downloads/Projects/Inventory(Cpp)/AppV1'

const projects = {
  'attendance-java': {
    cwd: attendanceRoot,
    command: isWindows ? 'run.bat' : './run.sh',
    args: [],
    shell: isWindows,
  },
  'inventory-cpp': {
    cwd: inventoryRoot,
    command: isWindows ? 'finalv1win/InventorySetup.exe' : './finalv1mac/Inventory_MacOs/inventory',
    args: [],
    shell: isWindows,
  },
}

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:5173' })
  response.end(JSON.stringify(body))
}

const server = http.createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': 'http://localhost:5173', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' })
    response.end()
    return
  }

  if (request.method !== 'POST' || request.url !== '/api/run') {
    send(response, 404, { error: 'Not found' })
    return
  }

  let body = ''
  request.on('data', (chunk) => { body += chunk })
  request.on('end', () => {
    try {
      const { projectId } = JSON.parse(body)
      const project = projects[projectId]
      if (!project) return send(response, 400, { error: 'Project is not allowlisted.' })

      const child = spawn(project.command, project.args, { cwd: project.cwd, shell: project.shell, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
      let output = ''
      child.stdout.on('data', (chunk) => { output += chunk.toString() })
      child.stderr.on('data', (chunk) => { output += chunk.toString() })
      child.unref()

      setTimeout(() => {
        send(response, 200, { ok: true, pid: child.pid, output: output.trim() || `Process launched on ${isWindows ? 'Windows' : 'macOS/Linux'}.` })
      }, 700)
      child.on('error', (error) => send(response, 500, { error: error.message }))
    } catch {
      send(response, 400, { error: 'Invalid request.' })
    }
  })
})

server.listen(4174, '127.0.0.1', () => {
  console.log('Local project runner listening at http://127.0.0.1:4174')
})
