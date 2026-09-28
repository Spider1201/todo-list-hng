# Live smoke test: starts the dev server, exercises the page and the API over HTTP,
# then shuts the server down.
#
# Every artifact it produces - request payloads, the page dump, the log and the
# dev-server output - is written to `%TEMP%\todo-app-smoke`, never into the
# repository: `payload-malformed.json` is deliberately invalid JSON that Prettier
# cannot parse, which would break `npm run format:check` (see AGENTS.md ->
# Verification helpers).
# Refuses to run if its port is already in use, so it can never silently test a
# stale server; pass -Port to run on another port.
param(
  [int]$Port = 3000
)
$ErrorActionPreference = 'Continue'
$root = $PSScriptRoot
$temp = Join-Path $env:TEMP 'todo-app-smoke'
New-Item -ItemType Directory -Force -Path $temp | Out-Null
$log = Join-Path $temp 'smoke.log'
$bodyFile = Join-Path $temp 'body.txt'
$pageFile = Join-Path $temp 'page.html'
$devLog = Join-Path $temp 'dev-server.log'
$devErrLog = Join-Path $temp 'dev-server.err.log'
$baseUrl = "http://127.0.0.1:$port"

function Write-Log([string]$line) {
  Add-Content -Path $log -Value $line
}

function Invoke-Api([string]$method, [string]$path, [string]$payloadFile = '') {
  $curlArgs = @('-s', '-o', $bodyFile, '-w', '%{http_code}', '-X', $method, "$baseUrl$path")
  if ($payloadFile) {
    $curlArgs += @('-H', 'content-type: application/json', '--data-binary', "@$payloadFile")
  }
  # Clear the body first: when curl cannot connect (status 000) it writes nothing,
  # and a stale body from the previous request would be misreported as this one's.
  Remove-Item -Path $bodyFile -Force -ErrorAction SilentlyContinue
  $status = & curl.exe @curlArgs
  $body = if (Test-Path $bodyFile) { Get-Content -Raw $bodyFile } else { '' }
  return [pscustomobject]@{ Status = "$status".Trim(); Body = "$body".Trim() }
}

# The request payloads live in the temp folder: `payload-malformed.json` is
# deliberately not valid JSON, which Prettier can never parse - keeping it out of
# the repository is what keeps `npm run format:check` green after a smoke run.
$payloadEmpty = Join-Path $temp 'payload-empty.json'
$payloadUnknownKey = Join-Path $temp 'payload-unknown-key.json'
$payloadMalformed = Join-Path $temp 'payload-malformed.json'
Set-Content -Path $payloadEmpty -Value '{}' -NoNewline
Set-Content -Path $payloadUnknownKey -Value '{"title":"Buy milk","isCompleted":true}' -NoNewline
Set-Content -Path $payloadMalformed -Value '{ not json' -NoNewline

Set-Content -Path $log -Value '=== environment ==='
Write-Log ("postgres services: " + ((Get-Service -Name 'postgres*' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name) -join ', '))
Write-Log ("curl: " + (Get-Command curl.exe -ErrorAction SilentlyContinue).Source)
Write-Log ("DATABASE_URL set: " + [bool]$env:DATABASE_URL)
Write-Log ("TEST_DATABASE_URL set: " + [bool]$env:TEST_DATABASE_URL)
Write-Log ("artifacts: " + $temp)

# Refuse to run against a server this script did not start. Without this check a
# leftover `next dev` on port 3000 (from a previous run or session) silently
# serves every request below, so the results would describe that stale server
# instead of the code under test.
$busy = (netstat -ano | Select-String ":$port\s" | Select-String 'LISTENING')
if ($busy) {
  Write-Log "ABORT: port $port is already in use - refusing to smoke test against an unknown server."
  Write-Log (($busy | ForEach-Object { $_.Line.Trim() }) -join "`n")
  Write-Log "Stop it with: taskkill /PID <pid> /F"
  Write-Log 'ALL_DONE'
  Get-Content -Path $log
  exit 1
}

