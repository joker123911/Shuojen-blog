import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const SITE_KEY = '0x4AAAAAAFgQmCGmOt6VpB4z';

const TurnstileWidget = forwardRef(({ onVerify, onExpire }, ref) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
  }, [onVerify, onExpire]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current !== null && typeof window !== 'undefined' && window.turnstile) {
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
      if (widgetIdRef.current !== null) return;

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => {
            if (isMounted && onVerifyRef.current) onVerifyRef.current(token);
          },
          'expired-callback': () => {
            if (isMounted && onExpireRef.current) onExpireRef.current();
          },
          'error-callback': () => {
            if (isMounted && onExpireRef.current) onExpireRef.current();
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
      if (widgetIdRef.current !== null && typeof window !== 'undefined' && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {}
        widgetIdRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ margin: '10px 0', minHeight: '65px' }}>
      <div ref={containerRef} />
    </div>
  );
});

export default TurnstileWidget;
