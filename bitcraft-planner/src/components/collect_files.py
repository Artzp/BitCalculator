import os
import sys

# List of directories to ignore
IGNORE_DIRS = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'env', '.env'}

# List of text file extensions to include (add more if needed)
TEXT_EXTENSIONS = {
    '.py', '.js', '.ts', '.html', '.css', '.json', '.md', '.txt', '.yaml', '.yml',
    '.java', '.cpp', '.c', '.h', '.sh', '.bat', '.go', '.rb', '.php', '.sql', '.tsx'
}  # Added .tsx since your files are React components

def is_text_file(filename):
    return os.path.splitext(filename)[1].lower() in TEXT_EXTENSIONS

def collect_files(root_dir='.', output_file='combined.txt'):
    with open(output_file, 'w', encoding='utf-8') as out:
        # Write a header with directory structure overview
        out.write("Directory Structure:\n")
        for subdir, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]  # Skip ignored dirs
            level = subdir.replace(root_dir, '').count(os.sep)
            indent = ' ' * 4 * level
            out.write(f"{indent}{os.path.basename(subdir)}/\n")
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                out.write(f"{subindent}{f}\n")
        out.write("\n---\n\n")

        # Now collect file contents
        for subdir, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]  # Skip ignored dirs
            for file in files:
                if not is_text_file(file):
                    continue  # Skip non-text files
                file_path = os.path.join(subdir, file)
                rel_path = os.path.relpath(file_path, root_dir)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    out.write(f"File: {rel_path}\n")
                    out.write(content)
                    out.write("\n\n---\n\n")
                except UnicodeDecodeError:
                    out.write(f"Skipping {rel_path}: Not a text file or encoding issue.\n\n---\n\n")
                except Exception as e:
                    out.write(f"Error reading {rel_path}: {e}\n\n---\n\n")

    print(f"Done! Output saved to {output_file}")

if __name__ == "__main__":
    root_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'combined.txt'
    collect_files(root_dir, output_file)