export function NavyToWhiteTransition() {
  return (
    <div
      aria-hidden
      style={{ background: "linear-gradient(to bottom, #07122a, #ffffff)", height: "80px" }}
    />
  );
}

export function WhiteToNavyTransition() {
  return (
    <div
      aria-hidden
      style={{ background: "linear-gradient(to bottom, #ffffff, #07122a)", height: "80px" }}
    />
  );
}
