import { useRef, useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { z } from 'zod';
import { cn } from '../lib/cn';

const schema = z.object({
  name: z.string().min(2, 'Укажите имя').max(60, 'Имя слишком длинное'),
  phone: z.string().min(10, 'Укажите телефон').max(25, 'Слишком длинный номер'),
  email: z.string().email('Неверный email').optional().or(z.literal('')),
  message: z.string().min(10, 'Сообщение минимум 10 символов').max(1000),
});

type FormState = 'idle' | 'submitting' | 'success' | 'error';
type FieldErrors = Partial<Record<keyof z.infer<typeof schema>, string>>;

const HCAPTCHA_SITE_KEY = import.meta.env.PUBLIC_HCAPTCHA_SITE_KEY || '';
const ENDPOINT = import.meta.env.PUBLIC_CONTACT_ENDPOINT || '/api/contact.php';

export default function ContactForm() {
  const [state, setState] = useState<FormState>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverMessage, setServerMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [needsCaptcha, setNeedsCaptcha] = useState(false);
  const captchaRef = useRef<HCaptcha>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setServerMessage('');

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Honeypot
    if (formData.get('website')) {
      setServerMessage('Ошибка отправки.');
      setState('error');
      return;
    }

    const raw = {
      name: String(formData.get('name') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      message: String(formData.get('message') ?? '').trim(),
    };

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!fieldErrs[key]) fieldErrs[key] = issue.message;
      }
      setErrors(fieldErrs);
      return;
    }

    if (needsCaptcha && !captchaToken) {
      setServerMessage('Пожалуйста, пройдите проверку безопасности.');
      return;
    }

    setState('submitting');

    try {
      const body = new URLSearchParams();
      Object.entries(parsed.data).forEach(([k, v]) => body.append(k, v ?? ''));
      if (captchaToken) body.append('hcaptcha-token', captchaToken);

      const res = await fetch(ENDPOINT, {
        method: 'POST',
        body,
        headers: { 'Accept': 'application/json' },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.needsCaptcha) {
          setNeedsCaptcha(true);
          setServerMessage('Пройдите проверку безопасности и отправьте форму повторно.');
        } else {
          setServerMessage(data?.message ?? 'Не удалось отправить. Попробуйте позже.');
        }
        setState('error');
        return;
      }

      setState('success');
      setServerMessage(data?.message ?? 'Спасибо! Мы свяжемся с вами в ближайшее время.');
      form.reset();
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
    } catch {
      setState('error');
      setServerMessage('Сетевая ошибка. Проверьте соединение и попробуйте снова.');
    }
  };

  const inputClass = (hasError?: boolean) =>
    cn(
      'w-full bg-transparent border-b px-0 py-3.5 text-base text-ink-900 placeholder-ink-400',
      'transition-all duration-300 outline-none',
      'focus:border-brand-700',
      hasError ? 'border-brand-500' : 'border-ink-900/20',
    );

  const labelClass = 'block text-xs uppercase tracking-[0.16em] text-ink-500 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-7" noValidate>
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] opacity-0 pointer-events-none"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>Имя *</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Ваше имя"
            className={inputClass(!!errors.name)}
          />
          {errors.name && <p className="mt-1.5 text-xs text-brand-500">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>Телефон *</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+996 ___ ___ ___"
            className={inputClass(!!errors.phone)}
          />
          {errors.phone && <p className="mt-1.5 text-xs text-brand-500">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          className={inputClass(!!errors.email)}
        />
        {errors.email && <p className="mt-1.5 text-xs text-brand-500">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>Сообщение *</label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          placeholder="Расскажите, чем мы можем помочь…"
          className={cn(inputClass(!!errors.message), 'resize-y min-h-[120px]')}
        />
        {errors.message && <p className="mt-1.5 text-xs text-brand-500">{errors.message}</p>}
      </div>

      {needsCaptcha && HCAPTCHA_SITE_KEY && (
        <div>
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
            theme="light"
          />
        </div>
      )}

      <div className="flex flex-col-reverse gap-4 pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-ink-500 leading-relaxed max-w-sm">
          Отправляя форму, вы соглашаетесь с обработкой персональных данных для обратной связи.
        </p>
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="btn btn-primary self-start disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {state === 'submitting' ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Отправка…
            </>
          ) : (
            <>
              Отправить сообщение
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </>
          )}
        </button>
      </div>

      {serverMessage && (
        <div
          role="alert"
          className={cn(
            'rounded-2xl border p-4 text-sm',
            state === 'success'
              ? 'border-sage-500/30 bg-sage-500/5 text-sage-600'
              : 'border-brand-500/30 bg-brand-50 text-brand-700',
          )}
        >
          {serverMessage}
        </div>
      )}
    </form>
  );
}
