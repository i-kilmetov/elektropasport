"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  onBack: () => void;
  panelTitle?: string;
};

type State = {
  error: Error | null;
};

export class SchemeErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("SchemeScreen crashed", error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.children !== this.props.children && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h2 className="ty-title">
          Не удалось открыть щиток
        </h2>
        <p className="max-w-md ty-body">
          {this.props.panelTitle
            ? `«${this.props.panelTitle}» вызвал ошибку при открытии схемы.`
            : "Схема щитка вызвала ошибку при открытии."}{" "}
          Можно вернуться к списку и открыть другой щиток.
        </p>
        <p className="max-w-md break-all rounded-2xl bg-zinc-100 px-3 py-2 text-left ty-meta">
          {this.state.error.message}
        </p>
        <Button
          onClick={() => {
            this.setState({ error: null });
            this.props.onBack();
          }}
        >
          К списку щитков
        </Button>
      </div>
    );
  }
}
