# Issue 6: MCP Health Testing

**Phase:** 2 (Interactive Features)
**Status:** Pending

---

## Summary

Add opt-in health testing for MCP servers with user confirmation before executing any commands.

## Acceptance Criteria

- [ ] "Test" button in expanded MCP card (stdio MCPs only)
- [ ] Confirmation dialog shows exact command that will be run
- [ ] User must explicitly confirm before any command execution
- [ ] Spawn MCP with 5s timeout
- [ ] Check MCP protocol handshake (initialize request/response)
- [ ] Update health status: ✓ healthy / ✗ failed
- [ ] Show error message on failure
- [ ] HTTP MCPs: simple HTTP health check to URL

## Technical Details

### Security Considerations

**No auto-testing** — executing commands from config files is a security risk without explicit user consent.

1. User clicks "Test" button
2. Show warning dialog: "This will run: `npx -y @org/mcp-server`"
3. User clicks "Confirm" to proceed
4. Execute with timeout, update status

### MCP Protocol Handshake

For stdio MCPs, a minimal health check:
1. Spawn process with command + args
2. Send JSON-RPC `initialize` request
3. Wait for `initialize` response (or timeout)
4. If valid response → healthy, otherwise → failed

```json
// Request
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"capabilities": {}}}

// Expected response shape
{"jsonrpc": "2.0", "id": 1, "result": {"capabilities": {...}}}
```

### HTTP MCPs

For HTTP MCPs, check if the URL responds:
1. Send HTTP GET/POST to URL
2. Check for 2xx response
3. Optionally verify MCP protocol response

### Rust Backend

```rust
#[tauri::command]
async fn test_mcp(mcp_id: String, command: String, args: Vec<String>) -> Result<HealthStatus, String> {
    // Spawn process
    // Send initialize request
    // Wait for response with timeout
    // Return health status
}
```

### Files to Modify

```
src-tauri/src/commands/mcps.rs    # Add test_mcp command
src/lib/api/mcps.ts               # Add testMCP function
src/components/mcps/MCPCard.tsx   # Add Test button
src/components/ui/dialog.tsx      # Confirmation dialog (if not exists)
```

## Test Plan

1. Click "Test" on a stdio MCP
2. See confirmation dialog with exact command
3. Click "Cancel" → nothing happens
4. Click "Confirm" → MCP spawns, health updates
5. Working MCP → shows ✓ healthy
6. Broken MCP → shows ✗ failed with error
7. HTTP MCP → test button checks URL

## Dependencies

- Issue 2: MCP Registry (done)

## Notes

- Never auto-test on page load
- Always show command before execution
- Consider rate limiting (don't spam test button)
- May want to persist health status in local storage
