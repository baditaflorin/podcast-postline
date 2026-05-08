import { Component, ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    return;
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-stone-950 px-6 text-stone-50">
          <section className="max-w-md rounded-lg border border-white/15 p-6">
            <h1 className="text-2xl font-black">podcast-postline</h1>
            <p className="mt-3 text-stone-300">
              The app hit an unrecoverable UI error. Refresh and try again.
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
