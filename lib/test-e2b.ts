import { Sandbox } from "@e2b/code-interpreter"

export async function testE2BConnection(): Promise<boolean> {
  try {
    console.log("Testing E2B connection...")

    if (!process.env.E2B_API_KEY) {
      console.error("E2B_API_KEY not found")
      return false
    }

    const sandbox = await Sandbox.create()
    console.log("Sandbox created successfully:", sandbox.id)

    // Test a simple command
    const result = await sandbox.runCommand("echo 'Hello E2B'")
    console.log("Command result:", result.stdout)

    await sandbox.close()
    console.log("E2B connection test passed")
    return true
  } catch (error) {
    console.error("E2B connection test failed:", error)
    return false
  }
}