Write-Log '=== start dev server ==='
# `--port` is forwarded to `next dev` so the server listens on the same port this
# script sends its requests to. Without it, `next dev` silently auto-picks another
# port when $port is taken and every request below would hit the wrong server.
$dev = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev', '--', '--port', "$port" -WorkingDirectory $root -PassThru -WindowStyle Hidden -RedirectStandardOutput $devLog -RedirectStandardError $devErrLog

$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1
  $probe = Invoke-Api 'GET' '/api/todos'
  if ($probe.Status -ne '000') {
    $ready = $true
    Write-Log "server answered after $i s with status $($probe.Status)"
    break
  }
}
Write-Log "ready=$ready"
if (-not $ready) {
  Write-Log "ABORT: the dev server never answered on $baseUrl - see $devErrLog"
  if ($dev) { & taskkill.exe /PID $dev.Id /T /F | Out-Null }
  Write-Log 'ALL_DONE'
  Get-Content -Path $log
  exit 1
}

Write-Log '=== GET / (page) ==='
$page = Invoke-Api 'GET' '/'
Copy-Item -Path $bodyFile -Destination $pageFile -Force -ErrorAction SilentlyContinue
Write-Log "status=$($page.Status) page dump: $pageFile"
Write-Log ("contains layout title: " + $page.Body.Contains('page__title'))
Write-Log ("contains loading skeleton: " + $page.Body.Contains('todo--skeleton'))
Write-Log ("contains load error notice: " + $page.Body.Contains('We could not load your tasks'))
Write-Log ("contains setup hint: " + $page.Body.Contains('DATABASE_URL'))

Write-Log '=== GET /api/todos ==='
$list = Invoke-Api 'GET' '/api/todos'
Write-Log "status=$($list.Status) body=$($list.Body)"

Write-Log '=== CRUD cycle: create -> complete -> delete ==='
# The error-path requests below only prove that bad input is rejected. This cycle
# is the happy path: POST creates, PATCH completes, DELETE removes. It deletes the
# row again, so a smoke run leaves the table exactly as it found it.
$payloadValid = Join-Path $temp 'payload-valid.json'
$payloadComplete = Join-Path $temp 'payload-complete.json'
Set-Content -Path $payloadValid -Value ('{"title":"smoke ' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '"}') -NoNewline
Set-Content -Path $payloadComplete -Value '{"isCompleted":true}' -NoNewline

