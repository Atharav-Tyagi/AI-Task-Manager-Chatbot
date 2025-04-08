from flask import Flask, request, jsonify, render_template
import os
import logging
import re
from dotenv import load_dotenv
import google.generativeai as genai
from flask_cors import CORS
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Enhanced CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

class GeminiTaskManager:
    def __init__(self, api_key):
        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(
                model_name="gemini-1.5-pro",
                generation_config={
                    "temperature": 0.3,
                    "top_p": 0.8,
                    "top_k": 30,
                    "max_output_tokens": 1024,
                },
                safety_settings=[
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                ]
            )
            self.conversation_history = [
                {"role": "user", "parts": ["""
                You are an expert Task Management Assistant. Always respond in this structured format:

                [Task Name] • [Brief Description]

                • [Action Item 1]
                • [Action Item 2]
                • [Action Item 3]

                Priority: [High/Medium/Low]
                Deadline: [YYYY-MM-DD HH:MM] (if applicable)
                Status: [Not Started/In Progress/Completed]

                Rules:
                - Always use this exact format
                - Include each section only once
                - Use simple bullet points (•)
                - For priorities: High, Medium, or Low only
                - For dates: Always use YYYY-MM-DD HH:MM format
                - Keep descriptions concise
                """]
                },
                {"role": "model", "parts": ["I'm your Task Manager. Here's how I'll help you:\n\n• Create and organize tasks\n• Set priorities and deadlines\n• Track progress\n\nWhat would you like to accomplish today?"]},
            ]
            logger.info("Task Manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Task Manager: {str(e)}")
            raise

    def _enhance_with_dates(self, text):
        """Convert natural language dates to structured format"""
        date_patterns = [
            (r'\b(today|now)\b', datetime.now().strftime('%Y-%m-%d %H:%M')),
            (r'\btomorrow\b', (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d 09:00')),
            (r'\bnext week\b', (datetime.now() + timedelta(weeks=1)).strftime('%Y-%m-%d')),
            (r'\bnext monday\b', self._get_next_weekday(0).strftime('%Y-%m-%d')),
            (r'\bnext friday\b', self._get_next_weekday(4).strftime('%Y-%m-%d')),
        ]
        
        for pattern, replacement in date_patterns:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        return text

    def _get_next_weekday(self, weekday):
        """Get next specific weekday (0=Monday, 6=Sunday)"""
        today = datetime.now()
        days_ahead = (weekday - today.weekday()) % 7
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days_ahead)

    def generate_response(self, user_message):
        try:
            if not user_message or not isinstance(user_message, str):
                raise ValueError("Invalid message format")
                
            # Enhance with date recognition
            user_message = self._enhance_with_dates(user_message)
            
            self.conversation_history.append({"role": "user", "parts": [user_message]})
            response = self.model.generate_content(self.conversation_history)
            
            formatted_response = self._format_response(response.text)
            
            self.conversation_history.append({"role": "model", "parts": [formatted_response]})
            
            # Maintain conversation history (last 6 exchanges)
            if len(self.conversation_history) > 8:
                self.conversation_history = [self.conversation_history[0], self.conversation_history[1]] + self.conversation_history[-6:]
                
            return formatted_response
            
        except Exception as e:
            logger.error(f"Response generation failed: {str(e)}")
            return "• Error processing task\n• Please try again with clear instructions"

    def _format_response(self, text):
        """Format response with consistent task management structure"""
        text = text.strip()
        
        # Standardize bullet points
        text = text.replace('- ', '• ').replace('*', '•')
        
        # Fix duplicate sections
        sections = {
            'Priority:': False,
            'Deadline:': False,
            'Status:': False
        }
        
        lines = []
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            # Check for and handle duplicate sections
            for section in sections:
                if line.startswith(section):
                    if sections[section]:
                        continue  # Skip duplicate
                    sections[section] = True
                    break
                    
            lines.append(line)
        
        # Rebuild the text with proper formatting
        formatted_lines = []
        if lines:
            formatted_lines.append(lines[0])  # Task title/description
            
        for line in lines[1:]:
            if not line.startswith('•') and not any(line.startswith(s) for s in sections):
                line = '• ' + line
            formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)

# Initialize task manager
try:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise ValueError("Missing Gemini API key - please set GEMINI_API_KEY in your .env file")
    task_manager = GeminiTaskManager(gemini_api_key)
    logger.info("Task Manager initialized successfully")
except Exception as e:
    logger.critical(f"Task Manager initialization failed: {str(e)}")
    task_manager = None

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return jsonify({"status": "preflight"}), 200

    if not task_manager:
        return jsonify({"error": "Service unavailable"}), 503

    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({"error": "Missing 'message' field"}), 400

        user_message = data['message']
        if not isinstance(user_message, str) or not user_message.strip():
            return jsonify({"error": "Invalid message format"}), 400

        bot_response = task_manager.generate_response(user_message)
        return jsonify({
            "message": bot_response,
            "status": "success"
        })

    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}")
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=True)