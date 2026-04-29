import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="min-h-screen w-full bg-[#0A0A0B] flex flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <h1 className="serif text-5xl text-[#FAFAF8] mb-3">Vault.</h1>
        <p className="text-[#A09A8D] text-base max-w-sm mx-auto">
          Sign in to see what you&apos;re paying for. And kill what you&apos;re not using.
        </p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-sm',
            card: 'bg-[#14130F] border border-[rgba(255,255,255,0.08)] shadow-none',
            headerTitle: 'serif text-[#FAFAF8]',
            headerSubtitle: 'text-[#A09A8D]',
            socialButtonsBlockButton:
              'bg-[#1A1918] border-[rgba(255,255,255,0.08)] text-[#FAFAF8] hover:bg-[rgba(255,255,255,0.04)]',
            formButtonPrimary:
              'bg-[#D4A853] text-[#0A0A0B] hover:bg-[#B8902C] font-semibold',
            footerAction: 'text-[#A09A8D]',
            footerActionLink: 'text-[#D4A853] hover:text-[#B8902C]',
          },
        }}
      />
    </main>
  );
}
