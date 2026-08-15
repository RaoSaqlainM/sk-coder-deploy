# SK Coder - Features & User Guide

## 🎯 AT A GLANCE

SK Coder is a **professional, cloud-based IDE** for writing, running, and previewing code in **20+ programming languages** directly in your browser.

### Key Highlights
- 🌐 **Works anywhere** — No installation needed
- ⚡ **Instant execution** — Multiple language runners
- 🎨 **Professional UI** — VS Code-like experience  
- 📱 **Mobile ready** — Responsive design
- 🔒 **Secure** — Local storage first, remote optional
- 🆓 **Free** — Piston + Wandbox (open APIs)

---

## 🚀 GETTING STARTED (First 2 Minutes)

### Step 1: Open the App
```
Visit: http://localhost:5173/
```

### Step 2: Create Your First File
1. Click **"+ New File"** in left sidebar
2. Enter filename: `hello.py`
3. Write code:
   ```python
   name = input("What's your name? ")
   print(f"Hello, {name}!")
   ```

### Step 3: Run It
1. Click **"Run"** button (top right)
2. Wait for execution...
3. See output in **Preview** pane

### Step 4: Try Another Language
1. Create `script.js`:
   ```javascript
   console.log("Hello from JavaScript!");
   alert("Welcome to SK Coder!");
   ```
2. Click **"Run"**
3. See results instantly

---

## 💡 PRACTICAL EXAMPLES

### Example 1: Python with User Input
```python
# Create: calculate.py
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

for i in range(1, 6):
    print(f"{i}! = {factorial(i)}")
```

**Result**: Execution output shown in preview
```
1! = 1
2! = 2
3! = 6
4! = 24
5! = 120
```

### Example 2: C++ Program
```cpp
// Create: sort.cpp
#include <iostream>
#include <algorithm>
#include <vector>

int main() {
    std::vector<int> nums = {5, 2, 8, 1, 9};
    std::sort(nums.begin(), nums.end());
    
    for (int n : nums) {
        std::cout << n << " ";
    }
    return 0;
}
```

**Result**: Compiled and executed
```
1 2 5 8 9
```

### Example 3: HTML with JavaScript
```html
<!-- Create: app.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial; padding: 20px; }
        button { padding: 10px 20px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Counter App</h1>
    <p>Count: <span id="count">0</span></p>
    <button onclick="increment()">+</button>
    <button onclick="decrement()">-</button>
    
    <script>
        let count = 0;
        function increment() {
            document.getElementById('count').textContent = ++count;
        }
        function decrement() {
            document.getElementById('count').textContent = --count;
        }
    </script>
</body>
</html>
```

**Result**: Full interactive preview in iframe

---

## 📋 TERMINAL TYPES & USAGE

### 1. Bash Terminal
**For**: File operations, package management, scripting

**Commands**:
```bash
ls              # List files
cd folder       # Change directory  
mkdir newdir    # Create folder
cat file.txt    # View file
cp file1 file2  # Copy file
rm file         # Delete file
pwd             # Current directory
```

### 2. Python Terminal
**For**: Python interactive shell, testing snippets

**Usage**:
```python
>>> x = 10
>>> y = 20
>>> print(x + y)
30
>>> import math
>>> math.sqrt(16)
4.0
```

### 3. Node.js Terminal
**For**: JavaScript/Node scripts, npm commands

**Usage**:
```bash
> const arr = [1, 2, 3, 4, 5];
> const sum = arr.reduce((a, b) => a + b, 0);
> console.log(sum);
15
```

### 4. SK AI Terminal
**For**: AI-powered code assistance

**Features**:
- Ask coding questions
- Get code suggestions
- Fix errors
- Debug issues

**Setup**:
1. Settings → AI → Enter OpenAI API key
2. Go to "AI" tab
3. Chat with AI

### 5. Output Terminal
**For**: Viewing execution results

**Shows**:
- stdout (program output)
- stderr (errors)
- Exit code
- Execution time

---

## 🛠️ FILE MANAGEMENT

### Create Files
```
Sidebar → "+" button → Select type → Enter name
```

### Create Folders
```
Sidebar → "Folder" button → Enter name
```

### Import Project (ZIP)
```
Sidebar → "Upload" button → Select ZIP → Auto-extract
```

### Right-Click Options
```
File → 3 dots → Options:
  • Download — Save file locally
  • Copy Content — Copy to clipboard
  • Execute — Run file
  • Rename — Edit name
  • Delete — Remove file
```

### File Organization
- Files stored in **IndexedDB** (browser storage)
- Folders maintain structure
- Auto-save every 10 seconds
- Survives page refresh

---

## ⚙️ SETTINGS

### Editor Settings
- **Font Size** — Adjust zoom (8-24px)
- **Font Family** — JetBrains Mono, etc.
- **Tab Size** — 2 or 4 spaces
- **Theme** — Dark/Light mode

### API Keys
- **OpenAI/Claude** — For AI features
- **GitHub Token** — For Git operations
- **Keep private** — Never shared

### Storage
- **View usage** — See IndexedDB size
- **Clear all** — Reset workspace
- **Export** — Download all files

---

## 🎯 ADVANCED WORKFLOWS

### Workflow 1: Competitive Programming

1. Create `input.txt`:
   ```
   5 10
   3
   ```

2. Create `solution.cpp`:
   ```cpp
   #include <iostream>
   using namespace std;
   
   int main() {
       int a, b;
       cin >> a >> b;
       cout << a + b << endl;
       return 0;
   }
   ```

3. Click "Run" → See output instantly

### Workflow 2: Web Development

