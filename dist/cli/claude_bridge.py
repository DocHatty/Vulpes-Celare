import sys
import os
import subprocess
import shutil
import base64

def main():
    # Find claude executable
    claude_path = shutil.which("claude")
    
    if not claude_path:
        # Try common Windows NPM path if not found in PATH
        npm_path = os.path.join(os.getenv("APPDATA", ""), "npm", "claude.CMD")
        if os.path.exists(npm_path):
            claude_path = npm_path

    if not claude_path:
        sys.stderr.write("Error: Could not locate 'claude' executable in PATH.\n")
        sys.exit(1)

    # Arguments passed to this script: [bridge.py, arg1, arg2, ...]
    # We want to pass [arg1, arg2, ...] to claude
    claude_args = sys.argv[1:]
    
    # Check for base64-encoded prompt in environment variable
    # This avoids stdin piping issues with Node.js shell: true
    prompt_b64 = os.environ.get("VULPES_PROMPT_B64")
    
    cmd = [claude_path] + claude_args
    
    try:
        if prompt_b64:
            # Decode prompt and write to claude's stdin
            prompt = base64.b64decode(prompt_b64).decode("utf-8")
            process = subprocess.Popen(
                cmd,
                stdout=sys.stdout.buffer,
                stderr=sys.stderr.buffer,
                stdin=subprocess.PIPE,
                bufsize=0,
                shell=False 
            )
            process.stdin.write(prompt.encode("utf-8"))
            process.stdin.close()
            exit_code = process.wait()
        else:
            # Direct stdin bridging (for manual testing)
            process = subprocess.Popen(
                cmd,
                stdout=sys.stdout.buffer,
                stderr=sys.stderr.buffer,
                stdin=sys.stdin.buffer,
                bufsize=0,
                shell=False 
            )
            exit_code = process.wait()
        
        sys.exit(exit_code)

    except Exception as e:
        sys.stderr.write(f"Bridge Error: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
