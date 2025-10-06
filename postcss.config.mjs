const isTest = !!(process.env.VITEST || process.env.NODE_ENV === 'test')

// Avoid loading Tailwind/PostCSS during unit tests
const config = {
  plugins: isTest ? [] : ["@tailwindcss/postcss"],
}

export default config
