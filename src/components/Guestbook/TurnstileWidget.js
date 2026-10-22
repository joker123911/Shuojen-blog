import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const SITE_KEY = '0x4AAAAAAAFgQmCGmOt6VpB4z';

const TurnstileWidget = forwardRef(({ onVerify, onExpire }, ref) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && typeof window !== 'undefined' && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (e) {
          console.error('Turnstile reset error:', e);
        }
      }
    }
  }));

  useEffect(() => {
    let isMounted = true;

    const render = () => {
      if (typeof window === 'undefined' || !window.turnstile || !containerRef.current) return;
      if (widgetIdRef.current) return;

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => {
            if (isMounted && onVerify) onVerify(token);
          },
          'expired-callback': () => {
            if (isMounted && onExpire) onExpire();
          },
          'error-callback': () => {
            if (isMounted && onExpire) onExpire();
          },
        });
      } catch (err) {
        console.error('Turnstile render error:', err);
      }
    };

    if (typeof window !== 'undefined') {
      if (window.turnstile) {
        render();
      } else {
        const existingScript = document.getElementById('cf-turnstile-script');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'cf-turnstile-script';
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (isMounted) render();
          };
          document.head.appendChild(script);
        } else {
          const interval = setInterval(() => {
            if (window.turnstile) {
              clearInterval(interval);
              if (isMounted) render();
            }
          }, 100);
          return () => {
            isMounted = false;
            clearInterval(interval);
          };
        }
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && typeof window !== 'undefined' && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {}
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, onExpire]);

  return (
    <div style={{ margin: '10px 0', minHeight: '65px' }}>
      <div ref={containerRef} />
    </div>
  );
});

export default TurnstileWidget;