1. Create `index.html` (UI)
2. Create `style.css` (styles)
3. Create `script.js` (logic)
4. Click "Preview" on index.html → Full website preview
5. Edit and refresh → See live changes

### Workflow 3: Data Processing

1. Upload CSV file (drag & drop)
2. Create `process.py`:
   ```python
   import csv
   with open('data.csv') as f:
       reader = csv.DictReader(f)
       for row in reader:
           print(row)
   ```
3. Run → See processed output

---

## 🔐 SECURITY & PRIVACY

### What's Local
✅ Your code files (IndexedDB)  
✅ Terminal history  
✅ Settings & preferences  
✅ API keys (encrypted in localStorage)

### What Goes to Server
❌ Code execution (only to Piston/Wandbox)  
❌ Temporary execution cache  
❌ Deleted after 72 hours

### Best Practices
1. ✅ Use unique API keys (not production)
2. ✅ Don't store secrets in code
3. ✅ Enable HTTPS (production)
4. ✅ Clear cache regularly

---

## 🚨 TROUBLESHOOTING

### "No output after clicking Run"
1. Check error message in preview
2. Verify file extension (.py, .cpp, etc.)
3. Try simpler code first
4. Check terminal for error details

### "Terminal commands not working"
1. Click "Terminal" tab
2. Type `ls` to test
3. Try `cd /` then `pwd`
4. If still broken, refresh page

### "Preview shows error"
1. Read error message carefully
2. Check file syntax
3. Click error line in editor
4. Use "Fix with AI" (if available)

### "Files not saving"
1. Check IndexedDB is enabled
2. Check browser storage quota
3. Try "Export all files"
4. Report issue on GitHub

---

## 📊 PERFORMANCE TIPS

### For Faster Execution
- Use smaller files (< 10MB)
- Avoid infinite loops
- Limit output (don't print millions of lines)
- Use Piston over Wandbox (faster)

### For Better Experience
- Close unused tabs
- Clear old terminal history
- Use code completion (Ctrl+Space)
- Use keyboard shortcuts

### Keyboard Shortcuts
```
Ctrl+S          Save (automatic)
Ctrl+F          Find in file
Ctrl+H          Replace
Ctrl+G          Go to line
Ctrl+/          Toggle comment
Tab/Shift+Tab   Indent/outdent
F12             Browser dev tools
```

---

## 🌍 SUPPORTED LANGUAGES (Full List)

| Language | Support | Notes |
|----------|---------|-------|
| Python | ✅ Full | Piston, browser |
| JavaScript | ✅ Full | Browser, Piston, Wandbox |
| TypeScript | ✅ Full | Piston, transpiled |
| C++ | ✅ Full | GCC, Wandbox |
| C | ✅ Full | GCC, Wandbox |
| Java | ✅ Full | OpenJDK, Wandbox |
| Kotlin | ✅ Full | Kotlin compiler |
| Rust | ✅ Full | Rustc, Wandbox |
| Go | ✅ Full | Go compiler |
| Ruby | ✅ Full | Ruby 3+, Wandbox |
| PHP | ✅ Full | PHP 8+, Wandbox |
| SQL | ✅ Limited | Query support |
| Bash/Shell | ✅ Full | Linux shell |
| R | ✅ Full | R language, Wandbox |
| Swift | ✅ Full | Swift compiler, Wandbox |
| HTML/CSS | ✅ Full | Native browser |

---

## 📱 MOBILE-SPECIFIC TIPS

### Orientation
- 📱 Portrait — Single panel at a time
- 📶 Landscape — Split view available

### Touch Gestures
- 👉 Swipe left/right — Switch panels
- 🔗 Long press — Context menu
- 👆 Double tap — Zoom editor

### Mobile Navigation
```
Bottom bar: 📁 | ✏️ | 👁️ | ⌨️ | 🤖
  Files  | Editor | Preview | Terminal | AI
```

---

## 💾 BACKUP & EXPORT

### Manual Export
```
Settings → Storage → "Export all files"
Downloads your entire workspace as ZIP
```

### Auto-Backup
- IndexedDB auto-saves every 10 seconds
- Survives browser refresh
- Clears after 72 hours

### Restore Files
```
Sidebar → "Upload" → Select exported ZIP → Auto-restore
```

---

## 🤝 TIPS & TRICKS

### Tip 1: Use Terminal for Complex Tasks
```bash
# Instead of one big Python file, use terminal:
$ python3
>>> import requests
>>> response = requests.get('https://api.github.com')
>>> print(response.json())
```

### Tip 2: Quick Testing
```javascript
// Create temp.js for quick tests
console.log("Testing...");
const result = myFunction();
console.log(result);
```

### Tip 3: Organize with Folders
```
project/
├── src/
│   ├── main.py
│   └── utils.py
├── tests/
│   └── test.py
└── README.md
```

### Tip 4: Use Templates
Click "New File" → Select template → Auto-generates boilerplate

---

## 📞 SUPPORT

### Getting Help
1. **In-app Guide** — Settings → Help
2. **GitHub Issues** — Report bugs
3. **Keyboard Help** — Press `?` in editor
4. **Try examples** — See `/examples/` folder

### Common Questions

**Q: Can I use offline?**  
A: Yes, basic terminal & browser execution work offline. Code execution needs internet.

**Q: How big can files be?**  
A: Up to 100MB in IndexedDB. Larger files may slow down.

**Q: Do you store my code?**  
A: No. Only on your device. Backend doesn't persist unless you explicitly save.

**Q: Can I collaborate?**  
A: Not yet, but planned for Phase 2.

**Q: Is it free?**  
A: Yes! Uses free APIs (Piston, Wandbox). Your API keys are optional.

---

**Ready to start coding? Visit: http://localhost:5173/**
