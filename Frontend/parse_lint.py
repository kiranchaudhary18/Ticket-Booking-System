import re
import json

def parse_lint(filename):
    with open(filename, 'r', encoding='utf-16') as f:
        content = f.read()
    
    files = {}
    current_file = None
    
    # Split by lines
    lines = content.split('\n')
    for line in lines:
        if line.startswith('D:\\'):
            current_file = line.strip()
            if current_file not in files:
                files[current_file] = []
        elif current_file and ('error' in line or 'warning' in line):
            # Extract line number and rule
            # e.g., "  41:19  error    Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any"
            match = re.search(r'^\s+(\d+:\d+)\s+(error|warning)\s+(.*?)\s+([@a-zA-Z0-9\-\/]+)$', line)
            if match:
                loc = match.group(1)
                severity = match.group(2)
                message = match.group(3).strip()
                rule = match.group(4)
                files[current_file].append({'loc': loc, 'severity': severity, 'message': message, 'rule': rule})
    
    with open('parsed_lint_all.txt', 'w', encoding='utf-8') as out:
        for filepath, issues in files.items():
            if issues:
                out.write(f"File: {filepath}\n")
                for i in issues:
                    out.write(f"  {i['loc']} [{i['severity'].upper()}] {i['rule']}: {i['message']}\n")
                out.write("\n")

if __name__ == "__main__":
    parse_lint('lint.txt')
