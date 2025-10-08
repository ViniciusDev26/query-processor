# Web SQL Editor

Interactive web-based SQL editor with real-time AST generation using Monaco Editor.

## Features

- ✅ **Monaco Editor**: Full-featured code editor with SQL syntax highlighting
- ✅ **Dark Theme**: Professional dark theme interface
- ✅ **Real-time Parsing**: Instant AST generation using @query-processor/converter
- ✅ **Modern UI**: Built with Tailwind CSS 4 for responsive design
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Fast Development**: Vite-powered dev server with HMR

## Tech Stack

- **React 19**: Latest React with modern hooks
- **Monaco Editor**: VSCode's editor component
- **@query-processor/converter**: SQL parser library
- **Tailwind CSS 4**: Utility-first CSS framework
- **Vite 7**: Next-generation build tool
- **TypeScript 5.9**: Type-safe development

## Getting Started

### Prerequisites

Make sure you have the converter package built:

```bash
cd ../converter
npm run build
```

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Usage

1. **Write SQL**: Type or paste your SQL query in the Monaco Editor
2. **Execute**: Click the "Execute Query" button
3. **View Results**: Check the browser console to see:
   - Original SQL query
   - Generated AST structure

## Supported SQL

The editor supports all SQL features from the @query-processor/converter package:

```sql
SELECT * FROM users
SELECT id, name FROM users
SELECT * FROM users WHERE age > 18
SELECT * FROM users WHERE age >= 18 AND status = 'active'
SELECT * FROM users WHERE age < 18 OR age > 65
SELECT * FROM users WHERE name = "John Doe"
```

## Project Structure

```
src/
├── App.tsx         # Main application component with editor
├── main.tsx        # Application entry point
└── globals.css     # Global styles and Tailwind imports
```

## Components

### App Component

The main component includes:
- Monaco Editor with SQL language support
- Dark theme configuration
- Execute button for query submission
- Console logging of parsed results

## Configuration

### Vite Config

The project uses:
- `@vitejs/plugin-react`: React support with Fast Refresh
- `@tailwindcss/vite`: Tailwind CSS integration

### TypeScript Config

Strict TypeScript configuration with:
- ES2022 target
- Bundler module resolution
- React JSX support

## Development

### Linting

```bash
npm run lint
```

### Adding Features

To extend the editor:

1. **Add UI Elements**: Modify `src/App.tsx`
2. **Style Changes**: Update Tailwind classes or `src/globals.css`
3. **New Components**: Create components in `src/components/`

## Dependencies

### Core
- `react`: ^19.1.1
- `react-dom`: ^19.1.1
- `@monaco-editor/react`: ^4.7.0
- `@query-processor/converter`: ^1.0.0
- `tailwindcss`: ^4.1.14

### Dev Dependencies
- `vite`: ^7.1.7
- `typescript`: ~5.9.3
- `@vitejs/plugin-react`: ^5.0.4
- `eslint`: ^9.36.0

## License

ISC
