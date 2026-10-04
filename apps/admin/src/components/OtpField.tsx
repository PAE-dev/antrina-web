import { InputOTP, Label, REGEXP_ONLY_DIGITS } from '@heroui/react';

interface OtpFieldProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  isDisabled?: boolean;
  isInvalid?: boolean;
}

/** Código de 6 dígitos de la app autenticadora. */
export function OtpField({ value, onChange, onComplete, isDisabled, isInvalid }: OtpFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="otp-code">Código de 6 dígitos</Label>
      <InputOTP
        id="otp-code"
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        value={value}
        onChange={onChange}
        autoFocus
        autoComplete="one-time-code"
        inputMode="numeric"
        isDisabled={isDisabled ?? false}
        isInvalid={isInvalid ?? false}
        {...(onComplete ? { onComplete } : {})}
      >
        <InputOTP.Group>
          <InputOTP.Slot index={0} />
          <InputOTP.Slot index={1} />
          <InputOTP.Slot index={2} />
        </InputOTP.Group>
        <InputOTP.Separator />
        <InputOTP.Group>
          <InputOTP.Slot index={3} />
          <InputOTP.Slot index={4} />
          <InputOTP.Slot index={5} />
        </InputOTP.Group>
      </InputOTP>
    </div>
  );
}
