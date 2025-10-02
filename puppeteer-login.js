// puppeteer-login.js
// Usage:
// 1) (recommended) set env vars then run:
//    EMAIL=you@example.com PASSWORD=yourpass node puppeteer-login.js
// 2) or edit EMAIL/PASSWORD below (not recommended for security)

const puppeteer = require('puppeteer');

(async () => {
  // ======= عدّل القيم دي لو حبيت (أو استخدم متغيرات بيئة) =======
  const START_URL = 'https://pos-nova.infinityfree.me/';
  const LOGIN_API = 'https://pos-nova.infinityfree.me/api/login';
  const EMAIL = process.env.EMAIL || 'omar@gmail.com';
  const PASSWORD = process.env.PASSWORD || '12345678';
  // =============================================================

  const browser = await puppeteer.launch({
    headless: true, // لو اتكشف موقعك كـ headless جرب false
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
    await page.setUserAgent(UA);

    console.log('Opening start page to trigger JS challenge...');
    await page.goto(START_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // انتظار توليد كوكي __test أو XSRF-TOKEN
    await page.waitForFunction(() => document.cookie.length > 0, { timeout: 10000 }).catch(() => null);

    // اقرأ كل الكوكيز
    let cookies = await page.cookies();
    console.log('All cookies after challenge:', cookies.map(c => `${c.name}=${c.value}`).join('; '));

    // اقرا XSRF-TOKEN (عادة موجود كـ cookie)
    const xsrfCookie = cookies.find(c => c.name === 'XSRF-TOKEN');
    const xsrfToken = xsrfCookie ? decodeURIComponent(xsrfCookie.value) : null;
    console.log('Extracted XSRF-TOKEN:', xsrfToken ? '[found]' : '[not found]');

    // نفّذ الـ POST داخل المتصفح لكي يُرفَع السياق (send cookies automatically)
    console.log('Sending login request inside browser context...');
    const result = await page.evaluate(async (LOGIN_API, EMAIL, PASSWORD, xsrfToken) => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        };
        // Laravel commonly expects X-XSRF-TOKEN header
        if (xsrfToken) headers['X-XSRF-TOKEN'] = xsrfToken;

        const resp = await fetch(LOGIN_API, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        const text = await resp.text();
        // حاول تحويل JSON إن أمكن
        let parsed = null;
        try { parsed = JSON.parse(text); } catch(e) {}
        return { status: resp.status, bodyText: text.slice(0, 5000), bodyJson: parsed };
      } catch (e) {
        return { error: e.message || String(e) };
      }
    }, LOGIN_API, EMAIL, PASSWORD, xsrfToken);

    console.log('Login (inside browser) result status:', result.status);
    if (result.error) {
      console.error('Login error:', result.error);
    } else {
      if (result.bodyJson) {
        console.log('Response JSON:', result.bodyJson);
      } else {
        console.log('Response text (truncated):', result.bodyText);
      }
    }

    // اطلع الكوكيز بعد محاولة الدخول (لو في جلسة ناجحة، هتتغير)
    cookies = await page.cookies();
    console.log('Cookies after login attempt:', cookies);

    // جهّز cookie header تستخدمه لاحقًا مع axios إذا حبيت
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log('Cookie header you can reuse with axios:', cookieHeader);

    await browser.close();
    console.log('Done.');
  } catch (err) {
    console.error('Fatal error:', err);
    try { await browser.close(); } catch (_) {}
    process.exit(1);
  }
})();
