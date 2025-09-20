# NEURONS Protocol Landing Page

A modern, responsive landing page for NEURONS Protocol built with Vite + React and optimized for Vercel deployment.

## 🚀 Features

- **Modern React Architecture**: Built with React 18 and Vite for optimal performance
- **Responsive Design**: Mobile-first approach with comprehensive breakpoints
- **Smooth Animations**: Powered by Framer Motion for engaging user experience
- **ThinkinCoin Branding**: Custom green color scheme and professional styling
- **Glass Morphism Effects**: Modern UI design with backdrop blur effects
- **SEO Optimized**: Meta tags and semantic HTML structure
- **Vercel Ready**: Optimized build configuration for seamless deployment

## 🛠 Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 4.4.5
- **Animations**: Framer Motion 10.16.4
- **Icons**: Lucide React 0.263.1
- **Styling**: CSS Modules with CSS Variables
- **Deployment**: Vercel

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗 Project Structure

```
src/
├── components/           # React components
│   ├── Header.jsx       # Navigation with mobile menu
│   ├── Hero.jsx         # Hero section with animations
│   ├── HowItWorks.jsx   # Process explanation
│   ├── Features.jsx     # Core features showcase
│   ├── Tokenomics.jsx   # Token distribution & stats
│   ├── FAQ.jsx          # Frequently asked questions
│   ├── Documentation.jsx # Technical docs & resources
│   └── Footer.jsx       # Site footer
├── App.jsx              # Main application component
├── main.jsx             # React entry point
└── index.css            # Global styles & CSS variables
```

## 🎨 Design System

### Color Palette (ThinkinCoin Green Theme)
- **Primary**: #52b788 (Medium green)
- **Secondary**: #2d5a3d (Dark green)
- **Accent**: #95d5b2 (Light green)
- **Background**: #1b4332 (Very dark green)
- **Text Primary**: #f8f9fa (Light)
- **Text Secondary**: rgba(255, 255, 255, 0.8)

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Headings**: 800 weight with gradient text effects
- **Body**: 400-600 weight for optimal readability

### Responsive Breakpoints
- **Mobile**: < 480px
- **Tablet**: 481px - 768px
- **Desktop**: 769px - 1024px
- **Large Desktop**: > 1024px

## 📱 Component Overview

### Header
- Responsive navigation with mobile hamburger menu
- Smooth scroll behavior to sections
- Glass morphism background effect
- ThinkinCoin logo with gradient styling

### Hero
- Animated headline with gradient text
- Call-to-action buttons with hover effects
- Technology stack badges
- Floating animations for visual interest

### How It Works
- Four-step process explanation
- Interactive cards with hover effects
- Progressive animation timing
- Icon-based visual hierarchy

### Features
- Six core feature highlights
- Grid layout with responsive columns
- Glass morphism card design
- Lucide React icons for consistency

### Tokenomics
- Token statistics with animated counters
- Distribution chart with progress bars
- Two-column layout (stats + chart)
- Color-coded distribution visualization

### FAQ
- Accordion-style expandable questions
- Smooth expand/collapse animations
- Eight comprehensive Q&A pairs
- Mobile-optimized touch targets

### Documentation
- Technical documentation links
- Developer resource cards
- External link indicators
- Organized content hierarchy

### Footer
- Multi-column link organization
- Social media integration
- Brand reinforcement
- Legal link structure

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Configure Build**: Vercel automatically detects Vite configuration
3. **Deploy**: Automatic deployment on every push to main branch

### Manual Deployment

```bash
# Build the project
npm run build

# Upload the 'dist' folder to your hosting provider
```

## 🔧 Configuration

### Vite Configuration
- Optimized chunk splitting for better caching
- Vendor dependencies separated for faster loading
- Production build optimization

### Environment Variables
- No environment variables required for basic deployment
- Extend as needed for analytics, APIs, etc.

## 📈 Performance Optimizations

- **Code Splitting**: Vendor and motion libraries separated
- **Image Optimization**: Vector icons for scalability
- **CSS Optimization**: CSS variables and efficient selectors
- **Bundle Size**: Optimized dependencies and tree shaking
- **Loading Performance**: Lazy loading and progressive enhancement

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the NEURONS Protocol ecosystem. All rights reserved.

## 🔗 Links

- **NEURONS Protocol**: [Documentation](../docs/en/)
- **ThinkinCoin**: Official website
- **GitHub**: Repository and source code
- **Vercel**: Live deployment

---

Built with ❤️ for the NEURONS Protocol community