from flask import Blueprint, request, jsonify, current_app
import speech_recognition as sr
import os
import tempfile
import soundfile as sf
import numpy as np
from dotenv import load_dotenv
from google import generativeai as genai
import json
import logging
import subprocess
from pathlib import Path
from datetime import datetime

# Load environment variables
load_dotenv()

chat_bp = Blueprint('chat', __name__)

# Initialize Gemini AI client
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.0-flash')

def convert_date_format(date_str):
    """Convert date from DD/MM/YYYY to YYYY-MM-DD format"""
    if not date_str:
        return date_str
        
    # If already in YYYY-MM-DD format, return as is
    if len(date_str) == 10 and date_str.count('-') == 2:
        try:
            year, month, day = map(int, date_str.split('-'))
            if 1900 <= year <= 2099 and 1 <= month <= 12 and 1 <= day <= 31:
                return date_str
        except ValueError:
            pass
            
    # Convert from DD/MM/YYYY format
    if len(date_str) == 10 and date_str.count('/') == 2:
        try:
            day, month, year = map(int, date_str.split('/'))
            if 1900 <= year <= 2099 and 1 <= month <= 12 and 1 <= day <= 31:
                return f"{year:04d}-{month:02d}-{day:02d}"
        except ValueError:
            pass
            
    return date_str

