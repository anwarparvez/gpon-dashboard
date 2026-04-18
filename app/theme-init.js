export function ThemeInit() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              const theme = localStorage.getItem('theme');
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `,
      }}
    />
  );
}