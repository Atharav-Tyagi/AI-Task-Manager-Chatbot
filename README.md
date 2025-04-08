# 🤖 AI Task Manager Chatbot

A smart assistant that organizes tasks using natural language.  
**Try it now:** [Live Demo](https://your-username.github.io/AI-Task-Manager-Chatbot) *(if hosted)*

![Demo GIF](/screenshots/demo.gif)

## 🚀 Quick Start
### Basic Setup (Frontend Only):
1. Download the repo
2. Open `templates/index.html` in any browser

### Full Setup (With AI Features):
```bash
# 1. Install Python (3.8+)
# 2. Install dependencies:
pip install -r requirements.txt

# 3. Add your Gemini API key to .env:
echo "GEMINI_API_KEY=your_key_here" > .env

# 4. Run the app:
python app.py
Then visit: http://localhost:3000

🔥 Features
Natural language input ("Meet team at 3pm tomorrow")

Voice commands 🎤

Task snoozing ⏸️

Priority tagging (❗High/⚠️Medium/✅Low)

🛠️ Tech Stack
Frontend: HTML, CSS, JavaScript

Backend: Python + Flask

AI: Google Gemini API

📂 Project Structure
Copy
AI-Task-Manager-Chatbot/
├── app.py             # Backend logic
├── static/            # CSS/JS files
├── templates/         # HTML files
└── requirements.txt   # Dependencies