@chat_bp.route('/api/chat', methods=['POST'])
def handle_chat():
    try:
        current_app.logger.info("Received chat request")
        
        if not api_key:
            current_app.logger.error("Gemini API key not configured")
            return jsonify({"error": "Gemini API key not configured"}), 500

        data = request.get_json()
        current_app.logger.info(f"Received data: {data}")
        
        if not data or 'message' not in data:
            current_app.logger.error("No message provided in request")
            return jsonify({"error": "No message provided"}), 400

        user_message = data['message']
        current_app.logger.info(f"Processing user message: {user_message}")

        # Call Gemini AI for chat completion
        prompt = """You are a log analysis assistant. Your task is to ALWAYS return a filter response for ANY log-related query.

        DEFAULT VALUES (use these when not specified in the query):
        - date_from: "2025-04-17" (matches all logs from the beginning)
        - date_to: "2025-05-02" (matches all logs up to the future)
        - method: "" (matches any HTTP method)
        - path: "" (matches any path)
        - status_code: -1 (matches any status code)
        - browser: "" (matches any browser)

        RESPONSE FORMAT:
        ALWAYS return this format:
        {
            "type": "filter",
            "data": {
                "date_from": "YYYY-MM-DD",
                "date_to": "YYYY-MM-DD",
                "method": "",
                "path": "",
                "status_code": -1,
                "browser": ""
            }
        }

        RULES:
        1. ALWAYS return a filter response
        2. Use default values for any unspecified fields
        3. ALWAYS output dates in YYYY-MM-DD format
        4. When parsing dates:
           - Convert DD/MM/YYYY to YYYY-MM-DD (e.g., "28/04/2025" becomes "2025-04-28")
           - Convert natural language to YYYY-MM-DD
        5. For single dates, use the same date for both date_from and date_to

        EXAMPLES:
        1. Input: "analyze all logs from 28/04/2025 to 02/05/2025"
        Output: {
            "type": "filter",
            "data": {
                "date_from": "2025-04-28",
                "date_to": "2025-05-02",
                "method": "",
                "path": "",
                "status_code": -1,
                "browser": ""
            }
        }

        2. Input: "show GET requests"
        Output: {
            "type": "filter",
            "data": {
                "date_from": "2025-04-17",
                "date_to": "2025-05-02'",
                "method": "GET",
                "path": "",
                "status_code": -1,
                "browser": ""
            }
        }

        IMPORTANT: 
        - ALWAYS output dates in YYYY-MM-DD format
        - If you receive a date in DD/MM/YYYY format, convert it to YYYY-MM-DD
        - Never output dates with forward slashes (/), always use hyphens (-) 
        - Default dates should be in YYYY-MM-DD format"""

        current_app.logger.info("Sending request to Gemini AI")
        response = model.generate_content(prompt + f"\n\nUser request: {user_message}")
        current_app.logger.info(f"Received response from Gemini AI: {response.text}")
        
        # Clean up the response text - remove markdown code blocks
        response_text = response.text.strip()
        if response_text.startswith('```'):
            # Remove the first line (```json or similar)
            response_text = response_text.split('\n', 1)[1]
        if response_text.endswith('```'):
            # Remove the last line (```)
            response_text = response_text.rsplit('\n', 1)[0]
        
        # Remove any remaining markdown indicators
        response_text = response_text.strip('`')
        
        current_app.logger.info(f"Cleaned response text: {response_text}")
        
        try:
            # Try to parse as JSON
            json_response = json.loads(response_text)
            
            # Validate the response structure
            if not isinstance(json_response, dict) or 'type' not in json_response or 'data' not in json_response:
                return jsonify({
                    "type": "message",
                    "data": "I apologize, but I couldn't process that request properly. Please try rephrasing your question about log analysis."
                })

            # Replace null values with default values and ensure date format
            if json_response['type'] == 'filter' and isinstance(json_response['data'], dict):
                data = json_response['data']
                
                # Convert dates to YYYY-MM-DD format
                if 'date_from' in data:
                    data['date_from'] = convert_date_format(data['date_from'])
                if 'date_to' in data:
                    data['date_to'] = convert_date_format(data['date_to'])
                
                # Set default values if not present
                if not data.get('date_from'):
                    data['date_from'] = '2025-04-17'
                if not data.get('date_to'):
                    data['date_to'] = '2025-05-02'
                if not data.get('method'):
                    data['method'] = ''
                if not data.get('path'):
                    data['path'] = ''
                if not data.get('status_code'):
                    data['status_code'] = -1
                if not data.get('browser'):
                    data['browser'] = ''
            
            current_app.logger.info(f"Sending validated response: {json_response}")
            return jsonify(json_response)

        except json.JSONDecodeError as e:
            current_app.logger.error(f"JSON decode error: {str(e)}")
            current_app.logger.error(f"Failed to parse text: {response_text}")
            return jsonify({
                "type": "message",
                "data": "I apologize, but I couldn't process that request properly. Please try rephrasing your question about log analysis."
            })

    except Exception as e:
        current_app.logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return jsonify({
            "type": "message",
            "data": "I encountered an error processing your request. Please try again."
        }), 500