$created = Invoke-Api 'POST' '/api/todos' $payloadValid
Write-Log "create status=$($created.Status)"
$todoId = $null
try { $todoId = ($created.Body | ConvertFrom-Json).data.id } catch { }
if ($todoId) {
  $visible = Invoke-Api 'GET' '/api/todos'
  Write-Log "created id=$todoId visible in list: $($visible.Body.Contains($todoId))"

  $patched = Invoke-Api 'PATCH' "/api/todos/$todoId" $payloadComplete
  Write-Log "complete status=$($patched.Status)"

  Write-Log '=== notes cycle: add -> list -> edit -> delete ==='
  $payloadNote = Join-Path $temp 'payload-note.json'
  $payloadNoteEdit = Join-Path $temp 'payload-note-edit.json'
  Set-Content -Path $payloadNote -Value '{"body":"smoke note"}' -NoNewline
  Set-Content -Path $payloadNoteEdit -Value '{"body":"smoke note edited"}' -NoNewline

  $noteAdded = Invoke-Api 'POST' "/api/todos/$todoId/notes" $payloadNote
  Write-Log "note create status=$($noteAdded.Status)"
  $noteId = $null
  try { $noteId = ($noteAdded.Body | ConvertFrom-Json).data.id } catch { }

  if ($noteId) {
    $noteList = Invoke-Api 'GET' "/api/todos/$todoId/notes"
    Write-Log "note list status=$($noteList.Status) contains the note: $($noteList.Body.Contains($noteId))"

    $noteEdited = Invoke-Api 'PATCH' "/api/todos/$todoId/notes/$noteId" $payloadNoteEdit
    Write-Log "note edit status=$($noteEdited.Status) text changed: $($noteEdited.Body.Contains('smoke note edited'))"

    $noteRemoved = Invoke-Api 'DELETE' "/api/todos/$todoId/notes/$noteId"
    Write-Log "note delete status=$($noteRemoved.Status)"

    $noteGone = Invoke-Api 'DELETE' "/api/todos/$todoId/notes/$noteId"
    Write-Log "note delete again status=$($noteGone.Status) (404 expected)"
  } else {
    Write-Log "notes cycle SKIPPED: create returned no id ($($noteAdded.Body))"
  }

  Write-Log '=== note validation and orphan checks ==='
  $noteBlank = Invoke-Api 'POST' "/api/todos/$todoId/notes" (Join-Path $temp 'payload-empty.json')
  Write-Log "blank note status=$($noteBlank.Status) (400 expected)"
  $orphan = Invoke-Api 'POST' '/api/todos/3f1b0d24-9c4a-4a5e-8f2d-1c6b7a8d9e0f/notes' $payloadNote
  Write-Log "note on missing task status=$($orphan.Status) (404 expected)"

  $removed = Invoke-Api 'DELETE' "/api/todos/$todoId"
  Write-Log "delete status=$($removed.Status)"

  $gone = Invoke-Api 'GET' "/api/todos/$todoId"
  Write-Log "get after delete status=$($gone.Status) (404 expected)"
} else {
  Write-Log "CRUD cycle SKIPPED: create returned no id ($($created.Body))"
}

Write-Log '=== POST /api/todos with an empty body ==='
$post = Invoke-Api 'POST' '/api/todos' $payloadEmpty
Write-Log "status=$($post.Status) body=$($post.Body)"

Write-Log '=== POST /api/todos with an unknown key ==='
$postBad = Invoke-Api 'POST' '/api/todos' $payloadUnknownKey
Write-Log "status=$($postBad.Status) body=$($postBad.Body)"

Write-Log '=== POST /api/todos with malformed JSON ==='
$postBroken = Invoke-Api 'POST' '/api/todos' $payloadMalformed
Write-Log "status=$($postBroken.Status) body=$($postBroken.Body)"

Write-Log '=== GET /api/todos/not-a-uuid ==='
$badId = Invoke-Api 'GET' '/api/todos/not-a-uuid'
Write-Log "status=$($badId.Status) body=$($badId.Body)"

Write-Log '=== DELETE /api/todos/<uuid> ==='
$del = Invoke-Api 'DELETE' '/api/todos/3f1b0d24-9c4a-4a5e-8f2d-1c6b7a8d9e0f'
Write-Log "status=$($del.Status) body=$($del.Body)"

Write-Log '=== GET /nope (404 page) ==='
$notFound = Invoke-Api 'GET' '/nope'
Write-Log "status=$($notFound.Status) contains notice: $($notFound.Body.Contains('Page not found'))"

Write-Log '=== stop dev server ==='
if ($dev) {
  & taskkill.exe /PID $dev.Id /T /F | Out-Null
}
Start-Sleep -Seconds 3
$listeners = (netstat -ano | Select-String ":$port\s" | Select-String 'LISTENING')
Write-Log ("listeners left on :$port -> " + ($listeners.Count))

Write-Log '--- dev-server.log tail ---'
if (Test-Path $devLog) { Write-Log ((Get-Content $devLog -Tail 20) -join "`n") }
Write-Log '--- dev-server.err.log tail ---'
if (Test-Path $devErrLog) { Write-Log ((Get-Content $devErrLog -Tail 20) -join "`n") }

Write-Log 'ALL_DONE'
Write-Output "smoke test artifacts: $temp"
Get-Content -Path $log
