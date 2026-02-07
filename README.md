# Miva LMS Study Helper 📚

A browser extension built with Plasmo that helps students track their learning progress on Miva University's LMS platform.

## Features

🎯 **Progress Tracking**: Automatically tracks which course activities you've visited  
✅ **Visual Indicators**: Adds checkmarks to completed activities in course navigation  
📊 **Progress Dashboard**: View your overall progress across all courses in the popup  
💾 **Local Storage**: All data is stored locally in your browser for privacy  

## Installation

### Development Setup

1. **Clone or download this project**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start development server**:
   ```bash
   npm run dev
   ```
4. **Load in browser**:
   - Open Chrome/Edge and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `build/chrome-mv3-dev` folder

### Production Build

1. **Build the extension**:
   ```bash
   npm run build
   ```
2. **Package for distribution**:
   ```bash
   npm run package
   ```

## Usage

1. **Install the extension** in your browser
2. **Visit Miva LMS** at `https://lms.miva.university`
3. **Navigate through course activities** - the extension will automatically track your progress
4. **View your progress** by clicking the extension icon in your browser toolbar
5. **See visual indicators** - completed activities will show green checkmarks in course navigation

## How It Works

### Automatic Tracking
- The extension detects when you visit course activities (videos, PDFs, quizzes, etc.)
- It extracts course and activity information from the page URL and content
- Progress is automatically saved to local browser storage

### Visual Feedback
- Green checkmarks (✅) appear next to completed activities
- Hover over checkmarks to see completion dates
- Progress bars show overall course completion percentage

### Data Storage
- All progress data is stored locally in your browser
- No data is sent to external servers
- You can clear all progress data from the popup if needed

## Privacy

- **Local Storage Only**: All your progress data stays on your device
- **No External Tracking**: The extension doesn't send data to any external servers
- **Miva LMS Only**: The extension only works on `lms.miva.university` domain

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Microsoft Edge 88+
- ✅ Firefox (with manifest v2 adaptation)
- ✅ Safari (with some limitations)

## Development

Built with:
- [Plasmo Framework](https://www.plasmo.com/) - Modern browser extension framework
- React + TypeScript
- Chrome Extension APIs

### Project Structure

```
miva-lms-helper/
├── contents/
│   └── progress-tracker.tsx    # Main content script
├── popup.tsx                   # Extension popup interface
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on Miva LMS
5. Submit a pull request

## Troubleshooting

**Extension not working?**
- Make sure you're on `lms.miva.university`
- Check that the extension is enabled in your browser
- Try refreshing the page

**Progress not saving?**
- Check browser storage permissions
- Ensure you're logged into Miva LMS
- Try clearing and re-adding the extension

**Visual indicators not showing?**
- Course navigation structure may have changed
- Try visiting the course main page first
- Check browser console for any errors

## License

MIT License - feel free to modify and distribute!