@chat_bp.route('/api/voice-chat', methods=['POST'])
def handle_voice_chat():
    try:
        current_app.logger.info("Received voice chat request")
        
        if not api_key:
            current_app.logger.error("Gemini API key not configured")
            return jsonify({"error": "Gemini API key not configured"}), 500

        if 'audio' not in request.files:
            current_app.logger.error("No audio file in request")
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['audio']
        current_app.logger.info(f"Received audio file: {audio_file.filename}, "
                              f"Content type: {audio_file.content_type}, "
                              f"Size: {audio_file.content_length} bytes")

        # Create temporary files for WebM and WAV
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_webm, \
             tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_wav:
            
            # Save the uploaded WebM file
            audio_file.save(temp_webm.name)
            current_app.logger.info(f"Saved WebM file to: {temp_webm.name}")
            
            try:
                # Optimize FFmpeg conversion with faster settings
                current_app.logger.info("Converting WebM to WAV using ffmpeg")
                result = subprocess.run([
                    'ffmpeg', 
                    '-i', temp_webm.name,
                    '-acodec', 'pcm_s16le',
                    '-ar', '16000',  # Match frontend sample rate
                    '-ac', '1',      # Mono audio
                    '-af', 'volume=1.5',  # Boost volume slightly
                    '-fflags', '+fastseek',
                    '-flags', '+low_delay',
                    '-y',  # Overwrite output file
                    temp_wav.name
                ], check=True, capture_output=True, timeout=10)  # Add timeout
                current_app.logger.info("Successfully converted to WAV")

                # Initialize speech recognizer with optimized settings
                current_app.logger.info("Initializing speech recognition")
                recognizer = sr.Recognizer()
                recognizer.energy_threshold = 300  # Lower energy threshold
                recognizer.dynamic_energy_threshold = True
                recognizer.pause_threshold = 0.5  # Shorter pause threshold

                # Load the converted WAV file and convert to text
                with sr.AudioFile(temp_wav.name) as source:
                    current_app.logger.info("Reading audio file")
                    audio_data = recognizer.record(source)
                    current_app.logger.info("Performing speech recognition")
                    text = recognizer.recognize_google(audio_data, language='en-US')
                    current_app.logger.info(f"Transcribed text: {text}")

            except subprocess.TimeoutExpired:
                current_app.logger.error("FFmpeg conversion timed out")
                return jsonify({"error": "Audio processing timed out"}), 500
            except subprocess.CalledProcessError as e:
                current_app.logger.error(f"FFmpeg error: {e.stderr.decode()}")
                return jsonify({"error": "Failed to process audio file"}), 500
            finally:
                # Clean up temporary files
                current_app.logger.info("Cleaning up temporary files")
                try:
                    os.unlink(temp_webm.name)
                    os.unlink(temp_wav.name)
                except Exception as e:
                    current_app.logger.error(f"Error cleaning up files: {e}")

        # Process the transcribed text with Gemini
        current_app.logger.info("Sending transcribed text to Gemini AI")
        prompt = """You are a log analysis assistant. Your task is to ALWAYS return a filter response for ANY log-related query.

        DEFAULT VALUES (use these when not specified in the query):
        - date_from: "2025-04-17" (matches all logs from the beginning)
        - date_to: "2025-05-02'" (matches all logs up to the future)
        - method: "" (matches any HTTP method)
        - path: "" (matches any path)
        - status_code: -1 (matches any status code)
        - browser: "" (matches any browser)

        RESPONSE FORMAT:
        ALWAYS return this format:
        {
            "type": "filter",
            "data": {
                "date_from": "YYYY-MM-DD",
                "date_to": "YYYY-MM-DD",
                "method": "",
                "path": "",
                "status_code": -1,
                "browser": ""
            }
        }

        RULES:
        1. ALWAYS return a filter response
        2. Use default values for any unspecified fields:
           - Use "" for unspecified HTTP method to match any method
           - Use "" for unspecified paths and browsers to match anything
           - Use -1 for unspecified status code to match any status
           - Use "2025-04-17" to "2025-05-02'" for unspecified date ranges
        3. Convert any date format to YYYY-MM-DD:
           - DD/MM/YYYY → YYYY-MM-DD (e.g., "28/04/2025" → "2025-04-28")
           - MM/DD/YYYY → YYYY-MM-DD
           - Natural language → YYYY-MM-DD
        4. If date format is unclear, assume DD/MM/YYYY and convert to YYYY-MM-DD
        5. For single dates, use the same date for both date_from and date_to

        EXAMPLES:
        1. Input: "analyze all logs from 28/04/2025 to 02/05/2025"
        Output: {
            "type": "filter",
            "data": {
                "date_from": "2025-04-28",
                "date_to": "2025-05-02",
                "method": "",
                "path": "",
                "status_code": -1,
                "browser": ""
            }
        }

        2. Input: "show GET requests"
        Output: {
            "type": "filter",
            "data": {
                "date_from": "2025-04-17",
                "date_to": "2025-05-02'",
                "method": "GET",
                "path": "",
                "status_code": -1,
                "browser": ""
            }
        }

        3. Input: "find errors in /api/users"
        Output: {
            "type": "filter",
            "data": {
                "date_from": "2025-04-17",
                "date_to": "2025-05-02'",
                "method": "",
                "path": "/api/users",
                "status_code": -1,
                "browser": ""
            }
        }

        IMPORTANT: 
        - NEVER return a message response
        - ALWAYS return a filter response with the complete data structure
        - Use the default values that match all possibilities for unspecified fields
        - Include ALL fields in the data object with appropriate default values
        - ALWAYS use YYYY-MM-DD format for dates
        - Convert any DD/MM/YYYY dates to YYYY-MM-DD format"""

        response = model.generate_content(prompt + f"\n\nTranscribed text: {text}")
        current_app.logger.info(f"Received response from Gemini: {response.text}")
        
        try:
            # Clean up the response text - remove markdown code blocks
            response_text = response.text.strip()
            if response_text.startswith('```'):
                # Remove the first line (```json or similar)
                response_text = response_text.split('\n', 1)[1]
            if response_text.endswith('```'):
                # Remove the last line (```)
                response_text = response_text.rsplit('\n', 1)[0]
            
            # Remove any remaining markdown indicators
            response_text = response_text.strip('`')
            
            current_app.logger.info(f"Cleaned response text: {response_text}")
            
            # Try to parse as JSON
            json_response = json.loads(response_text)
            
            # Validate the response structure
            if not isinstance(json_response, dict) or 'type' not in json_response or 'data' not in json_response:
                # If response doesn't match our expected format, convert it to a message
                return jsonify({
                    "transcribed_text": text,
                    "type": "message",
                    "data": "I apologize, but I couldn't process that request properly. Please try rephrasing your question about log analysis."
                })

            # Replace null values with default values
            if json_response['type'] == 'filter' and isinstance(json_response['data'], dict):
                data = json_response['data']
                data['method'] = data.get('method') or ""
                data['path'] = data.get('path') or ""
                data['status_code'] = data.get('status_code') or -1
                data['browser'] = data.get('browser') or ""
                data['date_from'] = data.get('date_from') or "2025-04-17"
                data['date_to'] = data.get('date_to') or "2025-05-02'"

                # Convert dates from DD/MM/YYYY to YYYY-MM-DD if needed
                if data['date_from'] and len(data['date_from']) == 10 and data['date_from'].count('/') == 2:
                    day, month, year = data['date_from'].split('/')
                    data['date_from'] = f"{year}-{month}-{day}"
                
                if data['date_to'] and len(data['date_to']) == 10 and data['date_to'].count('/') == 2:
                    day, month, year = data['date_to'].split('/')
                    data['date_to'] = f"{year}-{month}-{day}"
            
            result = {
                "transcribed_text": text,
                **json_response  # Include type and data from the response
            }
            current_app.logger.info(f"Sending final response: {result}")
            return jsonify(result)

        except json.JSONDecodeError as e:
            # Log the error and the text that failed to parse
            current_app.logger.error(f"JSON decode error: {str(e)}")
            current_app.logger.error(f"Failed to parse text: {response_text}")
            return jsonify({
                "transcribed_text": text,
                "type": "message",
                "data": "I apologize, but I couldn't process that request properly. Please try rephrasing your question about log analysis."
            })

    except sr.UnknownValueError:
        current_app.logger.error("Speech recognition could not understand audio")
        return jsonify({
            "type": "message",
            "data": "I couldn't understand the audio. Please try speaking more clearly or check your microphone."
        }), 400
    except sr.RequestError as e:
        current_app.logger.error(f"Speech recognition service error: {str(e)}")
        return jsonify({
            "type": "message",
            "data": "There was an error with the speech recognition service. Please try again later."
        }), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error in voice chat endpoint: {str(e)}", exc_info=True)
        return jsonify({
            "type": "message",
            "data": "I encountered an error processing your request. Please try again."
        }), 500 