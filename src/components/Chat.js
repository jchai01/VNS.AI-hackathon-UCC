import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, MinusIcon, PlusIcon, MicrophoneIcon, PaperAirplaneIcon, StopIcon } from '@heroicons/react/24/outline';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI with better error handling
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
let model = null;
let genAI = null;

try {
  if (!GEMINI_API_KEY) {
    console.error('REACT_APP_GEMINI_API_KEY is not set in environment variables');
  } else {
    console.log('Initializing Gemini AI...');
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log('Gemini AI initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Gemini AI:', error);
}

// Define backend URL with fallback
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

const Chat = ({ onAIResponse, onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [apiKeyError, setApiKeyError] = useState(!GEMINI_API_KEY);
  const messagesEndRef = useRef(null);
  const chunks = useRef([]);
  const timerRef = useRef(null);

  // Show error message if API key is missing
  useEffect(() => {
    if (!GEMINI_API_KEY) {
      setMessages([{
        text: "Voice chat is currently unavailable. The API key is not configured. Please check the environment variables.",
        sender: 'system',
        isError: true
      }]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup effect for recording
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Add user message to chat
    const userMessage = { text: inputMessage, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('Raw response from chat API:', data);
      
      // Try to extract JSON from markdown code block if present
      let jsonData = null;
      if (data.type === 'message' && data.data.includes('```json')) {
        try {
          const jsonStr = data.data.replace(/```json\n|\n```/g, '');
          jsonData = JSON.parse(jsonStr);
          console.log('Extracted JSON from markdown:', jsonData);
          
          // Check if this is actually a filter response
          if (jsonData && (jsonData.date_from || jsonData.date_to || jsonData.method || 
              jsonData.path || jsonData.status_code || jsonData.browser)) {
            console.log('Converting message to filter response');
            data.type = 'filter';
            data.data = jsonData;
          }
        } catch (e) {
          console.error('Failed to parse JSON from markdown:', e);
        }
      }
      
      // Handle different response types
      if (data.type === 'filter') {
        console.log('Processing filter data:', data.data);
        // Add AI message showing what filters were applied
        const filterMessage = generateFilterMessage(data.data);
        setMessages(prev => [...prev, { text: filterMessage, sender: 'ai' }]);
        // Update filters in parent component
        console.log('Calling onAIResponse with filter data:', data.data);
        onAIResponse(data.data);
      } else {
        // Regular message
        console.log('Processing regular message:', data.data);
        setMessages(prev => [...prev, { text: data.data, sender: 'ai' }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { text: 'Sorry, there was an error processing your request.', sender: 'ai' }]);
    }
  };

  // Helper function to generate a readable message about applied filters
  const generateFilterMessage = (filters) => {
    const parts = [];
    
    // Define default values
    const defaults = {
      method: "",
      path: "",
      status_code: -1,
      browser: "",
      date_from: "2025-04-17",
      date_to: "2025-05-02"
    };

    // Format dates for display
    const formatDateForDisplay = (dateStr) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB'); // Use DD/MM/YYYY for display
      } catch (error) {
        return dateStr;
      }
    };

    // Only add date range if it's not the default range
    if ((filters.date_from && filters.date_from !== defaults.date_from) || 
        (filters.date_to && filters.date_to !== defaults.date_to)) {
      parts.push(`date range from ${formatDateForDisplay(filters.date_from)} to ${formatDateForDisplay(filters.date_to)}`);
    }

    // Only add method if it's not the default (empty string)
    if (filters.method && filters.method !== defaults.method) {
      parts.push(`HTTP method ${filters.method}`);
    }

    // Only add path if it's not the default (empty string)
    if (filters.path && filters.path !== defaults.path) {
      // Check if path is an IP address
      if (filters.path.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
        parts.push(`IP address ${filters.path}`);
      } else {
        parts.push(`path containing "${filters.path}"`);
      }
    }

    // Only add status code if it's not the default (-1)
    if (filters.status_code && filters.status_code !== defaults.status_code) {
      parts.push(`status code ${filters.status_code}`);
    }

    // Only add browser if it's not the default (empty string)
    if (filters.browser && filters.browser !== defaults.browser) {
      parts.push(`browser ${filters.browser}`);
    }

    if (parts.length === 0) {
      // No specific filters were provided, set default date range
      const defaultDateFrom = "17/04/2025";
      const defaultDateTo = "02/05/2025";
      
      // Update filters with default dates
      if (typeof onFilterChange === 'function') {
        setTimeout(() => {
          onFilterChange({
            date_from: defaultDateFrom,
            date_to: defaultDateTo,
            // Force exact date format to prevent conversion issues
            _exact_format: true
          });
        }, 100);
      }
      
      return `I'll show you logs from ${defaultDateFrom} to ${defaultDateTo} since no specific filters were provided.`;
    }

    return `I've applied the following filters: ${parts.join(', ')}.`;
  };

  // Function to convert audio blob to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startRecording = async () => {
    try {
      console.log('Starting voice recording...');
      chunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          volume: 1
        }
      });
      console.log('Audio stream obtained with settings:', {
        channelCount: 1,
        sampleRate: 16000,
        sampleSize: 16
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      console.log('MediaRecorder initialized with mime type:', recorder.mimeType);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
          console.log('Received audio chunk of size:', e.data.size, 'bytes');
        }
      };
      
      recorder.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        setIsProcessing(true);
        const processingMessage = {
          text: "Converting speech to text...",
          sender: 'system',
          isProcessing: true
        };
        setMessages(prev => [...prev, processingMessage]);

        try {
          // Create audio blob and URL for playback
          const audioBlob = new Blob(chunks.current, { type: 'audio/webm' });
          console.log('Created audio blob:', {
            size: audioBlob.size,
            type: audioBlob.type,
            chunks: chunks.current.length
          });
          
          const audioUrl = URL.createObjectURL(audioBlob);
          console.log('Created audio URL for playback');
          
          // Add voice message to chat
          setMessages(prev => prev.map(msg => 
            msg.isProcessing ? {
              text: 'Voice message',
              sender: 'user',
              audioUrl: audioUrl
            } : msg
          ));

          // Send audio to backend for transcription
          console.log('Sending audio to backend for transcription...');
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const transcriptionResponse = await fetch(`${BACKEND_URL}/api/voice-chat`, {
            method: 'POST',
            body: formData
          });

          if (!transcriptionResponse.ok) {
            throw new Error(`Backend transcription failed: ${transcriptionResponse.status}`);
          }

          const transcriptionResult = await transcriptionResponse.json();
          console.log('Received transcription result:', transcriptionResult);

          if (transcriptionResult.error) {
            throw new Error(`Transcription error: ${transcriptionResult.error}`);
          }

          // Handle the transcription result using our handler function
          handleTranscriptionResult(transcriptionResult);

        } catch (error) {
          console.error('Error in voice processing pipeline:', error);
          setMessages(prev => prev.map(msg => 
            msg.isProcessing ? {
              text: `Error: ${error.message}`,
              sender: 'ai'
            } : msg
          ));
        } finally {
          setIsProcessing(false);
          console.log('Voice processing completed');
        }
      };
      
      setMediaRecorder(recorder);
      recorder.start(1000); // Record in 1-second chunks
      console.log('Started recording in 1-second chunks');
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error initializing voice recording:', error);
      setMessages(prev => [...prev, { 
        text: 'Sorry, there was an error accessing your microphone.',
        sender: 'ai'
      }]);
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording...');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      
      // Stop duration timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Stop all audio tracks
      mediaRecorder.stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped audio track:', track.kind, track.label);
      });
    }
  };

  const AudioMessage = ({ url }) => (
    <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
      <audio src={url} controls className="h-8" />
    </div>
  );

  // Handle transcription result
  const handleTranscriptionResult = (result) => {
    console.log('Received transcription result:', result);
    
    // Add the transcribed text as a user message first
    if (result.transcribed_text) {
      setMessages(prevMessages => [...prevMessages, { 
        text: result.transcribed_text,
        sender: 'user'
      }]);
    }
    
    // Then check if it's a filter response
    if (result.type === 'filter' && result.data) {
      console.log('Processing filter from transcription:', result.data);
      // Call onAIResponse with the filter data
      onAIResponse(result.data);
      
      // Generate and add the filter message
      const filterMessage = generateFilterMessage(result.data);
      setMessages(prevMessages => [...prevMessages, {
        text: filterMessage,
        sender: 'ai'
      }]);
    } else {
      console.log('Response is not a filter object');
      // Add the response as a regular AI message
      if (result.data) {
        setMessages(prevMessages => [...prevMessages, {
          text: result.data,
          sender: 'ai'
        }]);
      }
    }
    setIsProcessing(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl z-[9999]">
      {/* Chat Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">AI Assistant</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isMinimized ? (
              <PlusIcon className="h-5 w-5" />
            ) : (
              <MinusIcon className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      {!isMinimized && (
        <>
          <div className="p-4 h-96 overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  message.sender === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary-600 text-white'
                      : message.sender === 'system'
                      ? message.isError
                        ? 'bg-red-100 text-red-800'
                        : message.isProcessing
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-200 text-gray-700 italic'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-800"></div>
                      <span>{message.text}</span>
                    </div>
                  ) : message.audioUrl ? (
                    <AudioMessage url={message.audioUrl} />
                  ) : (
                    message.text
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="border-t p-4">
            <div className="flex space-x-2">
              {isRecording ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse text-red-500">
                    {formatDuration(recordingDuration)}
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    disabled={isProcessing}
                    className="flex-shrink-0 text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    <StopIcon className="h-6 w-6" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isProcessing || apiKeyError}
                  className="flex-shrink-0 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  title={apiKeyError ? "Voice chat unavailable - API key not configured" : "Start recording"}
                >
                  <MicrophoneIcon className="h-6 w-6" />
                </button>
              )}
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isProcessing ? "Processing voice message..." : "Type your message..."}
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500"
                disabled={isRecording || isProcessing}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isRecording || isProcessing}
                className="flex-shrink-0 text-primary-600 hover:text-primary-700 disabled:text-gray-400"
              >
                <PaperAirplaneIcon className="h-6 w-6" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default Chat; 
