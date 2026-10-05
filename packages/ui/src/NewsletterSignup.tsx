import { Button, Input, Label, TextField } from '@heroui/react';
import { Emphasis } from './Emphasis';
import { SectionIndex } from './SectionHeading';

interface NewsletterSignupProps {
  label: string;
  index?: number;
  title: string;
  text: string;
  action: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitLabel: string;
  disclaimer: string;
}

export function NewsletterSignup({
  label,
  index,
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
      <div className="container-page grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-8">
        <div className="flex flex-col gap-5 lg:col-span-6">
          <SectionIndex label={label} index={index} />
          <h2 className="type-h2">
            <Emphasis text={title} />
          </h2>
          <p className="type-body measure">{text}</p>
        </div>
        <div className="flex flex-col gap-3 lg:col-span-5 lg:col-start-8">
          <form
            action={action}
            method="post"
            className="flex flex-col gap-2 rounded-full sm:flex-row sm:border sm:border-border-strong sm:bg-surface sm:p-1.5"
          >
            <TextField name="email" type="email" isRequired fullWidth className="flex-1">
              <Label className="sr-only">{emailLabel}</Label>
              <Input
                placeholder={emailPlaceholder}
                className="h-12 rounded-full px-5 text-[15px] sm:h-11 sm:border-0 sm:bg-transparent"
              />
            </TextField>
            <Button
              type="submit"
              size="lg"
              className="h-12 bg-text px-6 text-[15px] text-on-dark sm:h-11"
            >
              {submitLabel}
            </Button>
          </form>
          <p className="type-label px-5">{disclaimer}</p>
        </div>
      </div>
    </section>
  );
}
