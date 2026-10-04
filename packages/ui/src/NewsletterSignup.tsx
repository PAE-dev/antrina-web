import { Input, Label, TextField } from '@heroui/react';
import { Emphasis } from './Emphasis';

interface NewsletterSignupProps {
  eyebrow: string;
  title: string;
  text: string;
  action: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitLabel: string;
  disclaimer: string;
}

export function NewsletterSignup({
  eyebrow,
  title,
  text,
  action,
  emailLabel,
  emailPlaceholder,
  submitLabel,
  disclaimer,
}: NewsletterSignupProps) {
  return (
    <section className="section border-t border-border">
      <div className="container-page measure flex flex-col items-center gap-6 text-center">
        <p className="type-eyebrow">{eyebrow}</p>
        <h2 className="type-h2">
          <Emphasis text={title} />
        </h2>
        <p className="type-body">{text}</p>
        <form
          action={action}
          method="post"
          className="mt-4 flex w-full flex-col items-stretch gap-5 sm:flex-row sm:items-end sm:gap-8"
        >
          <TextField name="email" type="email" isRequired fullWidth className="flex-1 text-left">
            <Label className="sr-only">{emailLabel}</Label>
            <Input placeholder={emailPlaceholder} className="h-12 text-[15px]" />
          </TextField>
          <button type="submit" className="btn-secondary cursor-pointer self-center sm:self-auto">
            {submitLabel}
          </button>
        </form>
        <p className="text-[13px] text-text-muted">{disclaimer}</p>
      </div>
    </section>
  );
}
