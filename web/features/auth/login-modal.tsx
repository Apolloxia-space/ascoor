import { Button } from '@shared/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@shared/components/ui/dialog';
import { signInWithGoogle } from './use-auth-init';

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md border border-[color:var(--border-strong)] bg-[color:var(--background-popover)] px-8 py-7 shadow-[0_16px_60px_rgba(0,0,0,0.55)]"
      >
        <div className="sr-only">
          <DialogTitle>Create an account</DialogTitle>
        </div>
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">
            Create an account
          </h2>
          <Button variant="default" onClick={() => signInWithGoogle()}>
            <GoogleMark />
            <span className="ml-3 font-semibold">Continue with Google</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoogleMark() {
  return (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-white">
      <svg viewBox="0 0 533.5 544.3" className="h-5 w-5" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M533.5 278.4c0-17.4-1.6-34.1-4.7-50.4H272v95.4h146.9c-6.3 34-25.1 62.8-53.5 82v68.2h86.5c50.6-46.6 81.6-115.3 81.6-195.2z"
        />
        <path
          fill="#34A853"
          d="M272 544.3c72.6 0 133.5-24 178-65.1l-86.5-68.2c-24 16.1-54.8 25.5-91.5 25.5-70.4 0-130-47.5-151.2-111.3H31v69.9c44.7 88.5 136.6 149.2 241 149.2z"
        />
        <path
          fill="#4A90E2"
          d="M120.8 325.2c-10.3-30.6-10.3-63.5 0-94.1V161.2H31c-42.6 84.6-42.6 185 0 269.6l89.8-69.1z"
        />
        <path
          fill="#FBBC05"
          d="M272 107.7c39.5-.6 77.3 14 106.1 40.9l79.1-79.1C432.5 24.6 373 0 311 0 206.6 0 114.7 60.7 70 149.2l89.8 69.9C142 155.2 201.6 107.7 272 107.7z"
        />
      </svg>
    </span>
  );
}
