# AI-Powered PDF Chatbot

A full-stack application that allows users to upload PDF documents, extract text, and interact with the content using Gemini AI. Users can get summaries, translations, and ask questions about the document content.

## Features

- **PDF Text Extraction**: Upload PDFs and extract text content
- **AI-Generated Summaries**: Get concise summaries of document content using Gemini AI
- **Translation**: Translate summaries into multiple languages
- **Question & Answer**: Ask specific questions about the document content
- **Text-to-Speech**: Listen to summaries and translations with built-in speech synthesis
- **User Authentication**: Register and log in to save and access your summary history
- **Cross-Platform**: Responsive design works on desktop and mobile devices

## Technologies Used

### Frontend
- React 19
- Vite
- Tailwind CSS
- FontAwesome icons
- Web Speech API for text-to-speech

### Backend
- FastAPI
- MongoDB (with PyMongo)
- Google Generative AI (Gemini 2.0 Flash)
- PDFPlumber for text extraction
- bcrypt for password hashing

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)
- MongoDB (local or Atlas)
- Google AI Studio API key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv env
   ```

3. Activate the virtual environment:
   - Windows: `env\Scripts\activate`
   - macOS/Linux: `source env/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create a `.env` file in the backend directory with the following variables:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   MONGO_URI=your_mongodb_connection_string
   ```

6. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. **Upload PDF**: Click on the "Select a PDF file" area to upload your document
2. **Generate Summary**: Click "Summarize PDF" to extract and summarize the document content
3. **Translate**: Select a language and click "Translate" to convert the summary to another language
4. **Ask Questions**: Type a question about the document in the question box and click "Get Answer"
5. **Text-to-Speech**: Use the play, pause, and stop buttons to listen to the summary or translation
6. **User Account**: Register or log in to save your summary history for future access

## API Endpoints

- `POST /upload_pdf/`: Upload a PDF file and extract text
- `POST /summarize/`: Generate a summary of the extracted text
- `POST /translate/`: Translate text to another language
- `POST /ask_question/`: Ask a question about the document content
- `POST /register/`: Create a new user account
- `POST /login/`: Authenticate a user
- `GET /user/{user_id}/summaries`: Get summary history for a specific user

## Project Structure

```
pdf_bot-app/
├── backend/
│   ├── main.py            # FastAPI server
│   ├── testai.py          # Gemini AI integration
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── App.jsx        # Main application component
│   │   └── main.jsx       # Entry point
│   ├── public/            # Static assets
│   └── package.json       # Node dependencies
└── README.md              # Project documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Open a pull request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Acknowledgments

- [Google Generative AI](https://ai.google.dev/) for providing the Gemini API
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [React](https://react.dev/) for the frontend library
- [Tailwind CSS](https://tailwindcss.com/) for styling