const { Sandbox } = require('@e2b/code-interpreter');

async function testE2BConnection() {
  console.log('Testing E2B connection...');
  
  if (!process.env.E2B_API_KEY) {
    console.error('E2B_API_KEY not found in environment variables');
    return false;
  }
  
  console.log('E2B_API_KEY found:', process.env.E2B_API_KEY.substring(0, 10) + '...');
  
  try {
    console.log('Creating sandbox...');
    const sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 60000, // 1 minute timeout
    });
    
    console.log('✓ Sandbox created successfully!');
    console.log('Sandbox ID:', sandbox.sandboxId);
    
    // Test a simple command
    console.log('Testing command execution...');
    const result = await sandbox.commands.run('echo "Hello E2B"');
    console.log('Command output:', result.stdout);
    
    // Test file operations
    console.log('Testing file operations...');
    await sandbox.files.write('test.txt', 'Hello from E2B!');
    const content = await sandbox.files.read('test.txt');
    console.log('File content:', content);
    
    console.log('✓ All tests passed!');
    
    // Clean up
    await sandbox.kill();
    console.log('✓ Sandbox terminated successfully');
    
    return true;
  } catch (error) {
    console.error('❌ E2B connection test failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.statusText);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Manually set environment variables for testing
process.env.E2B_API_KEY = 'e2b_e4d64d41160fb5f8a15f6a9d99c390bad131b2e3';

testE2BConnection().then(success => {
  process.exit(success ? 0 : 1);
});
