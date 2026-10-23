export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('lente-theme');var p=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||(t!=='light'&&(t==='system'||!t)&&p);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
