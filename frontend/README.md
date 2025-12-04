# Nexa Frontend

Modern React-based dashboard for Nexa privacy analytics engine with beautiful UI and interactive visualizations.

## Features

- **Dual-Mode Dashboard**: Normal mode (plaintext) and Privacy mode (encrypted analytics)
- **Interactive Charts**: Real-time visualization of transaction trends and fee distribution
- **Responsive Design**: Beautiful, modern UI that works on all devices
- **Live API Integration**: Connects to backend for real-time data
- **Dark Theme**: Privacy-focused dark interface with gradient accents
- **Animated Components**: Smooth transitions and engaging interactions

## Technology Stack

- **React 18**: Component-based UI framework
- **Vite**: Lightning-fast build tool
- **Recharts**: Composable charting library
- **CSS3**: Modern styling with CSS variables and animations

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── index.html           # HTML entry point (Vite)
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies
└── README.md            # This file
```

## Setup & Installation

### Prerequisites

- Node.js 18+ (LTS)
- npm or yarn

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Server runs on http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

### Running the Frontend Dev Server

```bash
npm run dev
```

The frontend will automatically proxy API requests to `http://localhost:3000` (backend).

Visit `http://localhost:5173` in your browser.

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory, ready to deploy.

## Features Overview

### Normal Mode Tab
- Real-time transaction metrics
- Shielding ratio display
- Average fee information
- Transaction timeline chart showing hourly patterns
- Fee distribution pie chart
- AI-generated network insights

### Privacy Mode Tab
- Encryption status display
- Privacy-preserving analytics summary
- ctHash details and ciphertext information
- Encrypted metrics timeline (placeholder)
- Privacy features checklist

### Features Tab
- Overview of Nexa's core capabilities
- Technology stack display
- Integration details with 3xpl, CoFHE, nilDB, nilAI

## UI Components

### Navigation
- Sticky navbar with brand and links
- Tab navigation for different views

### Cards & Metrics
- Metric cards showing key statistics
- Summary cards for AI insights
- Feature showcase cards

### Charts
- Line chart for transaction timeline
- Pie chart for fee distribution
- Responsive containers for all screen sizes

### Styling
- CSS-in-JS with CSS variables for theming
- Gradient backgrounds and text effects
- Smooth animations and transitions
- Hover effects and interactive feedback

## API Integration

The frontend connects to the backend API:

### Endpoints Used

```javascript
GET http://localhost:3000/api/aggregates
// Returns plaintext network aggregates

GET http://localhost:3000/api/privacy/aggregates
// Returns encrypted analytics ctHash

GET http://localhost:3000/api/summary
// Returns AI summary text
```

###  Data

The frontend connects to real API endpoints for all data operations, requiring a running backend server.

## Responsive Design

The UI is fully responsive:
- Desktop: Multi-column layouts with side-by-side charts
- Tablet: Adjusted grid columns and spacing
- Mobile: Single-column stacked layout

## Performance Optimizations

- Code splitting via Vite
- Lazy loading of components
- Memoization where beneficial
- Efficient re-renders with React hooks
- CSS animations GPU-accelerated

## Customization

### Theming

Edit CSS variables in `App.css` to customize colors:

```css
:root {
  --primary: #60a5fa;           /* Primary blue */
  --secondary: #34d399;         /* Secondary green */
  --bg: #0f172a;                /* Background */
  --text: #e2e8f0;              /* Text color */
  /* ...more variables */
}
```

### Chart Styling

Modify chart components in `App.jsx`:

```jsx
<LineChart data={timeSeriesData}>
  <Line stroke="#60a5fa" strokeWidth={2} />
</LineChart>
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Port 5173 already in use
```bash
npm run dev -- --port 3001
```

### Backend connection issues
- Ensure backend is running on `http://localhost:3000`
- Check browser console for CORS errors
- Verify API endpoints are implemented

### Build errors
```bash
rm -rf node_modules dist
npm install
npm run build
```

## Deployment

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Drag & drop dist/ folder to Netlify
```

### Docker
Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

## Environment Variables

Create `.env.local` for environment-specific config:

```
VITE_API_BASE=http://localhost:3000/api
VITE_ENABLE_ANALYTICS=true
```

Use in code:
```javascript
const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (when configured)

## Contributing

When adding new features:

1. Create components in `src/`
2. Add styles to `App.css` with CSS variables
3. Use responsive grid/flex layouts
4. Ensure mobile compatibility
5. Test with backend running

## License

MIT © 2025 Sambit Sargam Ekalabya

## Resources

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Recharts API](https://recharts.org)
- [Nexa Backend](../backend/README.md)
