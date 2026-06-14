export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="sr-only">Social: Alcance total, sentimiento de marca, menciones y keywords trending.</p>
      {children}
    </>
  );
}
